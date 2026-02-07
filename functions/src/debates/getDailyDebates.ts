import {onCall, HttpsError} from "firebase-functions/v2/https";
import * as admin from "firebase-admin";

const db = admin.firestore();

const DEBATES_PER_DAY = 5;
const MAX_PER_CATEGORY = 2;

interface UserPreference {
  stance: string;
  confidence: number;
  topicId: string;
}

interface DebateDoc {
  id: string;
  topicId: string;
  title: string;
  description: string | null;
  createdAt: admin.firestore.Timestamp;
  expiresAt: admin.firestore.Timestamp;
  isActive: boolean;
  participantCount: number;
  topicName: string;
  topicSlug: string;
  topicCategory: string | null;
  postCount?: number;
  stanceCount?: number;
}

function calculateEngagementScore(
  debate: DebateDoc,
  userPrefs: UserPreference[]
): number {
  let score = 0.0;

  const topicPref = userPrefs.find((p) => p.topicId === debate.topicId);
  if (topicPref) {
    if (topicPref.stance === "love" || topicPref.stance === "hate") {
      score += topicPref.confidence * 2.0;
    } else {
      score += topicPref.confidence * 0.5;
    }
  }

  // Prefer debates with some activity
  const postCount = debate.postCount || 0;
  if (postCount >= 3 && postCount <= 20) {
    score += 1.0;
  } else if (postCount < 3) {
    score += 0.5;
  }

  // Multiple viewpoints bonus
  if ((debate.stanceCount || 0) > 1) {
    score += 1.0;
  }

  // Recency bonus
  const ageMs = Date.now() - debate.createdAt.toMillis();
  const ageHours = ageMs / (1000 * 60 * 60);
  if (ageHours < 6) {
    score += 0.5;
  }

  return score;
}

function selectDiverse(
  scoredDebates: Array<{debate: DebateDoc; score: number}>,
  count: number,
  maxPerCategory: number
): DebateDoc[] {
  scoredDebates.sort((a, b) => b.score - a.score);

  const selected: DebateDoc[] = [];
  const categoryCounts: Record<string, number> = {};

  for (const {debate} of scoredDebates) {
    if (selected.length >= count) break;

    const category = debate.topicCategory || "uncategorized";
    const currentCount = categoryCounts[category] || 0;

    if (currentCount < maxPerCategory) {
      selected.push(debate);
      categoryCounts[category] = currentCount + 1;
    }
  }

  return selected;
}

function serializeDebate(debate: DebateDoc) {
  return {
    ...debate,
    createdAt: debate.createdAt.toDate().toISOString(),
    expiresAt: debate.expiresAt.toDate().toISOString(),
  };
}

export const getDailyDebates = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Must be logged in");
  }

  const uid = request.auth.uid;
  const now = admin.firestore.Timestamp.now();

  // Get user's preferences
  const prefsSnap = await db
    .collection("users")
    .doc(uid)
    .collection("preferences")
    .get();

  const userPrefs: UserPreference[] = prefsSnap.docs.map((doc) => ({
    topicId: doc.id,
    stance: doc.data().stance,
    confidence: doc.data().confidence || 1.0,
  }));

  // Get user's debate history (already shown debates)
  const historySnap = await db
    .collection("users")
    .doc(uid)
    .collection("debateHistory")
    .get();
  const seenDebateIds = new Set(historySnap.docs.map((doc) => doc.id));

  // Get active debates
  const debatesSnap = await db
    .collection("debates")
    .where("isActive", "==", true)
    .where("expiresAt", ">", now)
    .orderBy("expiresAt")
    .get();

  const allDebates: DebateDoc[] = debatesSnap.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as DebateDoc[];

  if (userPrefs.length === 0) {
    // No preferences - show most popular unseen, then any popular
    const unseen = allDebates.filter((d) => !seenDebateIds.has(d.id));
    const toShow = unseen.length > 0 ? unseen : allDebates;

    toShow.sort((a, b) => b.participantCount - a.participantCount);
    const selected = toShow.slice(0, DEBATES_PER_DAY);

    // Mark as shown
    const batch = db.batch();
    for (const debate of selected) {
      const histRef = db
        .collection("users")
        .doc(uid)
        .collection("debateHistory")
        .doc(debate.id);
      batch.set(histRef, {participated: false, shownAt: now});
    }
    await batch.commit();

    return selected.map(serializeDebate);
  }

  // Get topics with strong opinions
  const strongTopicIds = userPrefs
    .filter(
      (p) =>
        (p.stance === "love" || p.stance === "hate") && p.confidence > 0.7
    )
    .map((p) => p.topicId);

  const relevantTopicIds =
    strongTopicIds.length > 0
      ? strongTopicIds
      : userPrefs.map((p) => p.topicId);

  // Filter to relevant, unseen debates
  let candidates = allDebates.filter(
    (d) => relevantTopicIds.includes(d.topicId) && !seenDebateIds.has(d.id)
  );

  if (candidates.length === 0) {
    // Fallback to all active debates by popularity
    const fallback = [...allDebates];
    fallback.sort((a, b) => b.participantCount - a.participantCount);
    const fallbackSelected = fallback.slice(0, DEBATES_PER_DAY);

    // Mark as shown so they aren't repeatedly recommended
    const fallbackBatch = db.batch();
    for (const debate of fallbackSelected) {
      const histRef = db
        .collection("users")
        .doc(uid)
        .collection("debateHistory")
        .doc(debate.id);
      fallbackBatch.set(histRef, {participated: false, shownAt: now});
    }
    await fallbackBatch.commit();

    return fallbackSelected.map(serializeDebate);
  }

  // Get post stats for scoring
  for (const debate of candidates) {
    const postsSnap = await db
      .collection("posts")
      .where("debateId", "==", debate.id)
      .where("isHidden", "==", false)
      .get();

    debate.postCount = postsSnap.size;
    const stances = new Set(postsSnap.docs.map((d) => d.data().stance));
    debate.stanceCount = stances.size;
  }

  // Score and select diverse set
  const scored = candidates.map((debate) => ({
    debate,
    score: calculateEngagementScore(debate, userPrefs),
  }));

  const selected = selectDiverse(scored, DEBATES_PER_DAY, MAX_PER_CATEGORY);

  // Mark selected as shown
  const batch = db.batch();
  for (const debate of selected) {
    const histRef = db
      .collection("users")
      .doc(uid)
      .collection("debateHistory")
      .doc(debate.id);
    batch.set(histRef, {participated: false, shownAt: now});
  }
  await batch.commit();

  return selected.map(serializeDebate);
});
