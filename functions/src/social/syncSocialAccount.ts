import {onCall, HttpsError} from "firebase-functions/v2/https";
import * as admin from "firebase-admin";

const db = admin.firestore();

interface SyncData {
  provider: string;
}

export const syncSocialAccount = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Must be logged in");
  }

  const uid = request.auth.uid;
  const {provider} = request.data as SyncData;

  if (!provider || !["twitter", "reddit", "youtube"].includes(provider)) {
    throw new HttpsError("invalid-argument", "Invalid provider");
  }

  // Check social account exists
  const accountRef = db
    .collection("users")
    .doc(uid)
    .collection("socialAccounts")
    .doc(provider);
  const accountDoc = await accountRef.get();

  if (!accountDoc.exists) {
    throw new HttpsError("not-found", "Social account not connected");
  }

  // In a real implementation, you would:
  // 1. Get tokens from socialTokens collection
  // 2. Call provider APIs to fetch user data
  // 3. Analyze follows, subscriptions, etc.
  // For now, update with placeholder analysis

  const now = admin.firestore.Timestamp.now();

  const profileData: Record<string, unknown> = {
    provider,
    analyzedAt: now,
    signals: {},
  };

  if (provider === "twitter") {
    profileData.signals = {followingCount: 0, topicsDetected: []};
  } else if (provider === "reddit") {
    profileData.signals = {subredditCount: 0, topicsDetected: []};
  } else if (provider === "youtube") {
    profileData.signals = {subscriptionCount: 0, topicsDetected: []};
  }

  await accountRef.update({
    profileData,
    lastSyncedAt: now,
  });

  return {success: true, lastSyncedAt: now.toDate().toISOString()};
});
