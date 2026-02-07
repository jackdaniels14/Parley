import {onCall, HttpsError} from "firebase-functions/v2/https";
import * as admin from "firebase-admin";

const db = admin.firestore();

interface RegisterData {
  username: string;
  displayName?: string;
}

export const registerUsername = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Must be logged in");
  }

  const {username, displayName} = request.data as RegisterData;

  if (!username || username.length < 3 || username.length > 50) {
    throw new HttpsError("invalid-argument", "Username must be 3-50 characters");
  }

  if (!/^[a-zA-Z0-9_]+$/.test(username)) {
    throw new HttpsError(
      "invalid-argument",
      "Username can only contain letters, numbers, and underscores"
    );
  }

  const uid = request.auth.uid;
  const email = request.auth.token.email || "";
  const usernameLower = username.toLowerCase();

  // Transaction to atomically create user doc + username reservation
  await db.runTransaction(async (transaction) => {
    const usernameRef = db.collection("usernames").doc(usernameLower);
    const userRef = db.collection("users").doc(uid);

    const usernameDoc = await transaction.get(usernameRef);
    if (usernameDoc.exists) {
      throw new HttpsError("already-exists", "Username already taken");
    }

    const userDoc = await transaction.get(userRef);
    if (userDoc.exists) {
      throw new HttpsError("already-exists", "User profile already exists");
    }

    transaction.set(usernameRef, {uid});

    transaction.set(userRef, {
      email,
      username,
      displayName: displayName || username,
      bio: null,
      location: null,
      website: null,
      profileVisibility: "public",
      isActive: true,
      isModerator: false,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  });

  return {success: true, username};
});
