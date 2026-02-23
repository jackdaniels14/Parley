import {onDocumentCreated} from "firebase-functions/v2/firestore";
import * as admin from "firebase-admin";
import Anthropic from "@anthropic-ai/sdk";

interface DebateResultDoc {
  overallWinner: string;
  crowdVerdict: {
    forVotes: number;
    totalVoters: number;
  };
  forTeam: Array<{username: string}>;
  againstTeam: Array<{username: string}>;
  topicName: string;
  topicCategory: string;
}

interface ArgumentDoc {
  debateId: string;
  roundNumber: number;
  side: string;
  claim: string;
  reasoning: string;
  isHidden: boolean;
  aiScores?: {overallScore: number} | null;
}

export const generateDebateClip = onDocumentCreated(
  {document: "debateResults/{debateId}", secrets: ["ANTHROPIC_API_KEY"]},
  async (event) => {
    const debateId = event.params.debateId;
    const resultData = event.data?.data() as DebateResultDoc | undefined;
    if (!resultData) return;

    const db = admin.firestore();

    // Fetch non-hidden arguments for this debate
    const argsSnap = await db
      .collection("arguments")
      .where("debateId", "==", debateId)
      .where("isHidden", "==", false)
      .get();

    const args = argsSnap.docs.map(
      (d) => ({id: d.id, ...d.data()} as ArgumentDoc & {id: string})
    );

    // Group by round and find the round with the highest combined AI score
    const roundScores = new Map<number, number>();
    for (const arg of args) {
      const score = arg.aiScores?.overallScore ?? 0;
      roundScores.set(
        arg.roundNumber,
        (roundScores.get(arg.roundNumber) ?? 0) + score
      );
    }

    let bestRound = 0;
    let bestScore = -1;
    for (const [round, score] of roundScores.entries()) {
      if (score > bestScore) {
        bestScore = score;
        bestRound = round;
      }
    }

    const bestRoundArgs = args.filter((a) => a.roundNumber === bestRound);
    const forArg = bestRoundArgs.find((a) => a.side === "for");
    const againstArg = bestRoundArgs.find((a) => a.side === "against");

    const forUsername = resultData.forTeam?.[0]?.username ?? "";
    const againstUsername = resultData.againstTeam?.[0]?.username ?? "";
    const {overallWinner, crowdVerdict, topicName, topicCategory} = resultData;

    const crowdPct =
      crowdVerdict?.totalVoters > 0
        ? Math.round((crowdVerdict.forVotes / crowdVerdict.totalVoters) * 100)
        : 50;

    const prompt = `You are creating a social media clip card for a debate between @${forUsername} (FOR) and @${againstUsername} (AGAINST) on the topic: "${topicName}".

Overall winner: ${overallWinner}
Crowd vote: ${crowdPct}% sided FOR
Best round FOR argument: "${forArg?.claim ?? "No argument"}"
Best round AGAINST argument: "${againstArg?.claim ?? "No argument"}"

Return a JSON object with these exact fields (no markdown, raw JSON only):
{
  "hookText": "catchy hook under 80 chars",
  "claimText": "best FOR argument summary under 120 chars",
  "counterText": "best AGAINST argument summary under 120 chars",
  "crowdVoteResult": "e.g. '58% sided FOR'"
}`;

    const anthropic = new Anthropic({apiKey: process.env.ANTHROPIC_API_KEY});
    const message = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 256,
      messages: [{role: "user", content: prompt}],
    });

    const content = message.content[0];
    if (content.type !== "text") return;

    let parsed: {
      hookText: string;
      claimText: string;
      counterText: string;
      crowdVoteResult: string;
    };

    try {
      parsed = JSON.parse(content.text);
    } catch {
      const match = content.text.match(/\{[\s\S]*\}/);
      if (!match) return;
      try {
        parsed = JSON.parse(match[0]);
      } catch {
        return;
      }
    }

    const resultText =
      overallWinner === "draw"
        ? "This debate was a draw!"
        : `${overallWinner === "for" ? forUsername : againstUsername} won!`;

    await db.collection("socialClips").add({
      debateId,
      createdBy: "system",
      type: "highlight",
      title: topicName,
      hookText: (parsed.hookText ?? "").slice(0, 80),
      claimText: (parsed.claimText ?? "").slice(0, 120),
      counterText: (parsed.counterText ?? "").slice(0, 120),
      resultText,
      crowdVoteResult:
        parsed.crowdVoteResult ?? `${crowdPct}% sided FOR`,
      argumentIds: bestRoundArgs.map((a) => a.id),
      cardImageUrl: null,
      cardTemplate: "dark",
      debateTitle: topicName,
      topicCategory,
      forUsername,
      againstUsername,
      sourcePlatform: "generated",
      videoUrl: null,
      sourceUrl: null,
      embedHtml: null,
      shareCount: 0,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  }
);
