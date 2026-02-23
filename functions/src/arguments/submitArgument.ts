import {onCall, HttpsError} from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import {checkContent} from "../moderation/contentCheck";

const db = admin.firestore();

const MAX_CLAIM_LENGTH = 200;
const MAX_REASONING_LENGTH = 1000;
const MAX_EVIDENCE_LENGTH = 1500;
const MIN_CLAIM_LENGTH = 10;
const MIN_REASONING_LENGTH = 20;

interface SubmitArgumentData {
  debateId: string;
  claim: string;
  reasoning: string;
  evidence: string;
  sources?: string[];
  acknowledgesOpponentPoint?: boolean;
  concessionText?: string;
  rebuttalTargetId?: string;
}

export const submitArgument = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Must be logged in");
  }

  const uid = request.auth.uid;
  const data = request.data as SubmitArgumentData;

  // Validate required fields
  if (!data.debateId || !data.claim || !data.reasoning || !data.evidence) {
    throw new HttpsError(
      "invalid-argument",
      "debateId, claim, reasoning, and evidence are required"
    );
  }

  // Validate lengths
  if (data.claim.length < MIN_CLAIM_LENGTH || data.claim.length > MAX_CLAIM_LENGTH) {
    throw new HttpsError(
      "invalid-argument",
      `Claim must be ${MIN_CLAIM_LENGTH}-${MAX_CLAIM_LENGTH} characters`
    );
  }

  if (data.reasoning.length < MIN_REASONING_LENGTH || data.reasoning.length > MAX_REASONING_LENGTH) {
    throw new HttpsError(
      "invalid-argument",
      `Reasoning must be ${MIN_REASONING_LENGTH}-${MAX_REASONING_LENGTH} characters`
    );
  }

  if (data.evidence.length > MAX_EVIDENCE_LENGTH) {
    throw new HttpsError(
      "invalid-argument",
      `Evidence must be under ${MAX_EVIDENCE_LENGTH} characters`
    );
  }

  // Content moderation checks
  for (const [field, text] of [["claim", data.claim], ["reasoning", data.reasoning], ["evidence", data.evidence]] as const) {
    const check = checkContent(text);
    if (!check.ok) {
      throw new HttpsError("invalid-argument", `${field}: ${check.reason}`);
    }
  }

  // Validate sources are URLs (basic check)
  const sources = (data.sources || []).filter((s) => s.trim().length > 0);

  const debateRef = db.collection("debates").doc(data.debateId);

  // Get user info
  const userDoc = await db.collection("users").doc(uid).get();
  if (!userDoc.exists) {
    throw new HttpsError("not-found", "User profile not found");
  }
  const userData = userDoc.data()!;

  const argumentRef = db.collection("arguments").doc();

  const result = await db.runTransaction(async (transaction) => {
    const debateDoc = await transaction.get(debateRef);
    if (!debateDoc.exists) {
      throw new HttpsError("not-found", "Debate not found");
    }

    const debate = debateDoc.data()!;

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

    // Determine which side the user is on
    const isForSide = debate.forSide.teamMembers.some(
      (m: {uid: string}) => m.uid === uid
    );
    const isAgainstSide = debate.againstSide.teamMembers.some(
      (m: {uid: string}) => m.uid === uid
    );

    if (!isForSide && !isAgainstSide) {
      throw new HttpsError("permission-denied", "You are not a participant in this debate");
    }

    const userSide = isForSide ? "for" : "against";

    // Check it's this side's turn
    if (round.currentTurnSide !== userSide) {
      throw new HttpsError("failed-precondition", "It's not your side's turn");
    }

    // Check this user hasn't already submitted this round
    const existingArgs = await db
      .collection("arguments")
      .where("debateId", "==", data.debateId)
      .where("roundNumber", "==", currentRound)
      .where("userId", "==", uid)
      .get();

    if (!existingArgs.empty) {
      throw new HttpsError("already-exists", "You already submitted an argument this round");
    }

    // Check word limit on combined content
    const totalWords = (data.claim + " " + data.reasoning + " " + data.evidence)
      .split(/\s+/)
      .filter((w) => w.length > 0).length;

    if (totalWords > debate.wordLimit) {
      throw new HttpsError(
        "invalid-argument",
        `Total word count (${totalWords}) exceeds limit of ${debate.wordLimit}`
      );
    }

    const now = admin.firestore.Timestamp.now();

    // Create argument
    const argumentData = {
      debateId: data.debateId,
      roundNumber: currentRound,
      userId: uid,
      side: userSide,

      claim: data.claim.trim(),
      reasoning: data.reasoning.trim(),
      evidence: data.evidence.trim(),
      sources,

      createdAt: now,
      wordCount: totalWords,
      isHidden: false,
      isRebuttal: !!data.rebuttalTargetId,
      rebuttalTargetId: data.rebuttalTargetId || null,

      // Denormalized user info
      userName: userData.username,
      userDisplayName: userData.displayName || null,
      userRank: userData.rank || "bronze",

      // Concession tracking
      acknowledgesOpponentPoint: data.acknowledgesOpponentPoint || false,
      concessionText: data.concessionText || null,

      // AI scores populated async by trigger
      aiScores: null,

      // Crowd reactions (denormalized, updated by trigger)
      crowdReactions: {
        persuasiveCount: 0,
        strongLogicCount: 0,
        goodEvidenceCount: 0,
        respectfulCount: 0,
        totalReactions: 0,
      },
    };

    transaction.set(argumentRef, argumentData);

    // Advance round: after "for" goes, it's "against" turn
    // After "against" goes, round is complete
    if (userSide === "for") {
      const newDeadline = admin.firestore.Timestamp.fromMillis(
        now.toMillis() + debate.timePerRound * 1000
      );
      transaction.update(roundRef, {
        status: "againstTurn",
        currentTurnSide: "against",
        deadline: newDeadline,
      });
    } else {
      // Against side just went — round is complete
      transaction.update(roundRef, {
        status: "completed",
        currentTurnSide: null,
        completedAt: now,
      });

      // Check if more rounds remain
      if (currentRound + 1 < debate.totalRounds) {
        // Create next round
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
        // All rounds complete — move to voting
        transaction.update(debateRef, {
          status: "voting",
          votingStartedAt: now,
        });
      }
    }

    return {
      id: argumentRef.id,
      ...argumentData,
      createdAt: now.toDate().toISOString(),
    };
  });

  return result;
});
