import {onCall, HttpsError} from "firebase-functions/v2/https";
import * as admin from "firebase-admin";

const db = admin.firestore();

interface DequeueData {
  queueEntryId: string;
}

export const dequeueFromMatch = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Must be logged in");
  }

  const uid = request.auth.uid;
  const {queueEntryId} = request.data as DequeueData;

  if (!queueEntryId) {
    throw new HttpsError("invalid-argument", "queueEntryId is required");
  }

  const entryRef = db.collection("matchmakingQueue").doc(queueEntryId);
  const entryDoc = await entryRef.get();

  if (!entryDoc.exists) {
    throw new HttpsError("not-found", "Queue entry not found");
  }

  const entry = entryDoc.data()!;
  if (entry.userId !== uid) {
    throw new HttpsError("permission-denied", "Not your queue entry");
  }

  if (entry.status !== "waiting") {
    throw new HttpsError("failed-precondition", "Entry is no longer waiting");
  }

  await entryRef.update({status: "expired"});

  return {success: true};
});
