import {onCall, HttpsError} from "firebase-functions/v2/https";
import * as admin from "firebase-admin";

const db = admin.firestore();

interface EnqueueData {
  format: "duel" | "team" | "openFloor" | "devilsAdvocate";
  category?: string;
  topicId?: string;
  stance: "for" | "against" | "either";
}

export const enqueueForMatch = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Must be logged in");
  }

  const uid = request.auth.uid;
  const data = request.data as EnqueueData;

  if (!data.format || !data.stance) {
    throw new HttpsError("invalid-argument", "format and stance are required");
  }

  // Check user doesn't already have a waiting entry
  const existingSnap = await db
    .collection("matchmakingQueue")
    .where("userId", "==", uid)
    .where("status", "==", "waiting")
    .limit(1)
    .get();

  if (!existingSnap.empty) {
    throw new HttpsError("already-exists", "You are already in the matchmaking queue");
  }

  // Get user info
  const userDoc = await db.collection("users").doc(uid).get();
  if (!userDoc.exists) {
    throw new HttpsError("not-found", "User profile not found");
  }
  const userData = userDoc.data()!;

  const entryRef = db.collection("matchmakingQueue").doc();
  await entryRef.set({
    userId: uid,
    username: userData.username,
    displayName: userData.displayName || null,
    rank: userData.rank || "bronze",
    rankPoints: userData.rankPoints || 0,
    format: data.format,
    category: data.category || null,
    stance: data.stance,
    topicId: data.topicId || null,
    enqueuedAt: admin.firestore.FieldValue.serverTimestamp(),
    status: "waiting",
    matchedDebateId: null,
    rankRange: 1000, // initial range — fairly wide
  });

  return {queueEntryId: entryRef.id, success: true};
});
