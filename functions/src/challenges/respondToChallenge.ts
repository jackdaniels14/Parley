import {onCall, HttpsError} from "firebase-functions/v2/https";
import * as admin from "firebase-admin";

const db = admin.firestore();

interface RespondData {
  challengeId: string;
  response: "accept" | "decline";
  counterPosition?: string; // the challenged user's position when accepting
}

export const respondToChallenge = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Must be logged in");
  }

  const uid = request.auth.uid;
  const data = request.data as RespondData;

  if (!data.challengeId || !data.response) {
    throw new HttpsError("invalid-argument", "challengeId and response are required");
  }

  const challengeRef = db.collection("challenges").doc(data.challengeId);

  const result = await db.runTransaction(async (transaction) => {
    const challengeDoc = await transaction.get(challengeRef);
    if (!challengeDoc.exists) {
      throw new HttpsError("not-found", "Challenge not found");
    }

    const challenge = challengeDoc.data()!;

    if (challenge.challengedId !== uid) {
      throw new HttpsError("permission-denied", "This challenge is not for you");
    }

    if (challenge.status !== "pending") {
      throw new HttpsError("failed-precondition", "Challenge is no longer pending");
    }

    const now = admin.firestore.Timestamp.now();

    if (data.response === "decline") {
      transaction.update(challengeRef, {
        status: "declined",
        respondedAt: now,
      });
      return {success: true, debateId: null};
    }

    // Accept — create a debate
    if (!data.counterPosition || data.counterPosition.length < 10) {
      throw new HttpsError("invalid-argument", "A counter-position (min 10 chars) is required to accept");
    }

    const expiresAt = admin.firestore.Timestamp.fromMillis(
      now.toMillis() + 24 * 60 * 60 * 1000
    );

    const debateRef = db.collection("debates").doc();
    transaction.set(debateRef, {
      topicId: challenge.topicId,
      title: challenge.proposedTitle,
      description: null,
      format: challenge.format || "duel",
      status: "setup",

      topicName: challenge.topicName,
      topicSlug: "",
      topicCategory: challenge.topicCategory,

      createdAt: now,
      startedAt: null,
      votingStartedAt: null,
      completedAt: null,
      expiresAt,

      totalRounds: 3,
      currentRound: -1,
      wordLimit: 500,
      timePerRound: 600,

      forSide: {
        position: challenge.proposedPosition,
        teamMembers: [{
          uid: challenge.challengerId,
          username: challenge.challengerUsername,
          displayName: challenge.challengerDisplayName,
          rank: challenge.challengerRank,
          joinedAt: now,
          isLeader: true,
        }],
      },
      againstSide: {
        position: data.counterPosition,
        teamMembers: [{
          uid: uid,
          username: challenge.challengedUsername,
          displayName: challenge.challengedDisplayName,
          rank: challenge.challengedRank,
          joinedAt: now,
          isLeader: true,
        }],
      },

      spectatorCount: 0,
      participantCount: 2,
      createdBy: challenge.challengerId,
      moderatorId: null,
      crowdWinner: null,
      logicWinner: null,
      overallWinner: null,
      featured: false,
    });

    transaction.update(challengeRef, {
      status: "accepted",
      respondedAt: now,
      debateId: debateRef.id,
    });

    return {success: true, debateId: debateRef.id};
  });

  return result;
});
