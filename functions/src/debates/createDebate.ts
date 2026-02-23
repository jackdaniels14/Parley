import {onCall, HttpsError} from "firebase-functions/v2/https";
import * as admin from "firebase-admin";

const db = admin.firestore();

interface CreateDebateData {
  topicId: string;
  title: string;
  description?: string;
  format: "duel" | "team" | "openFloor" | "devilsAdvocate";
  totalRounds?: number;
  wordLimit?: number;
  timePerRound?: number; // seconds
  position: string; // creator's thesis
  side: "for" | "against";
}

const FORMAT_DEFAULTS = {
  duel: {totalRounds: 3, wordLimit: 500, timePerRound: 600},
  team: {totalRounds: 3, wordLimit: 500, timePerRound: 900},
  openFloor: {totalRounds: 5, wordLimit: 400, timePerRound: 300},
  devilsAdvocate: {totalRounds: 3, wordLimit: 500, timePerRound: 600},
};

export const createDebate = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Must be logged in");
  }

  const uid = request.auth.uid;
  const data = request.data as CreateDebateData;

  // Validate required fields
  if (!data.topicId || !data.title || !data.format || !data.position || !data.side) {
    throw new HttpsError(
      "invalid-argument",
      "topicId, title, format, position, and side are required"
    );
  }

  if (!["duel", "team", "openFloor", "devilsAdvocate"].includes(data.format)) {
    throw new HttpsError("invalid-argument", "Invalid debate format");
  }

  if (!["for", "against"].includes(data.side)) {
    throw new HttpsError("invalid-argument", "Side must be 'for' or 'against'");
  }

  if (data.title.length < 10 || data.title.length > 200) {
    throw new HttpsError("invalid-argument", "Title must be 10-200 characters");
  }

  if (data.position.length < 10 || data.position.length > 500) {
    throw new HttpsError("invalid-argument", "Position must be 10-500 characters");
  }

  // Verify topic exists
  const topicDoc = await db.collection("topics").doc(data.topicId).get();
  if (!topicDoc.exists) {
    throw new HttpsError("not-found", "Topic not found");
  }
  const topicData = topicDoc.data()!;
  if (!topicData.isActive) {
    throw new HttpsError("failed-precondition", "Topic is not active");
  }

  // Get user info for denormalization
  const userDoc = await db.collection("users").doc(uid).get();
  if (!userDoc.exists) {
    throw new HttpsError("not-found", "User profile not found");
  }
  const userData = userDoc.data()!;

  const defaults = FORMAT_DEFAULTS[data.format];
  const now = admin.firestore.Timestamp.now();
  const expiresAt = admin.firestore.Timestamp.fromMillis(
    now.toMillis() + 24 * 60 * 60 * 1000
  );

  const participant = {
    uid,
    username: userData.username,
    displayName: userData.displayName || null,
    rank: userData.rank || "bronze",
    joinedAt: now,
    isLeader: true,
  };

  // For Devil's Advocate, randomly assign the side
  let creatorSide = data.side;
  if (data.format === "devilsAdvocate") {
    creatorSide = Math.random() < 0.5 ? "for" : "against";
  }

  const forSide = {
    position: creatorSide === "for" ? data.position : "",
    teamMembers: creatorSide === "for" ? [participant] : [],
  };

  const againstSide = {
    position: creatorSide === "against" ? data.position : "",
    teamMembers: creatorSide === "against" ? [participant] : [],
  };

  const debateRef = db.collection("debates").doc();
  const debateData = {
    topicId: data.topicId,
    title: data.title,
    description: data.description || null,
    format: data.format,
    status: "setup",

    // Denormalized topic info
    topicName: topicData.name,
    topicSlug: topicData.slug,
    topicCategory: topicData.category,

    // Lifecycle
    createdAt: now,
    startedAt: null,
    votingStartedAt: null,
    completedAt: null,
    expiresAt,

    // Structure
    totalRounds: data.totalRounds || defaults.totalRounds,
    currentRound: -1,
    wordLimit: data.wordLimit || defaults.wordLimit,
    timePerRound: data.timePerRound || defaults.timePerRound,

    // Sides
    forSide,
    againstSide,

    // Audience
    spectatorCount: 0,
    participantCount: 1,

    // Creator
    createdBy: uid,
    moderatorId: null,

    // Results
    crowdWinner: null,
    logicWinner: null,
    overallWinner: null,
    featured: false,
  };

  await db.runTransaction(async (transaction) => {
    transaction.set(debateRef, debateData);

    // Record in creator's debate history
    const histRef = db
      .collection("users")
      .doc(uid)
      .collection("debateHistory")
      .doc(debateRef.id);
    transaction.set(histRef, {
      debateId: debateRef.id,
      format: data.format,
      role: "proponent",
      side: creatorSide,
      result: null,
      rankPointsDelta: 0,
      crowdVotePercent: null,
      aiScoreAvg: null,
      opponentRank: null,
      completedAt: null,
      participated: true,
      shownAt: now,
    });
  });

  return {
    id: debateRef.id,
    ...debateData,
    createdAt: now.toDate().toISOString(),
    expiresAt: expiresAt.toDate().toISOString(),
    startedAt: null,
    votingStartedAt: null,
    completedAt: null,
  };
});
