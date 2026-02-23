import {onCall, HttpsError} from "firebase-functions/v2/https";
import * as admin from "firebase-admin";

const db = admin.firestore();

interface AdvanceRoundData {
  debateId: string;
}

/**
 * Manually advance a round (used by moderators or timeout handler).
 * If the current side hasn't submitted, they forfeit that turn.
 */
export const advanceRound = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Must be logged in");
  }

  const uid = request.auth.uid;
  const {debateId} = request.data as AdvanceRoundData;

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

    // Only moderator or creator can manually advance
    if (debate.createdBy !== uid && debate.moderatorId !== uid) {
      const userDoc = await transaction.get(db.collection("users").doc(uid));
      if (!userDoc.exists || !userDoc.data()?.isModerator) {
        throw new HttpsError("permission-denied", "Only moderator or creator can advance rounds");
      }
    }

    if (debate.status !== "active") {
      throw new HttpsError("failed-precondition", "Debate is not active");
    }

    const currentRound = debate.currentRound;
    const roundRef = debateRef.collection("rounds").doc(String(currentRound));
    const roundDoc = await transaction.get(roundRef);

    if (!roundDoc.exists) {
      throw new HttpsError("not-found", "Current round not found");
    }

    const round = roundDoc.data()!;
    if (round.status === "completed") {
      throw new HttpsError("failed-precondition", "Round already completed");
    }

    const now = admin.firestore.Timestamp.now();

    // If it's still the FOR side's turn, advance to AGAINST
    if (round.currentTurnSide === "for") {
      const newDeadline = admin.firestore.Timestamp.fromMillis(
        now.toMillis() + debate.timePerRound * 1000
      );
      transaction.update(roundRef, {
        status: "againstTurn",
        currentTurnSide: "against",
        deadline: newDeadline,
      });
      return;
    }

    // Against side's turn is done — complete the round
    transaction.update(roundRef, {
      status: "completed",
      currentTurnSide: null,
      completedAt: now,
    });

    if (currentRound + 1 < debate.totalRounds) {
      const nextRoundNum = currentRound + 1;
      const nextRoundRef = debateRef.collection("rounds").doc(String(nextRoundNum));
      const nextDeadline = admin.firestore.Timestamp.fromMillis(
        now.toMillis() + debate.timePerRound * 1000
      );
      transaction.set(nextRoundRef, {
        roundNumber: nextRoundNum,
        status: "forTurn",
        startedAt: now,
        completedAt: null,
        deadline: nextDeadline,
        currentTurnSide: "for",
        moderatorSummary: null,
      });
      transaction.update(debateRef, {currentRound: nextRoundNum});
    } else {
      transaction.update(debateRef, {
        status: "voting",
        votingStartedAt: now,
      });
    }
  });

  return {success: true};
});
