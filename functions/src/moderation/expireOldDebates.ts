import {onSchedule} from "firebase-functions/v2/scheduler";
import * as admin from "firebase-admin";

const db = admin.firestore();

export const expireOldDebates = onSchedule("every 5 minutes", async () => {
  const now = admin.firestore.Timestamp.now();

  const expiredSnap = await db
    .collection("debates")
    .where("isActive", "==", true)
    .where("expiresAt", "<", now)
    .get();

  if (expiredSnap.empty) {
    return;
  }

  // Firestore batches are limited to 500 operations
  const BATCH_SIZE = 500;
  const docs = expiredSnap.docs;
  for (let i = 0; i < docs.length; i += BATCH_SIZE) {
    const chunk = docs.slice(i, i + BATCH_SIZE);
    const batch = db.batch();
    for (const d of chunk) {
      batch.update(d.ref, {isActive: false});
    }
    await batch.commit();
  }

  console.log(`Expired ${expiredSnap.size} debates`);
});
