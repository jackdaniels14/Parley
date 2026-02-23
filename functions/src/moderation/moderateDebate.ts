import {onCall, HttpsError} from "firebase-functions/v2/https";
import * as admin from "firebase-admin";

const db = admin.firestore();

interface ModerateDebateData {
  debateId: string;
  actionType: "introduction" | "roundSummary" | "timeWarning" | "ruling" | "debateSummary" | "winnerDeclaration";
  content: string;
  roundNumber?: number;
}

export const moderateDebate = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Must be logged in");
  }

  const uid = request.auth.uid;
  const data = request.data as ModerateDebateData;

  if (!data.debateId || !data.actionType || !data.content) {
    throw new HttpsError("invalid-argument", "debateId, actionType, and content are required");
  }

  // Verify user is moderator or assigned moderator for this debate
  const debateDoc = await db.collection("debates").doc(data.debateId).get();
  if (!debateDoc.exists) {
    throw new HttpsError("not-found", "Debate not found");
  }

  const debate = debateDoc.data()!;
  if (debate.moderatorId !== uid) {
    const userDoc = await db.collection("users").doc(uid).get();
    if (!userDoc.exists || !userDoc.data()?.isModerator) {
      throw new HttpsError("permission-denied", "Only moderators can perform this action");
    }
  }

  const actionRef = db.collection("moderatorActions").doc();
  await actionRef.set({
    debateId: data.debateId,
    moderatorId: uid,
    actionType: data.actionType,
    roundNumber: data.roundNumber ?? null,
    content: data.content,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    isVisible: true,
  });

  return {id: actionRef.id, success: true};
});
