import {onCall, HttpsError} from "firebase-functions/v2/https";
import * as admin from "firebase-admin";

const db = admin.firestore();

interface ManageTopicData {
  action: "create" | "update";
  slug: string;
  name?: string;
  category?: string;
  description?: string;
  isActive?: boolean;
}

export const manageTopic = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Must be logged in");
  }

  const uid = request.auth.uid;

  // Check moderator status
  const userDoc = await db.collection("users").doc(uid).get();
  if (!userDoc.exists || !userDoc.data()?.isModerator) {
    throw new HttpsError("permission-denied", "Only moderators can manage topics");
  }

  const data = request.data as ManageTopicData;

  if (data.action === "create") {
    if (!data.name || !data.slug) {
      throw new HttpsError("invalid-argument", "name and slug are required");
    }

    const topicRef = db.collection("topics").doc();
    const topicData = {
      name: data.name,
      slug: data.slug,
      category: data.category || null,
      description: data.description || null,
      isActive: true,
    };

    // Use transaction to atomically check slug uniqueness and create
    await db.runTransaction(async (transaction) => {
      const existingSnap = await db
        .collection("topics")
        .where("slug", "==", data.slug)
        .limit(1)
        .get();

      if (!existingSnap.empty) {
        throw new HttpsError(
          "already-exists",
          "Topic with this slug already exists"
        );
      }

      transaction.set(topicRef, topicData);
    });

    return {id: topicRef.id, ...topicData};
  } else if (data.action === "update") {
    if (!data.slug) {
      throw new HttpsError("invalid-argument", "slug is required to identify topic");
    }

    // Find topic by slug
    const topicSnap = await db
      .collection("topics")
      .where("slug", "==", data.slug)
      .limit(1)
      .get();

    if (topicSnap.empty) {
      throw new HttpsError("not-found", "Topic not found");
    }

    const topicDoc = topicSnap.docs[0];
    const updates: Record<string, unknown> = {};

    if (data.name !== undefined) updates.name = data.name;
    if (data.category !== undefined) updates.category = data.category;
    if (data.description !== undefined) updates.description = data.description;
    if (data.isActive !== undefined) updates.isActive = data.isActive;

    await topicDoc.ref.update(updates);

    return {id: topicDoc.id, ...topicDoc.data(), ...updates};
  }

  throw new HttpsError("invalid-argument", "action must be 'create' or 'update'");
});
