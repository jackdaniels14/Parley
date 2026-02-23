import {onCall, HttpsError} from "firebase-functions/v2/https";
import * as admin from "firebase-admin";

const db = admin.firestore();

const MAX_PENDING_CHALLENGES = 5;

interface IssueChallengeData {
  challengedUserId: string;
  topicId: string;
  proposedTitle: string;
  proposedPosition: string;
  format?: "duel" | "team" | "openFloor" | "devilsAdvocate";
  message?: string;
}

export const issueChallenge = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Must be logged in");
  }

  const uid = request.auth.uid;
  const data = request.data as IssueChallengeData;

  if (!data.challengedUserId || !data.topicId || !data.proposedTitle || !data.proposedPosition) {
    throw new HttpsError(
      "invalid-argument",
      "challengedUserId, topicId, proposedTitle, and proposedPosition are required"
    );
  }

  if (data.challengedUserId === uid) {
    throw new HttpsError("invalid-argument", "Cannot challenge yourself");
  }

  // Rate limit: max pending challenges
  const pendingSnap = await db
    .collection("challenges")
    .where("challengerId", "==", uid)
    .where("status", "==", "pending")
    .get();

  if (pendingSnap.size >= MAX_PENDING_CHALLENGES) {
    throw new HttpsError(
      "resource-exhausted",
      `Maximum ${MAX_PENDING_CHALLENGES} pending challenges allowed`
    );
  }

  // Get both users
  const [challengerDoc, challengedDoc, topicDoc] = await Promise.all([
    db.collection("users").doc(uid).get(),
    db.collection("users").doc(data.challengedUserId).get(),
    db.collection("topics").doc(data.topicId).get(),
  ]);

  if (!challengerDoc.exists) {
    throw new HttpsError("not-found", "Your profile not found");
  }
  if (!challengedDoc.exists) {
    throw new HttpsError("not-found", "Challenged user not found");
  }
  if (!topicDoc.exists) {
    throw new HttpsError("not-found", "Topic not found");
  }

  const challenger = challengerDoc.data()!;
  const challenged = challengedDoc.data()!;
  const topic = topicDoc.data()!;

  if (!challenged.isActive) {
    throw new HttpsError("failed-precondition", "Challenged user is not active");
  }

  const now = admin.firestore.Timestamp.now();
  const expiresAt = admin.firestore.Timestamp.fromMillis(
    now.toMillis() + 24 * 60 * 60 * 1000
  );

  const challengeRef = db.collection("challenges").doc();
  await challengeRef.set({
    challengerId: uid,
    challengerUsername: challenger.username,
    challengerDisplayName: challenger.displayName || null,
    challengerRank: challenger.rank || "bronze",

    challengedId: data.challengedUserId,
    challengedUsername: challenged.username,
    challengedDisplayName: challenged.displayName || null,
    challengedRank: challenged.rank || "bronze",

    topicId: data.topicId,
    topicName: topic.name,
    topicCategory: topic.category,
    proposedTitle: data.proposedTitle,
    proposedPosition: data.proposedPosition,
    format: data.format || "duel",

    status: "pending",
    createdAt: now,
    expiresAt,
    respondedAt: null,
    debateId: null,
    message: data.message || null,
  });

  return {challengeId: challengeRef.id, success: true};
});
