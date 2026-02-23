import {onCall, HttpsError} from "firebase-functions/v2/https";
import * as admin from "firebase-admin";

const db = admin.firestore();

interface FinalizeDebateData {
  debateId: string;
}

// Rank thresholds
const RANK_THRESHOLDS: Record<string, number> = {
  bronze: 0,
  silver: 500,
  gold: 1500,
  platinum: 3500,
  diamond: 7000,
  legend: 12000,
};

const RANK_ORDER = ["bronze", "silver", "gold", "platinum", "diamond", "legend"];

function getRankForPoints(points: number): string {
  let rank = "bronze";
  for (const [r, threshold] of Object.entries(RANK_THRESHOLDS)) {
    if (points >= threshold) rank = r;
  }
  return rank;
}

function getRankIndex(rank: string): number {
  return RANK_ORDER.indexOf(rank);
}

export const finalizeDebate = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Must be logged in");
  }

  const {debateId} = request.data as FinalizeDebateData;
  if (!debateId) {
    throw new HttpsError("invalid-argument", "debateId is required");
  }

  const debateRef = db.collection("debates").doc(debateId);
  const debateDoc = await debateRef.get();
  if (!debateDoc.exists) {
    throw new HttpsError("not-found", "Debate not found");
  }

  const debate = debateDoc.data()!;
  if (debate.status !== "voting" && debate.status !== "scoring") {
    throw new HttpsError("failed-precondition", "Debate is not in voting/scoring phase");
  }

  // --- Gather AI scores ---
  const argumentsSnap = await db
    .collection("arguments")
    .where("debateId", "==", debateId)
    .where("isHidden", "==", false)
    .get();

  let forAiTotal = 0;
  let forAiCount = 0;
  let againstAiTotal = 0;
  let againstAiCount = 0;
  let forConcessions = 0;
  let againstConcessions = 0;

  const roundScores: Array<{
    roundNumber: number;
    forScore: number;
    againstScore: number;
    forArgumentId: string;
    againstArgumentId: string;
  }> = [];

  // Group arguments by round
  const byRound = new Map<number, {for?: admin.firestore.QueryDocumentSnapshot; against?: admin.firestore.QueryDocumentSnapshot}>();

  for (const doc of argumentsSnap.docs) {
    const arg = doc.data();
    const round = arg.roundNumber;
    if (!byRound.has(round)) byRound.set(round, {});
    const entry = byRound.get(round)!;
    if (arg.side === "for") entry.for = doc;
    else entry.against = doc;

    if (arg.aiScores) {
      if (arg.side === "for") {
        forAiTotal += arg.aiScores.overallScore;
        forAiCount++;
      } else {
        againstAiTotal += arg.aiScores.overallScore;
        againstAiCount++;
      }
    }

    if (arg.acknowledgesOpponentPoint) {
      if (arg.side === "for") forConcessions++;
      else againstConcessions++;
    }
  }

  for (const [roundNum, args] of byRound) {
    roundScores.push({
      roundNumber: roundNum,
      forScore: args.for?.data()?.aiScores?.overallScore || 0,
      againstScore: args.against?.data()?.aiScores?.overallScore || 0,
      forArgumentId: args.for?.id || "",
      againstArgumentId: args.against?.id || "",
    });
  }
  roundScores.sort((a, b) => a.roundNumber - b.roundNumber);

  const forAvgAi = forAiCount > 0 ? forAiTotal / forAiCount : 0;
  const againstAvgAi = againstAiCount > 0 ? againstAiTotal / againstAiCount : 0;

  // AI verdict
  const aiWinner = forAvgAi > againstAvgAi + 5 ? "for" :
    againstAvgAi > forAvgAi + 5 ? "against" : "draw";

  // --- Gather weighted crowd votes ---
  const votesSnap = await db
    .collection("votes")
    .where("debateId", "==", debateId)
    .get();

  let forWeighted = 0;
  let againstWeighted = 0;
  let drawWeighted = 0;
  let forRaw = 0;
  let againstRaw = 0;
  let drawRaw = 0;
  let mindChanged = 0;
  let totalWeightedVotes = 0;

  for (const doc of votesSnap.docs) {
    const vote = doc.data();
    // Calculate vote weight from judge score (1x to 3x)
    const js = vote.voterJudgeScore || 50;
    let weight: number;
    if (js <= 33) weight = 1.0;
    else if (js <= 66) weight = 1.0 + ((js - 33) / 33);
    else weight = 2.0 + ((js - 66) / 34);

    totalWeightedVotes += weight;

    if (vote.persuasivenessWinner === "for") {
      forWeighted += weight;
      forRaw++;
    } else if (vote.persuasivenessWinner === "against") {
      againstWeighted += weight;
      againstRaw++;
    } else {
      drawWeighted += weight;
      drawRaw++;
    }

    if (vote.changedMind) mindChanged++;
  }

  const crowdWinner = forWeighted > againstWeighted + 0.5 ? "for" :
    againstWeighted > forWeighted + 0.5 ? "against" : "draw";

  // --- Calculate overall winner ---
  // 40% AI + 40% crowd + 20% concession bonus
  const forFinalScore =
    (forAvgAi * 0.4) +
    (totalWeightedVotes > 0 ? (forWeighted / totalWeightedVotes) * 100 * 0.4 : 0) +
    (forConcessions * 5 * 0.2); // each concession = 5 pts toward the 20% bucket

  const againstFinalScore =
    (againstAvgAi * 0.4) +
    (totalWeightedVotes > 0 ? (againstWeighted / totalWeightedVotes) * 100 * 0.4 : 0) +
    (againstConcessions * 5 * 0.2);

  const overallWinner = forFinalScore > againstFinalScore + 2 ? "for" :
    againstFinalScore > forFinalScore + 2 ? "against" : "draw";

  // --- Build result document ---
  const now = admin.firestore.Timestamp.now();

  const forTeam = debate.forSide.teamMembers.map((m: {uid: string; username: string; displayName: string | null; rank: string}) => ({
    uid: m.uid,
    username: m.username,
    displayName: m.displayName,
    rank: m.rank,
    avgAiScore: forAvgAi,
  }));

  const againstTeam = debate.againstSide.teamMembers.map((m: {uid: string; username: string; displayName: string | null; rank: string}) => ({
    uid: m.uid,
    username: m.username,
    displayName: m.displayName,
    rank: m.rank,
    avgAiScore: againstAvgAi,
  }));

  // --- Calculate rank changes ---
  const rankChanges: Array<{uid: string; username: string; previousRank: string; newRank: string; pointsDelta: number; isUpsetWin: boolean}> = [];

  const allParticipants = [
    ...debate.forSide.teamMembers.map((m: {uid: string; username: string; rank: string}) => ({...m, side: "for"})),
    ...debate.againstSide.teamMembers.map((m: {uid: string; username: string; rank: string}) => ({...m, side: "against"})),
  ];

  // Base points: win=50, loss=-20, draw=10
  for (const p of allParticipants) {
    const isWinner = overallWinner === p.side;
    const isLoser = overallWinner !== "draw" && overallWinner !== p.side;
    let pointsDelta = 0;

    if (overallWinner === "draw") {
      pointsDelta = 10;
    } else if (isWinner) {
      pointsDelta = 50;
    } else {
      pointsDelta = -20;
    }

    // Check for upset win
    const opponentSide = p.side === "for" ? debate.againstSide : debate.forSide;
    const opponentRank = opponentSide.teamMembers[0]?.rank || "bronze";
    const isUpsetWin = isWinner && getRankIndex(opponentRank) - getRankIndex(p.rank) >= 2;
    if (isUpsetWin) pointsDelta += 30; // bonus for upset

    const userRef = db.collection("users").doc(p.uid);
    const userSnap = await userRef.get();
    const user = userSnap.data();
    if (!user) continue;

    const newPoints = Math.max(0, (user.rankPoints || 0) + pointsDelta);
    const previousRank = user.rank || "bronze";
    const newRank = getRankForPoints(newPoints);

    const newWinStreak = isWinner ? (user.winStreak || 0) + 1 : 0;
    const bestStreak = Math.max(user.bestWinStreak || 0, newWinStreak);

    const updates: Record<string, unknown> = {
      rankPoints: newPoints,
      rank: newRank,
      totalDebates: admin.firestore.FieldValue.increment(1),
      winStreak: newWinStreak,
      bestWinStreak: bestStreak,
    };

    if (isWinner) {
      updates.wins = admin.firestore.FieldValue.increment(1);
      if (isUpsetWin) updates.upsetWins = admin.firestore.FieldValue.increment(1);
    } else if (isLoser) {
      updates.losses = admin.firestore.FieldValue.increment(1);
    } else {
      updates.draws = admin.firestore.FieldValue.increment(1);
    }

    await userRef.update(updates);

    // Update debate history
    const histRef = db.collection("users").doc(p.uid).collection("debateHistory").doc(debateId);
    await histRef.set({
      result: isWinner ? "win" : isLoser ? "loss" : "draw",
      rankPointsDelta: pointsDelta,
      crowdVotePercent: totalWeightedVotes > 0
        ? ((p.side === "for" ? forWeighted : againstWeighted) / totalWeightedVotes) * 100
        : null,
      aiScoreAvg: p.side === "for" ? forAvgAi : againstAvgAi,
      opponentRank,
      completedAt: now,
    }, {merge: true});

    rankChanges.push({
      uid: p.uid,
      username: p.username,
      previousRank,
      newRank,
      pointsDelta,
      isUpsetWin,
    });
  }

  // --- Save result document ---
  const resultData = {
    debateId,
    format: debate.format,
    topicId: debate.topicId,
    topicName: debate.topicName,
    topicCategory: debate.topicCategory,
    completedAt: now,

    forTeam,
    againstTeam,

    roundScores,
    forTotalScore: Math.round(forFinalScore * 100) / 100,
    againstTotalScore: Math.round(againstFinalScore * 100) / 100,

    aiVerdict: {
      winner: aiWinner,
      reasoning: `AI analysis based on ${forAiCount + againstAiCount} scored arguments.`,
      forStrengths: [],
      againstStrengths: [],
      forWeaknesses: [],
      againstWeaknesses: [],
    },

    crowdVerdict: {
      winner: crowdWinner,
      forVotes: forRaw,
      againstVotes: againstRaw,
      drawVotes: drawRaw,
      totalVoters: votesSnap.size,
      totalWeightedVotes: Math.round(totalWeightedVotes * 100) / 100,
      mindChangedCount: mindChanged,
    },

    overallWinner,
    rankChanges,
  };

  await db.collection("debateResults").doc(debateId).set(resultData);

  // Update debate doc
  await debateRef.update({
    status: "completed",
    completedAt: now,
    crowdWinner,
    logicWinner: aiWinner,
    overallWinner,
  });

  // --- Update judge scores for all voters ---
  for (const voteDoc of votesSnap.docs) {
    const vote = voteDoc.data();
    const voterUid = vote.voterId;

    const judgeRef = db.collection("users").doc(voterUid).collection("judgeProfile").doc("stats");
    const judgeSnap = await judgeRef.get();
    const judge = judgeSnap.data() || {
      totalVotesCast: 0,
      accurateVotes: 0,
      neutralityScore: 100,
      fairnessScore: 100,
      compositeJudgeScore: 50,
      recentVoteDirections: [],
    };

    const newTotal = (judge.totalVotesCast || 0) + 1;
    const wasAccurate = vote.persuasivenessWinner === overallWinner;
    const newAccurate = (judge.accurateVotes || 0) + (wasAccurate ? 1 : 0);

    // Neutrality: track recent vote directions (last 20)
    const recent = [...(judge.recentVoteDirections || []), vote.persuasivenessWinner]
      .slice(-20);
    const forCount = recent.filter((d: string) => d === "for").length;
    const againstCount = recent.filter((d: string) => d === "against").length;
    const total = recent.length;
    const bias = total > 0 ? Math.abs(forCount - againstCount) / total : 0;
    // Neutrality: 100 = perfectly balanced, 0 = totally one-sided
    const neutralityScore = Math.round(Math.max(0, (1 - bias * 1.5)) * 100);

    // Fairness: check if they use diverse category votes (not always the same)
    // Simple heuristic: if they always pick the same side for all categories, fairness drops
    const categoryVotes = [vote.betterLogic, vote.betterEvidence, vote.moreOnTopic, vote.moreRespectful];
    const uniqueVotes = new Set(categoryVotes).size;
    // More diverse = more fair (4 unique = 100, 1 unique = 25)
    const currentFairness = Math.round((uniqueVotes / 4) * 100);
    // Rolling average with existing
    const fairnessScore = judge.totalVotesCast > 0
      ? Math.round((judge.fairnessScore * 0.8) + (currentFairness * 0.2))
      : currentFairness;

    // Composite: 40% accuracy + 30% neutrality + 30% fairness
    const accuracyScore = newTotal > 0 ? (newAccurate / newTotal) * 100 : 50;
    const compositeJudgeScore = Math.round(
      accuracyScore * 0.4 + neutralityScore * 0.3 + fairnessScore * 0.3
    );

    await judgeRef.set({
      totalVotesCast: newTotal,
      accurateVotes: newAccurate,
      neutralityScore,
      fairnessScore,
      compositeJudgeScore,
      recentVoteDirections: recent,
      updatedAt: now,
    });

    // Update user's judgeScore
    await db.collection("users").doc(voterUid).update({
      judgeScore: compositeJudgeScore,
    });
  }

  return {
    success: true,
    overallWinner,
    debateId,
  };
});
