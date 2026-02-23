import {onCall, HttpsError} from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import Anthropic from "@anthropic-ai/sdk";

interface Suggestion {
  startTime: number;
  endTime: number;
  hookText: string;
  reason: string;
}

export const processVideoClips = onCall(
  {secrets: ["ANTHROPIC_API_KEY"]},
  async (request) => {
    const {clipId} = request.data as {clipId: string};

    if (!clipId || typeof clipId !== "string") {
      throw new HttpsError("invalid-argument", "clipId is required");
    }

    const db = admin.firestore();

    const clipSnap = await db.collection("socialClips").doc(clipId).get();
    if (!clipSnap.exists) {
      throw new HttpsError("not-found", "Clip not found");
    }

    const clipData = clipSnap.data()!;
    const debateId: string | null = clipData.debateId || null;

    let transcript = "";
    if (debateId) {
      const argsSnap = await db
        .collection("arguments")
        .where("debateId", "==", debateId)
        .where("isHidden", "==", false)
        .orderBy("roundNumber")
        .get();

      const argLines = argsSnap.docs.map((d) => {
        const data = d.data();
        return `[Round ${(data.roundNumber as number) + 1} - ${String(data.side).toUpperCase()}] ${data.claim as string}. ${data.reasoning as string}`;
      });
      transcript = argLines.join("\n");
    }

    const prompt = transcript
      ? `You are analyzing a debate video. The debate transcript is:\n\n${transcript.slice(0, 3000)}\n\nSuggest 3 best highlight moments for short social clips. Return a JSON array only (no markdown):\n[{"startTime": 0, "endTime": 30, "hookText": "...", "reason": "..."}]`
      : `Suggest 3 engaging highlight timestamps for a debate video. Assume the video is about 5-10 minutes. Return a JSON array only (no markdown):\n[{"startTime": 0, "endTime": 30, "hookText": "...", "reason": "..."}]`;

    const anthropic = new Anthropic({apiKey: process.env.ANTHROPIC_API_KEY});
    const message = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 512,
      messages: [{role: "user", content: prompt}],
    });

    const content = message.content[0];
    if (content.type !== "text") {
      throw new HttpsError("internal", "Unexpected response from AI");
    }

    let suggestions: Suggestion[];
    try {
      suggestions = JSON.parse(content.text) as Suggestion[];
    } catch {
      const match = content.text.match(/\[[\s\S]*\]/);
      if (!match) throw new HttpsError("internal", "Could not parse AI response");
      try {
        suggestions = JSON.parse(match[0]) as Suggestion[];
      } catch {
        throw new HttpsError("internal", "Could not parse AI response");
      }
    }

    return {suggestions};
  }
);
