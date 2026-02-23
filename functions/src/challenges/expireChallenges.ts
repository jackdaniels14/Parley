import {onSchedule} from "firebase-functions/v2/scheduler";
import * as admin from "firebase-admin";
import {logger} from "firebase-functions";

const db = admin.firestore();

/**
 * Expire pending challenges that have passed their expiration time.
 * Runs every 5 minutes.
 */
export const expireChallenges = onSchedule("every 5 minutes", async () => {
  const now = admin.firestore.Timestamp.now();

  const expiredSnap = await db
    .collection("challenges")
    .where("status", "==", "pending")
    .where("expiresAt", "<", now)
    .get();

  if (expiredSnap.empty) return;

  const batch = db.batch();
  let count = 0;

  for (const doc of expiredSnap.docs) {
    batch.update(doc.ref, {status: "expired"});
    count++;
    if (count >= 500) break; // batch limit
  }

  await batch.commit();
  logger.info(`Expired ${count} challenges`);
});
