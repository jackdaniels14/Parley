import {onCall, HttpsError} from "firebase-functions/v2/https";
import * as admin from "firebase-admin";

const db = admin.firestore();

interface ReportContentData {
  targetType: "argument" | "user" | "debate" | "clip";
  targetId: string;
  reason: string;
  details?: string;
}

export const reportContent = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Must be logged in");
  }

  const uid = request.auth.uid;
  const data = request.data as ReportContentData;

  if (!data.targetType || !data.targetId || !data.reason) {
    throw new HttpsError("invalid-argument", "targetType, targetId, and reason are required");
  }

  const validTypes = ["argument", "user", "debate", "clip"];
  if (!validTypes.includes(data.targetType)) {
    throw new HttpsError("invalid-argument", "Invalid target type");
  }

  const validReasons = ["personalAttack", "spam", "harassment", "misinformation", "inappropriateContent", "other"];
  if (!validReasons.includes(data.reason)) {
    throw new HttpsError("invalid-argument", "Invalid reason");
  }

  // Cannot report yourself
  if (data.targetType === "user" && data.targetId === uid) {
    throw new HttpsError("invalid-argument", "Cannot report yourself");
  }

  const reportRef = db.collection("reports").doc();
  await reportRef.set({
    targetType: data.targetType,
    targetId: data.targetId,
    reporterId: uid,
    reason: data.reason,
    details: data.details || null,
    status: "pending",
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    reviewedAt: null,
    reviewedBy: null,
    actionTaken: null,
  });

  return {id: reportRef.id, success: true};
});
