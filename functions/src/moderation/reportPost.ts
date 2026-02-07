import {onCall, HttpsError} from "firebase-functions/v2/https";
import * as admin from "firebase-admin";

const db = admin.firestore();

interface ReportData {
  postId: string;
  reason: string;
  details?: string;
}

export const reportPost = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Must be logged in");
  }

  const uid = request.auth.uid;
  const {postId, reason, details} = request.data as ReportData;

  if (!postId || !reason) {
    throw new HttpsError("invalid-argument", "postId and reason are required");
  }

  // Check post exists
  const postDoc = await db.collection("posts").doc(postId).get();
  if (!postDoc.exists) {
    throw new HttpsError("not-found", "Post not found");
  }

  // Can't report own post
  if (postDoc.data()?.userId === uid) {
    throw new HttpsError("invalid-argument", "Cannot report your own post");
  }

  const now = admin.firestore.Timestamp.now();
  const reportRef = db.collection("reports").doc();

  await reportRef.set({
    postId,
    reporterId: uid,
    reason,
    details: details || null,
    status: "pending",
    createdAt: now,
  });

  return {id: reportRef.id, success: true};
});
