import {onCall, HttpsError} from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import {checkContent} from "../moderation/contentCheck";

const db = admin.firestore();

const MIN_POSITION_LENGTH = 20;
const MIN_REASONING_LENGTH = 50;

interface ReplyData {
  postId: string;
  stance: string;
  position: string;
  reasoning: string;
}

export const replyToPost = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Must be logged in");
  }

  const uid = request.auth.uid;
  const {postId, stance, position, reasoning} = request.data as ReplyData;

  // Validate inputs
  if (!postId || !stance || !position || !reasoning) {
    throw new HttpsError(
      "invalid-argument",
      "postId, stance, position, and reasoning are required"
    );
  }

  if (!["disagree", "partial_agree", "changed_mind", "agree"].includes(stance)) {
    throw new HttpsError(
      "invalid-argument",
      "Invalid reply stance"
    );
  }

  if (position.length < MIN_POSITION_LENGTH) {
    throw new HttpsError(
      "invalid-argument",
      `Position must be at least ${MIN_POSITION_LENGTH} characters`
    );
  }

  if (reasoning.length < MIN_REASONING_LENGTH) {
    throw new HttpsError(
      "invalid-argument",
      `Reasoning must be at least ${MIN_REASONING_LENGTH} characters`
    );
  }

  // Content check
  const positionCheck = checkContent(position);
  if (!positionCheck.ok) {
    throw new HttpsError("invalid-argument", positionCheck.reason || "Invalid content");
  }
  const reasoningCheck = checkContent(reasoning);
  if (!reasoningCheck.ok) {
    throw new HttpsError("invalid-argument", reasoningCheck.reason || "Invalid content");
  }

  // Get parent post
  const parentRef = db.collection("posts").doc(postId);
  const parentDoc = await parentRef.get();
  if (!parentDoc.exists) {
    throw new HttpsError("not-found", "Post not found");
  }
  const parentData = parentDoc.data()!;

  if (parentData.isHidden) {
    throw new HttpsError("failed-precondition", "Cannot reply to hidden post");
  }

  // Check debate is active
  const debateRef = db.collection("debates").doc(parentData.debateId);
  const debateDoc = await debateRef.get();
  if (!debateDoc.exists || !debateDoc.data()?.isActive) {
    throw new HttpsError("failed-precondition", "Debate has expired");
  }

  // Get user info for denormalization
  const userDoc = await db.collection("users").doc(uid).get();
  const userData = userDoc.data();

  const now = admin.firestore.Timestamp.now();

  // Create reply
  const replyRef = db.collection("posts").doc();
  const replyData = {
    debateId: parentData.debateId,
    userId: uid,
    parentId: postId,
    stance,
    position,
    reasoning,
    createdAt: now,
    isHidden: false,
    userName: userData?.username || "Anonymous",
    userDisplayName: userData?.displayName || userData?.username || "Anonymous",
    reactionCounts: {
      changedMindCount: 0,
      goodPointCount: 0,
      fairDisagreeCount: 0,
    },
    replyCount: 0,
  };

  // Transaction: create reply + increment parent reply count + update participation
  await db.runTransaction(async (transaction) => {
    // All reads must come before writes in Firestore transactions
    const histRef = db
      .collection("users")
      .doc(uid)
      .collection("debateHistory")
      .doc(parentData.debateId);
    const histDoc = await transaction.get(histRef);

    // Now perform all writes
    transaction.set(replyRef, replyData);
    transaction.update(parentRef, {
      replyCount: admin.firestore.FieldValue.increment(1),
    });

    if (!histDoc.exists || !histDoc.data()?.participated) {
      transaction.update(debateRef, {
        participantCount: admin.firestore.FieldValue.increment(1),
      });
    }

    transaction.set(histRef, {participated: true, shownAt: now}, {merge: true});
  });

  return {
    id: replyRef.id,
    ...replyData,
    createdAt: now.toDate().toISOString(),
  };
});
