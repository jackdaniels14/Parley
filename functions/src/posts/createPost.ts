import {onCall, HttpsError} from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import {checkContent} from "../moderation/contentCheck";

const db = admin.firestore();

const MIN_POSITION_LENGTH = 20;
const MIN_REASONING_LENGTH = 50;

interface CreatePostData {
  debateId: string;
  stance: string;
  position: string;
  reasoning: string;
}

export const createPost = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Must be logged in");
  }

  const uid = request.auth.uid;
  const {debateId, stance, position, reasoning} =
    request.data as CreatePostData;

  // Validate inputs
  if (!debateId || !stance || !position || !reasoning) {
    throw new HttpsError(
      "invalid-argument",
      "debateId, stance, position, and reasoning are required"
    );
  }

  if (!["support", "oppose", "mixed"].includes(stance)) {
    throw new HttpsError(
      "invalid-argument",
      "stance must be support, oppose, or mixed"
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

  // Get debate and verify it's active
  const debateRef = db.collection("debates").doc(debateId);
  const debateDoc = await debateRef.get();
  if (!debateDoc.exists) {
    throw new HttpsError("not-found", "Debate not found");
  }
  const debateData = debateDoc.data()!;
  if (!debateData.isActive) {
    throw new HttpsError("failed-precondition", "Debate has expired");
  }

  // Get user info for denormalization
  const userDoc = await db.collection("users").doc(uid).get();
  const userData = userDoc.data();

  const now = admin.firestore.Timestamp.now();

  // Create the post
  const postRef = db.collection("posts").doc();
  const postData = {
    debateId,
    userId: uid,
    parentId: null,
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

  // Transaction: create post + update debate participant count + debate history
  await db.runTransaction(async (transaction) => {
    const histRef = db
      .collection("users")
      .doc(uid)
      .collection("debateHistory")
      .doc(debateId);
    const histDoc = await transaction.get(histRef);

    if (!histDoc.exists || !histDoc.data()?.participated) {
      transaction.update(debateRef, {
        participantCount: admin.firestore.FieldValue.increment(1),
      });
    }

    transaction.set(histRef, {participated: true, shownAt: now}, {merge: true});
    transaction.set(postRef, postData);
  });

  return {
    id: postRef.id,
    ...postData,
    createdAt: now.toDate().toISOString(),
  };
});
