import {onCall, HttpsError} from "firebase-functions/v2/https";
import * as admin from "firebase-admin";

const db = admin.firestore();

interface ActionReportData {
  reportId: string;
  status: "reviewed" | "actioned";
  hidePost?: boolean;
}

export const actionReport = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Must be logged in");
  }

  const uid = request.auth.uid;

  // Check moderator status
  const userDoc = await db.collection("users").doc(uid).get();
  if (!userDoc.exists || !userDoc.data()?.isModerator) {
    throw new HttpsError("permission-denied", "Only moderators can action reports");
  }

  const {reportId, status, hidePost = false} =
    request.data as ActionReportData;

  if (!reportId || !status) {
    throw new HttpsError("invalid-argument", "reportId and status are required");
  }

  if (!["reviewed", "actioned"].includes(status)) {
    throw new HttpsError("invalid-argument", "status must be 'reviewed' or 'actioned'");
  }

  const reportRef = db.collection("reports").doc(reportId);
  const reportDoc = await reportRef.get();

  if (!reportDoc.exists) {
    throw new HttpsError("not-found", "Report not found");
  }

  const reportData = reportDoc.data()!;
  await reportRef.update({status});

  // Optionally hide the reported post
  if (hidePost && reportData.postId) {
    const postRef = db.collection("posts").doc(reportData.postId);
    await postRef.update({isHidden: true});
  }

  return {success: true};
});
