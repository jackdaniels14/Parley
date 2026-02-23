import {onSchedule} from "firebase-functions/v2/scheduler";
import * as admin from "firebase-admin";
import {logger} from "firebase-functions";

const db = admin.firestore();

/**
 * Processes debate timeouts every minute:
 * 1. Active debates with expired round deadlines → auto-advance
 * 2. Voting-phase debates past 24h window → finalize
 * 3. Setup-phase debates past expiry → cancel
 */
export const processDebateTimeouts = onSchedule("every 1 minutes", async () => {
  const now = admin.firestore.Timestamp.now();

  // 1. Handle expired round deadlines in active debates
  const activeDebates = await db
    .collection("debates")
    .where("status", "==", "active")
    .get();

  for (const debateDoc of activeDebates.docs) {
    const debate = debateDoc.data();
    const currentRound = debate.currentRound;
    if (currentRound < 0) continue;

    const roundDoc = await debateDoc.ref
      .collection("rounds")
      .doc(String(currentRound))
      .get();

    if (!roundDoc.exists) continue;
    const round = roundDoc.data()!;

    if (round.status === "completed") continue;
    if (!round.deadline) continue;

    // Check if deadline has passed
    if ((round.deadline as admin.firestore.Timestamp).toMillis() > now.toMillis()) {
      continue;
    }

    logger.info(`Round ${currentRound} timed out for debate ${debateDoc.id}`);

    // Auto-advance: if FOR side timed out, move to AGAINST. If AGAINST timed out, complete round.
    if (round.currentTurnSide === "for") {
      const newDeadline = admin.firestore.Timestamp.fromMillis(
        now.toMillis() + debate.timePerRound * 1000
      );
      await roundDoc.ref.update({
        status: "againstTurn",
        currentTurnSide: "against",
        deadline: newDeadline,
      });
    } else {
      // Complete the round
      await roundDoc.ref.update({
        status: "completed",
        currentTurnSide: null,
        completedAt: now,
      });

      if (currentRound + 1 < debate.totalRounds) {
        const nextRoundNum = currentRound + 1;
        const nextDeadline = admin.firestore.Timestamp.fromMillis(
          now.toMillis() + debate.timePerRound * 1000
        );
        await debateDoc.ref.collection("rounds").doc(String(nextRoundNum)).set({
          roundNumber: nextRoundNum,
          status: "forTurn",
          startedAt: now,
          completedAt: null,
          deadline: nextDeadline,
          currentTurnSide: "for",
          moderatorSummary: null,
        });
        await debateDoc.ref.update({currentRound: nextRoundNum});
      } else {
        await debateDoc.ref.update({
          status: "voting",
          votingStartedAt: now,
        });
      }
    }
  }

  // 2. Finalize voting-phase debates past 24 hours
  const votingCutoff = admin.firestore.Timestamp.fromMillis(
    now.toMillis() - 24 * 60 * 60 * 1000
  );

  const votingDebates = await db
    .collection("debates")
    .where("status", "==", "voting")
    .get();

  for (const debateDoc of votingDebates.docs) {
    const debate = debateDoc.data();
    if (debate.votingStartedAt &&
        (debate.votingStartedAt as admin.firestore.Timestamp).toMillis() < votingCutoff.toMillis()) {
      // Mark as scoring — finalizeDebate will be called separately or can be triggered here
      await debateDoc.ref.update({status: "scoring"});
      logger.info(`Debate ${debateDoc.id} voting period ended, moved to scoring`);
    }
  }

  // 3. Cancel setup-phase debates past expiry
  const setupDebates = await db
    .collection("debates")
    .where("status", "==", "setup")
    .get();

  for (const debateDoc of setupDebates.docs) {
    const debate = debateDoc.data();
    if (debate.expiresAt &&
        (debate.expiresAt as admin.firestore.Timestamp).toMillis() < now.toMillis()) {
      await debateDoc.ref.update({
        status: "cancelled",
        completedAt: now,
      });
      logger.info(`Setup debate ${debateDoc.id} expired and cancelled`);
    }
  }
});
