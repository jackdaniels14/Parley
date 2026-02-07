import {onCall, HttpsError} from "firebase-functions/v2/https";
import * as admin from "firebase-admin";

const db = admin.firestore();

interface CreateDebateData {
  topicId: string;
  title: string;
  description?: string;
  durationHours?: number;
}

export const createDebate = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Must be logged in");
  }

  const uid = request.auth.uid;

  // Check moderator status
  const userDoc = await db.collection("users").doc(uid).get();
  if (!userDoc.exists || !userDoc.data()?.isModerator) {
    throw new HttpsError("permission-denied", "Only moderators can create debates");
  }

  const {topicId, title, description, durationHours = 24} =
    request.data as CreateDebateData;

  if (!topicId || !title) {
    throw new HttpsError("invalid-argument", "topicId and title are required");
  }

  // Verify topic exists
  const topicDoc = await db.collection("topics").doc(topicId).get();
  if (!topicDoc.exists) {
    throw new HttpsError("not-found", "Topic not found");
  }

  const topicData = topicDoc.data()!;
  const now = admin.firestore.Timestamp.now();
  const expiresAt = admin.firestore.Timestamp.fromMillis(
    now.toMillis() + durationHours * 60 * 60 * 1000
  );

  const debateRef = db.collection("debates").doc();
  await debateRef.set({
    topicId,
    title,
    description: description || null,
    createdAt: now,
    expiresAt,
    isActive: true,
    participantCount: 0,
    // Denormalized topic info
    topicName: topicData.name,
    topicSlug: topicData.slug,
    topicCategory: topicData.category || null,
  });

  return {
    id: debateRef.id,
    topicId,
    title,
    description: description || null,
    createdAt: now.toDate().toISOString(),
    expiresAt: expiresAt.toDate().toISOString(),
    isActive: true,
    participantCount: 0,
    topicName: topicData.name,
    topicSlug: topicData.slug,
    topicCategory: topicData.category || null,
  };
});
