import {onCall, HttpsError} from "firebase-functions/v2/https";
import * as admin from "firebase-admin";

const db = admin.firestore();

// Topic signal mapping for preference inference
const TOPIC_SIGNALS: Record<string, Record<string, string[]>> = {
  sports: {
    twitterFollows: ["espn", "nba", "nfl", "mlb", "sportscenter"],
    redditSubs: ["r/sports", "r/nba", "r/nfl", "r/soccer", "r/baseball"],
    youtubeChannels: ["ESPN", "NBA", "NFL", "Bleacher Report"],
  },
  tech: {
    twitterFollows: ["mkbhd", "verge", "techcrunch", "elonmusk", "naval"],
    redditSubs: ["r/technology", "r/programming", "r/apple", "r/android"],
    youtubeChannels: ["MKBHD", "Linus Tech Tips", "Veritasium"],
  },
  entertainment: {
    twitterFollows: ["netflix", "disney", "marvel", "starwars"],
    redditSubs: ["r/movies", "r/television", "r/netflix", "r/marvel"],
    youtubeChannels: ["Netflix", "Disney", "Warner Bros"],
  },
  politics: {
    twitterFollows: ["potus", "whitehouse", "nytpolitics", "politico"],
    redditSubs: ["r/politics", "r/news", "r/worldnews"],
    youtubeChannels: ["CNN", "Fox News", "MSNBC"],
  },
  gaming: {
    twitterFollows: ["ign", "gamespot", "xbox", "playstation", "nintendo"],
    redditSubs: ["r/gaming", "r/games", "r/pcgaming", "r/ps5", "r/xbox"],
    youtubeChannels: ["IGN", "GameSpot", "PewDiePie"],
  },
};

function matchSignalsToTopics(
  signals: Record<string, unknown>,
  provider: string
): Array<{category: string; confidence: number}> {
  const matched: Array<{category: string; confidence: number}> = [];

  for (const [category, categorySignals] of Object.entries(TOPIC_SIGNALS)) {
    let confidence = 0;

    if (provider === "twitter") {
      const follows = (signals.following || []) as string[];
      const targetFollows = categorySignals.twitterFollows || [];
      const matchCount = follows.filter((f) => targetFollows.includes(f)).length;
      if (matchCount > 0) {
        confidence = Math.min(matchCount / targetFollows.length, 1.0);
      }
    } else if (provider === "reddit") {
      const subs = (signals.subreddits || []) as string[];
      const targetSubs = categorySignals.redditSubs || [];
      const matchCount = subs.filter((s) => targetSubs.includes(s)).length;
      if (matchCount > 0) {
        confidence = Math.min(matchCount / targetSubs.length, 1.0);
      }
    } else if (provider === "youtube") {
      const channels = (signals.subscriptions || []) as string[];
      const targetChannels = categorySignals.youtubeChannels || [];
      const matchCount = channels.filter((c) => targetChannels.includes(c)).length;
      if (matchCount > 0) {
        confidence = Math.min(matchCount / targetChannels.length, 1.0);
      }
    }

    if (confidence > 0.3) {
      matched.push({category, confidence});
    }
  }

  return matched;
}

export const getSuggestedPreferences = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Must be logged in");
  }

  const uid = request.auth.uid;

  // Get user's social accounts
  const accountsSnap = await db
    .collection("users")
    .doc(uid)
    .collection("socialAccounts")
    .get();

  if (accountsSnap.empty) {
    return [];
  }

  // Aggregate signals from all accounts
  const categoryScores: Record<string, number> = {};

  for (const accountDoc of accountsSnap.docs) {
    const accountData = accountDoc.data();
    if (accountData.profileData?.signals) {
      const matches = matchSignalsToTopics(
        accountData.profileData.signals as Record<string, unknown>,
        accountDoc.id
      );
      for (const {category, confidence} of matches) {
        if (category in categoryScores) {
          categoryScores[category] = (categoryScores[category] + confidence) / 2;
        } else {
          categoryScores[category] = confidence;
        }
      }
    }
  }

  // Get existing preferences
  const prefsSnap = await db
    .collection("users")
    .doc(uid)
    .collection("preferences")
    .get();
  const existingTopicIds = new Set(prefsSnap.docs.map((d) => d.id));

  // Get topics matching categories and suggest preferences
  const suggested: Array<{
    topicId: string;
    stance: string;
    source: string;
    confidence: number;
  }> = [];

  for (const [category, score] of Object.entries(categoryScores)) {
    const topicsSnap = await db
      .collection("topics")
      .where("category", "==", category)
      .where("isActive", "==", true)
      .get();

    for (const topicDoc of topicsSnap.docs) {
      if (!existingTopicIds.has(topicDoc.id)) {
        suggested.push({
          topicId: topicDoc.id,
          stance: score > 0.7 ? "love" : "neutral",
          source: "inferred",
          confidence: score,
        });
      }
    }
  }

  return suggested;
});
