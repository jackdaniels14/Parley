import {onDocumentWritten} from "firebase-functions/v2/firestore";
import * as admin from "firebase-admin";
import {logger} from "firebase-functions";

const db = admin.firestore();

/**
 * Denormalize vote tallies on the debate document for real-time
 * vote tracking during the voting phase.
 */
export const onVoteWrite = onDocumentWritten(
  "votes/{voteId}",
  async (event) => {
    const after = event.data?.after?.data();
    if (!after) return; // votes shouldn't be deleted but handle gracefully

    const debateId = after.debateId;
    if (!debateId) return;

    // Re-aggregate all votes for this debate
    const votesSnap = await db
      .collection("votes")
      .where("debateId", "==", debateId)
      .get();

    let forVotes = 0;
    let againstVotes = 0;
    let drawVotes = 0;

    for (const doc of votesSnap.docs) {
      const vote = doc.data();
      if (vote.persuasivenessWinner === "for") forVotes++;
      else if (vote.persuasivenessWinner === "against") againstVotes++;
      else drawVotes++;
    }

    try {
      await db.collection("debates").doc(debateId).update({
        "voteTally.forVotes": forVotes,
        "voteTally.againstVotes": againstVotes,
        "voteTally.drawVotes": drawVotes,
        "voteTally.totalVoters": votesSnap.size,
      });
    } catch (err) {
      logger.warn(`Failed to update vote tally for debate ${debateId}`, err);
    }
  }
);
