import {onCall, HttpsError} from "firebase-functions/v2/https";

const ATTACK_PATTERNS = [
  "you're an idiot",
  "you're stupid",
  "you're dumb",
  "shut up",
  "you moron",
];

export function checkContent(text: string): {ok: boolean; reason?: string} {
  const textLower = text.toLowerCase();

  if (text.trim().length < 10) {
    return {ok: false, reason: "Content too short"};
  }

  for (const pattern of ATTACK_PATTERNS) {
    if (textLower.includes(pattern)) {
      return {ok: false, reason: "Contains prohibited content"};
    }
  }

  return {ok: true};
}

// Callable wrapper for client-side content preview checks
export const contentCheck = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Must be logged in");
  }

  const {text} = request.data as {text: string};
  if (!text) {
    throw new HttpsError("invalid-argument", "Text is required");
  }

  return checkContent(text);
});
