import {onCall, HttpsError} from "firebase-functions/v2/https";
import * as admin from "firebase-admin";

const db = admin.firestore();

interface CancelDebateData {
  debateId: string;
  reason?: string;
}

export const cancelDebate = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Must be logged in");
  }

  const uid = request.auth.uid;
  const {debateId, reason} = request.data as CancelDebateData;

  if (!debateId) {
    throw new HttpsError("invalid-argument", "debateId is required");
  }

  const debateRef = db.collection("debates").doc(debateId);
  const debateDoc = await debateRef.get();

  if (!debateDoc.exists) {
    throw new HttpsError("not-found", "Debate not found");
  }

  const debate = debateDoc.data()!;

  // Only creator or moderator can cancel
  if (debate.createdBy !== uid) {
    const userDoc = await db.collection("users").doc(uid).get();
    if (!userDoc.exists || !userDoc.data()?.isModerator) {
      throw new HttpsError("permission-denied", "Only the creator or a moderator can cancel");
    }
  }

  if (debate.status === "completed" || debate.status === "cancelled") {
    throw new HttpsError("failed-precondition", "Debate is already finished");
  }

  await debateRef.update({
    status: "cancelled",
    completedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  return {success: true, reason: reason || "Cancelled by creator"};
});
