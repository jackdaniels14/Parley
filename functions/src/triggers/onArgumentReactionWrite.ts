import {onDocumentWritten} from "firebase-functions/v2/firestore";
import * as admin from "firebase-admin";
import {logger} from "firebase-functions";

const db = admin.firestore();

const REACTION_FIELD_MAP: Record<string, string> = {
  persuasive: "persuasiveCount",
  strongLogic: "strongLogicCount",
  goodEvidence: "goodEvidenceCount",
  respectful: "respectfulCount",
};

export const onArgumentReactionWrite = onDocumentWritten(
  "argumentReactions/{reactionId}",
  async (event) => {
    const before = event.data?.before?.data();
    const after = event.data?.after?.data();

    // Determine argument ID
    const argumentId = after?.argumentId || before?.argumentId;
    if (!argumentId) return;

    const argRef = db.collection("arguments").doc(argumentId);
    const updates: Record<string, admin.firestore.FieldValue> = {};

    // Handle deletion (before exists, after doesn't)
    if (before && !after) {
      const field = REACTION_FIELD_MAP[before.reactionType];
      if (field) {
        updates[`crowdReactions.${field}`] = admin.firestore.FieldValue.increment(-1);
        updates["crowdReactions.totalReactions"] = admin.firestore.FieldValue.increment(-1);
      }
    }
    // Handle creation (before doesn't exist, after does)
    else if (!before && after) {
      const field = REACTION_FIELD_MAP[after.reactionType];
      if (field) {
        updates[`crowdReactions.${field}`] = admin.firestore.FieldValue.increment(1);
        updates["crowdReactions.totalReactions"] = admin.firestore.FieldValue.increment(1);
      }
    }
    // Handle update (type changed)
    else if (before && after && before.reactionType !== after.reactionType) {
      const oldField = REACTION_FIELD_MAP[before.reactionType];
      const newField = REACTION_FIELD_MAP[after.reactionType];
      if (oldField) {
        updates[`crowdReactions.${oldField}`] = admin.firestore.FieldValue.increment(-1);
      }
      if (newField) {
        updates[`crowdReactions.${newField}`] = admin.firestore.FieldValue.increment(1);
      }
    }

    if (Object.keys(updates).length > 0) {
      try {
        await argRef.update(updates);
      } catch (err) {
        logger.warn(`Failed to update argument ${argumentId} reaction counts`, err);
      }
    }
  }
);
