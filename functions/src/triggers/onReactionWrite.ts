import {onDocumentWritten} from "firebase-functions/v2/firestore";
import * as admin from "firebase-admin";

const db = admin.firestore();

export const onReactionWrite = onDocumentWritten(
  "reactions/{reactionId}",
  async (event) => {
    const before = event.data?.before?.data();
    const after = event.data?.after?.data();

    // Determine the postId from whichever snapshot exists
    const postId = after?.postId || before?.postId;
    if (!postId) return;

    // Calculate the delta for reaction counts
    const oldType = before?.reactionType as string | undefined;
    const newType = after?.reactionType as string | undefined;

    // If reaction type didn't change, nothing to update
    if (oldType === newType) return;

    const updates: Record<string, admin.firestore.FieldValue> = {};

    // Decrement old type
    if (oldType) {
      const field = reactionTypeToField(oldType);
      if (field) {
        updates[`reactionCounts.${field}`] =
          admin.firestore.FieldValue.increment(-1);
      }
    }

    // Increment new type
    if (newType) {
      const field = reactionTypeToField(newType);
      if (field) {
        updates[`reactionCounts.${field}`] =
          admin.firestore.FieldValue.increment(1);
      }
    }

    if (Object.keys(updates).length > 0) {
      const postRef = db.collection("posts").doc(postId);
      const postDoc = await postRef.get();
      if (!postDoc.exists) {
        console.warn(`Post ${postId} not found for reaction update`);
        return;
      }
      await postRef.update(updates);
    }
  }
);

function reactionTypeToField(type: string): string | null {
  switch (type) {
  case "changed_mind":
    return "changedMindCount";
  case "good_point":
    return "goodPointCount";
  case "fair_disagree":
    return "fairDisagreeCount";
  default:
    return null;
  }
}
