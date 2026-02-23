import {onSchedule} from "firebase-functions/v2/scheduler";
import * as admin from "firebase-admin";
import {logger} from "firebase-functions";

const db = admin.firestore();

/**
 * Runs every 30 seconds to match waiting users in the queue.
 */
export const processMatchmaking = onSchedule("every 1 minutes", async () => {
  const now = admin.firestore.Timestamp.now();
  const tenMinutesAgo = admin.firestore.Timestamp.fromMillis(
    now.toMillis() - 10 * 60 * 1000
  );

  // Get all waiting entries, oldest first
  const waitingSnap = await db
    .collection("matchmakingQueue")
    .where("status", "==", "waiting")
    .orderBy("enqueuedAt", "asc")
    .get();

  if (waitingSnap.empty) return;

  const entries = waitingSnap.docs.map((doc) => ({
    id: doc.id,
    ref: doc.ref,
    ...doc.data(),
  }));

  const matched = new Set<string>();

  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i] as Record<string, unknown> & {id: string; ref: admin.firestore.DocumentReference};
    if (matched.has(entry.id)) continue;

    // Expire old entries
    if ((entry.enqueuedAt as admin.firestore.Timestamp) < tenMinutesAgo) {
      await entry.ref.update({status: "expired"});
      matched.add(entry.id);
      continue;
    }

    // Find a compatible match
    for (let j = i + 1; j < entries.length; j++) {
      const other = entries[j] as Record<string, unknown> & {id: string; ref: admin.firestore.DocumentReference};
      if (matched.has(other.id)) continue;

      // Same format required
      if (entry.format !== other.format) continue;

      // Compatible category (null matches anything)
      if (entry.category && other.category && entry.category !== other.category) continue;

      // Opposing stances (or at least one is "either")
      const stancesCompatible =
        entry.stance === "either" ||
        other.stance === "either" ||
        entry.stance !== other.stance;
      if (!stancesCompatible) continue;

      // Rank within range
      const rankDiff = Math.abs((entry.rankPoints as number) - (other.rankPoints as number));
      const maxRange = Math.max(entry.rankRange as number, other.rankRange as number);
      if (rankDiff > maxRange) continue;

      // Match found! Create a debate
      try {
        // Determine sides
        let entrySide: "for" | "against";
        if ((entry.stance as string) === "for") entrySide = "for";
        else if ((entry.stance as string) === "against") entrySide = "against";
        else if ((other.stance as string) === "for") entrySide = "against";
        else if ((other.stance as string) === "against") entrySide = "for";
        else entrySide = Math.random() < 0.5 ? "for" : "against";

        // Pick a topic — use specific if provided, otherwise use category
        let topicId = (entry.topicId as string) || (other.topicId as string);
        let topicData: admin.firestore.DocumentData | undefined;

        if (topicId) {
          const topicDoc = await db.collection("topics").doc(topicId).get();
          topicData = topicDoc.data();
        } else {
          // Pick a random active topic from the category
          const category = (entry.category as string) || (other.category as string);
          let topicQuery = db.collection("topics").where("isActive", "==", true);
          if (category) topicQuery = topicQuery.where("category", "==", category);
          const topicsSnap = await topicQuery.limit(10).get();
          if (!topicsSnap.empty) {
            const randomIndex = Math.floor(Math.random() * topicsSnap.size);
            const topicDoc = topicsSnap.docs[randomIndex];
            topicId = topicDoc.id;
            topicData = topicDoc.data();
          }
        }

        if (!topicId || !topicData) {
          logger.warn("No suitable topic found for match");
          continue;
        }

        const debateNow = admin.firestore.Timestamp.now();
        const expiresAt = admin.firestore.Timestamp.fromMillis(
          debateNow.toMillis() + 24 * 60 * 60 * 1000
        );

        const makeParticipant = (e: Record<string, unknown>) => ({
          uid: e.userId as string,
          username: e.username as string,
          displayName: (e.displayName as string) || null,
          rank: (e.rank as string) || "bronze",
          joinedAt: debateNow,
          isLeader: true,
        });

        const debateRef = db.collection("debates").doc();
        await debateRef.set({
          topicId,
          title: `${topicData.name} — Matchmade Debate`,
          description: null,
          format: entry.format,
          status: "setup",
          topicName: topicData.name,
          topicSlug: topicData.slug,
          topicCategory: topicData.category,
          createdAt: debateNow,
          startedAt: null,
          votingStartedAt: null,
          completedAt: null,
          expiresAt,
          totalRounds: 3,
          currentRound: -1,
          wordLimit: 500,
          timePerRound: 600,
          forSide: {
            position: "",
            teamMembers: entrySide === "for"
              ? [makeParticipant(entry)]
              : [makeParticipant(other)],
          },
          againstSide: {
            position: "",
            teamMembers: entrySide === "against"
              ? [makeParticipant(entry)]
              : [makeParticipant(other)],
          },
          spectatorCount: 0,
          participantCount: 2,
          createdBy: "matchmaking",
          moderatorId: null,
          crowdWinner: null,
          logicWinner: null,
          overallWinner: null,
          featured: false,
        });

        // Update both queue entries
        await entry.ref.update({
          status: "matched",
          matchedDebateId: debateRef.id,
        });
        await other.ref.update({
          status: "matched",
          matchedDebateId: debateRef.id,
        });

        matched.add(entry.id);
        matched.add(other.id);

        logger.info(`Matched ${entry.userId} vs ${other.userId} → debate ${debateRef.id}`);
        break;
      } catch (err) {
        logger.error("Matchmaking error", err);
      }
    }

    // Widen rank range for entries waiting > 2 minutes
    if (!matched.has(entry.id)) {
      const twoMinutesAgo = admin.firestore.Timestamp.fromMillis(
        now.toMillis() - 2 * 60 * 1000
      );
      if ((entry.enqueuedAt as admin.firestore.Timestamp) < twoMinutesAgo) {
        await entry.ref.update({
          rankRange: admin.firestore.FieldValue.increment(500),
        });
      }
    }
  }
});
