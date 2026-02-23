import {onCall, HttpsError} from "firebase-functions/v2/https";
import * as admin from "firebase-admin";

const db = admin.firestore();

interface StartDebateData {
  debateId: string;
}

export const startDebate = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Must be logged in");
  }

  const uid = request.auth.uid;
  const {debateId} = request.data as StartDebateData;

  if (!debateId) {
    throw new HttpsError("invalid-argument", "debateId is required");
  }

  const debateRef = db.collection("debates").doc(debateId);

  await db.runTransaction(async (transaction) => {
    const debateDoc = await transaction.get(debateRef);
    if (!debateDoc.exists) {
      throw new HttpsError("not-found", "Debate not found");
    }

    const debate = debateDoc.data()!;

    // Only creator or moderator can start
    if (debate.createdBy !== uid && debate.moderatorId !== uid) {
      const userDoc = await transaction.get(db.collection("users").doc(uid));
      if (!userDoc.exists || !userDoc.data()?.isModerator) {
        throw new HttpsError("permission-denied", "Only the creator or a moderator can start the debate");
      }
    }

    if (debate.status !== "setup") {
      throw new HttpsError("failed-precondition", "Debate is not in setup phase");
    }

    // Validate both sides have participants
    if (debate.forSide.teamMembers.length === 0) {
      throw new HttpsError("failed-precondition", "The FOR side needs at least one participant");
    }
    if (debate.againstSide.teamMembers.length === 0) {
      throw new HttpsError("failed-precondition", "The AGAINST side needs at least one participant");
    }

    // For duel format, each side must have exactly 1
    if (debate.format === "duel" || debate.format === "devilsAdvocate") {
      if (debate.forSide.teamMembers.length !== 1 || debate.againstSide.teamMembers.length !== 1) {
        throw new HttpsError("failed-precondition", "Duel format requires exactly one participant per side");
      }
    }

    // Both sides must have positions
    if (!debate.forSide.position || !debate.againstSide.position) {
      throw new HttpsError("failed-precondition", "Both sides must have a stated position");
    }

    const now = admin.firestore.Timestamp.now();
    const roundDeadline = admin.firestore.Timestamp.fromMillis(
      now.toMillis() + debate.timePerRound * 1000
    );

    // Create round 0
    const roundRef = debateRef.collection("rounds").doc("0");
    transaction.set(roundRef, {
      roundNumber: 0,
      status: "forTurn",
      startedAt: now,
      completedAt: null,
      deadline: roundDeadline,
      currentTurnSide: "for",
      moderatorSummary: null,
    });

    // Update debate status
    transaction.update(debateRef, {
      status: "active",
      startedAt: now,
      currentRound: 0,
    });
  });

  return {success: true};
});
