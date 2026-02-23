import {onCall, HttpsError} from "firebase-functions/v2/https";
import * as admin from "firebase-admin";

const db = admin.firestore();

interface JoinDebateData {
  debateId: string;
  side: "for" | "against";
  position?: string; // required if joining the empty side
}

const MAX_TEAM_SIZE: Record<string, number> = {
  duel: 1,
  team: 5,
  openFloor: 50, // effectively unlimited for challengers
  devilsAdvocate: 1,
};

export const joinDebate = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Must be logged in");
  }

  const uid = request.auth.uid;
  const data = request.data as JoinDebateData;

  if (!data.debateId || !data.side) {
    throw new HttpsError("invalid-argument", "debateId and side are required");
  }

  if (!["for", "against"].includes(data.side)) {
    throw new HttpsError("invalid-argument", "Side must be 'for' or 'against'");
  }

  const debateRef = db.collection("debates").doc(data.debateId);

  // Get user info
  const userDoc = await db.collection("users").doc(uid).get();
  if (!userDoc.exists) {
    throw new HttpsError("not-found", "User profile not found");
  }
  const userData = userDoc.data()!;

  const result = await db.runTransaction(async (transaction) => {
    const debateDoc = await transaction.get(debateRef);
    if (!debateDoc.exists) {
      throw new HttpsError("not-found", "Debate not found");
    }

    const debate = debateDoc.data()!;
    if (debate.status !== "setup") {
      throw new HttpsError("failed-precondition", "Debate has already started");
    }

    const side = data.side === "for" ? debate.forSide : debate.againstSide;
    const maxSize = MAX_TEAM_SIZE[debate.format] || 1;

    // Check team size limit
    if (side.teamMembers.length >= maxSize) {
      throw new HttpsError("failed-precondition", "This side is full");
    }

    // Check user isn't already in the debate
    const allMembers = [
      ...debate.forSide.teamMembers,
      ...debate.againstSide.teamMembers,
    ];
    if (allMembers.some((m: {uid: string}) => m.uid === uid)) {
      throw new HttpsError("already-exists", "Already in this debate");
    }

    const participant = {
      uid,
      username: userData.username,
      displayName: userData.displayName || null,
      rank: userData.rank || "bronze",
      joinedAt: admin.firestore.Timestamp.now(),
      isLeader: side.teamMembers.length === 0, // first to join empty side is leader
    };

    const sideField = data.side === "for" ? "forSide" : "againstSide";
    const updatedSide = {
      position: side.position || data.position || "",
      teamMembers: [...side.teamMembers, participant],
    };

    // If joining the empty side, position is required
    if (side.teamMembers.length === 0 && !side.position && !data.position) {
      throw new HttpsError(
        "invalid-argument",
        "Position is required when joining an empty side"
      );
    }

    transaction.update(debateRef, {
      [sideField]: updatedSide,
      participantCount: admin.firestore.FieldValue.increment(1),
    });

    // Record in user's debate history
    const histRef = db
      .collection("users")
      .doc(uid)
      .collection("debateHistory")
      .doc(data.debateId);
    transaction.set(histRef, {
      debateId: data.debateId,
      format: debate.format,
      role: "opponent",
      side: data.side,
      result: null,
      rankPointsDelta: 0,
      crowdVotePercent: null,
      aiScoreAvg: null,
      opponentRank: null,
      completedAt: null,
      participated: true,
      shownAt: admin.firestore.Timestamp.now(),
    });

    return {side: data.side, role: participant.isLeader ? "leader" : "member"};
  });

  return {success: true, ...result};
});
