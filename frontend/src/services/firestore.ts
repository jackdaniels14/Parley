import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  Timestamp,
  type Unsubscribe,
  type DocumentData,
} from 'firebase/firestore'
import { db } from '../lib/firebase'
import type {
  User,
  Topic,
  TopicCategory,
  Category,
  UserPreference,
  Debate,
  Argument,
  Round,
  Vote,
  Challenge,
  DebateResult,
  SocialClip,
  ModeratorAction,
  JudgeProfile,
  TopicCredibility,
  DebateHistoryEntry,
  SocialAccount,
  Stance,
  ArgumentReactionType,
  NotificationPreferences,
  ProfileStats,
  DebateFormat,
  DebateStatus,
} from '../types'

// ============================================================
// Helpers
// ============================================================

function tsToISO(val: unknown): string {
  if (val && typeof val === 'object' && 'toDate' in val) {
    return (val as { toDate: () => Date }).toDate().toISOString()
  }
  if (typeof val === 'string') return val
  return new Date().toISOString()
}

function tsToISOOrNull(val: unknown): string | null {
  if (!val) return null
  return tsToISO(val)
}

// ============================================================
// Users
// ============================================================

export async function getUser(uid: string): Promise<User | null> {
  const snap = await getDoc(doc(db, 'users', uid))
  if (!snap.exists()) return null
  return mapUserDoc(snap.id, snap.data())
}

export async function getUserByUsername(username: string): Promise<User | null> {
  const usernameSnap = await getDoc(doc(db, 'usernames', username.toLowerCase()))
  if (!usernameSnap.exists()) return null
  const uid = usernameSnap.data().uid as string
  return getUser(uid)
}

function mapUserDoc(id: string, d: DocumentData): User {
  return {
    id,
    email: d.email || '',
    username: d.username || '',
    displayName: d.displayName || null,
    bio: d.bio || null,
    location: d.location || null,
    website: d.website || null,
    pronouns: d.pronouns || null,
    avatarUrl: d.avatarUrl || null,
    profileVisibility: d.profileVisibility || 'public',
    createdAt: tsToISO(d.createdAt),
    isActive: d.isActive ?? true,
    isModerator: d.isModerator ?? false,
    rank: d.rank || 'bronze',
    rankPoints: d.rankPoints || 0,
    totalDebates: d.totalDebates || 0,
    wins: d.wins || 0,
    losses: d.losses || 0,
    draws: d.draws || 0,
    winStreak: d.winStreak || 0,
    bestWinStreak: d.bestWinStreak || 0,
    upsetWins: d.upsetWins || 0,
    avgLogicScore: d.avgLogicScore || 0,
    avgEvidenceScore: d.avgEvidenceScore || 0,
    avgOnTopicScore: d.avgOnTopicScore || 0,
    avgCrowdScore: d.avgCrowdScore || 0,
    matchmakingEnabled: d.matchmakingEnabled ?? false,
    preferredFormats: d.preferredFormats || [],
    preferredCategories: d.preferredCategories || [],
    judgeScore: d.judgeScore ?? 50,
  }
}

export async function updateUserProfile(
  uid: string,
  updates: {
    displayName?: string
    bio?: string
    location?: string
    website?: string
    pronouns?: string
    avatarUrl?: string
    profileVisibility?: 'public' | 'private'
    matchmakingEnabled?: boolean
    preferredFormats?: DebateFormat[]
    preferredCategories?: string[]
  }
): Promise<void> {
  await updateDoc(doc(db, 'users', uid), updates)
}

export async function checkUsernameAvailable(username: string): Promise<boolean> {
  const snap = await getDoc(doc(db, 'usernames', username.toLowerCase()))
  return !snap.exists()
}

// ============================================================
// Topics
// ============================================================

export async function listTopics(category?: TopicCategory): Promise<Topic[]> {
  let q = query(
    collection(db, 'topics'),
    where('isActive', '==', true),
    orderBy('name')
  )
  if (category) {
    q = query(
      collection(db, 'topics'),
      where('isActive', '==', true),
      where('category', '==', category),
      orderBy('name')
    )
  }
  const snap = await getDocs(q)
  return snap.docs.map((d) => mapTopicDoc(d.id, d.data()))
}

function mapTopicDoc(id: string, d: DocumentData): Topic {
  return {
    id,
    name: d.name || '',
    slug: d.slug || '',
    category: d.category || 'Culture & Trends',
    description: d.description || null,
    isActive: d.isActive ?? true,
    debateCount: d.debateCount || 0,
    createdAt: tsToISO(d.createdAt),
  }
}

export async function getCategories(): Promise<Category[]> {
  const topics = await listTopics()
  const counts: Record<string, number> = {}
  for (const topic of topics) {
    counts[topic.category] = (counts[topic.category] || 0) + 1
  }
  return Object.entries(counts)
    .map(([name, topicCount]) => ({ name: name as TopicCategory, topicCount }))
    .sort((a, b) => a.name.localeCompare(b.name))
}

// ============================================================
// Preferences
// ============================================================

export async function listPreferences(uid: string): Promise<UserPreference[]> {
  const snap = await getDocs(collection(db, 'users', uid, 'preferences'))
  return snap.docs.map((d) => {
    const data = d.data()
    return {
      id: d.id,
      topicId: d.id,
      stance: data.stance,
      source: data.source || 'manual',
      confidence: data.confidence ?? 1.0,
      createdAt: tsToISO(data.createdAt),
    }
  })
}

export async function createPreference(uid: string, topicId: string, stance: Stance): Promise<void> {
  await setDoc(doc(db, 'users', uid, 'preferences', topicId), {
    stance,
    source: 'manual',
    confidence: 1.0,
    createdAt: Timestamp.now(),
  })
}

export async function deletePreference(uid: string, topicId: string): Promise<void> {
  await deleteDoc(doc(db, 'users', uid, 'preferences', topicId))
}

// ============================================================
// Debates
// ============================================================

export async function getDebateById(debateId: string): Promise<Debate | null> {
  const snap = await getDoc(doc(db, 'debates', debateId))
  if (!snap.exists()) return null
  return mapDebateDoc(snap.id, snap.data())
}

export async function listDebates(filters?: {
  status?: DebateStatus
  format?: DebateFormat
  category?: TopicCategory
  limit?: number
}): Promise<Debate[]> {
  const constraints = []

  if (filters?.status) {
    constraints.push(where('status', '==', filters.status))
  }
  if (filters?.format) {
    constraints.push(where('format', '==', filters.format))
  }
  if (filters?.category) {
    constraints.push(where('topicCategory', '==', filters.category))
  }

  constraints.push(orderBy('createdAt', 'desc'))

  if (filters?.limit) {
    constraints.push(limit(filters.limit))
  }

  const q = query(collection(db, 'debates'), ...constraints)
  const snap = await getDocs(q)
  return snap.docs.map((d) => mapDebateDoc(d.id, d.data()))
}

export function onDebateSnapshot(
  debateId: string,
  callback: (debate: Debate) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  return onSnapshot(
    doc(db, 'debates', debateId),
    (snap) => {
      if (snap.exists()) {
        callback(mapDebateDoc(snap.id, snap.data()))
      }
    },
    (error) => {
      console.error('Debate snapshot error:', error)
      onError?.(error)
    }
  )
}

function mapDebateDoc(id: string, d: DocumentData): Debate {
  return {
    id,
    topicId: d.topicId || '',
    title: d.title || '',
    description: d.description || null,
    format: d.format || 'duel',
    status: d.status || 'setup',
    topicName: d.topicName || '',
    topicSlug: d.topicSlug || '',
    topicCategory: d.topicCategory || 'Culture & Trends',
    createdAt: tsToISO(d.createdAt),
    startedAt: tsToISOOrNull(d.startedAt),
    votingStartedAt: tsToISOOrNull(d.votingStartedAt),
    completedAt: tsToISOOrNull(d.completedAt),
    expiresAt: tsToISO(d.expiresAt),
    totalRounds: d.totalRounds || 3,
    currentRound: d.currentRound ?? -1,
    wordLimit: d.wordLimit || 500,
    timePerRound: d.timePerRound || 600,
    forSide: d.forSide || { position: '', teamMembers: [] },
    againstSide: d.againstSide || { position: '', teamMembers: [] },
    spectatorCount: d.spectatorCount || 0,
    participantCount: d.participantCount || 0,
    createdBy: d.createdBy || '',
    moderatorId: d.moderatorId || null,
    crowdWinner: d.crowdWinner || null,
    logicWinner: d.logicWinner || null,
    overallWinner: d.overallWinner || null,
    featured: d.featured ?? false,
  }
}

// ============================================================
// Rounds
// ============================================================

export async function getDebateRounds(debateId: string): Promise<Round[]> {
  const snap = await getDocs(
    query(collection(db, 'debates', debateId, 'rounds'), orderBy('roundNumber'))
  )
  return snap.docs.map((d) => mapRoundDoc(d.data()))
}

export function onRoundSnapshot(
  debateId: string,
  roundNumber: number,
  callback: (round: Round) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  return onSnapshot(
    doc(db, 'debates', debateId, 'rounds', String(roundNumber)),
    (snap) => {
      if (snap.exists()) {
        callback(mapRoundDoc(snap.data()))
      }
    },
    (error) => {
      console.error('Round snapshot error:', error)
      onError?.(error)
    }
  )
}

function mapRoundDoc(d: DocumentData): Round {
  return {
    roundNumber: d.roundNumber ?? 0,
    status: d.status || 'pending',
    startedAt: tsToISOOrNull(d.startedAt),
    completedAt: tsToISOOrNull(d.completedAt),
    deadline: tsToISOOrNull(d.deadline),
    currentTurnSide: d.currentTurnSide || null,
    moderatorSummary: d.moderatorSummary || null,
  }
}

// ============================================================
// Arguments
// ============================================================

export async function getDebateArguments(debateId: string): Promise<Argument[]> {
  const snap = await getDocs(
    query(
      collection(db, 'arguments'),
      where('debateId', '==', debateId),
      where('isHidden', '==', false),
      orderBy('createdAt', 'asc')
    )
  )
  return snap.docs.map((d) => mapArgumentDoc(d.id, d.data()))
}

export function onDebateArgumentsSnapshot(
  debateId: string,
  callback: (args: Argument[]) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  const q = query(
    collection(db, 'arguments'),
    where('debateId', '==', debateId),
    where('isHidden', '==', false),
    orderBy('createdAt', 'asc')
  )

  return onSnapshot(
    q,
    (snap) => {
      callback(snap.docs.map((d) => mapArgumentDoc(d.id, d.data())))
    },
    (error) => {
      console.error('Arguments snapshot error:', error)
      onError?.(error)
    }
  )
}

export async function getUserArguments(uid: string): Promise<Argument[]> {
  const snap = await getDocs(
    query(
      collection(db, 'arguments'),
      where('userId', '==', uid),
      where('isHidden', '==', false),
      orderBy('createdAt', 'desc')
    )
  )
  return snap.docs.map((d) => mapArgumentDoc(d.id, d.data()))
}

function mapArgumentDoc(id: string, d: DocumentData): Argument {
  return {
    id,
    debateId: d.debateId || '',
    roundNumber: d.roundNumber ?? 0,
    userId: d.userId || '',
    side: d.side || 'for',
    claim: d.claim || '',
    reasoning: d.reasoning || '',
    evidence: d.evidence || '',
    sources: d.sources || [],
    createdAt: tsToISO(d.createdAt),
    wordCount: d.wordCount || 0,
    isHidden: d.isHidden ?? false,
    isRebuttal: d.isRebuttal ?? false,
    rebuttalTargetId: d.rebuttalTargetId || null,
    userName: d.userName || 'Anonymous',
    userDisplayName: d.userDisplayName || null,
    userRank: d.userRank || 'bronze',
    acknowledgesOpponentPoint: d.acknowledgesOpponentPoint ?? false,
    concessionText: d.concessionText || null,
    aiScores: d.aiScores || null,
    crowdReactions: d.crowdReactions || {
      persuasiveCount: 0,
      strongLogicCount: 0,
      goodEvidenceCount: 0,
      respectfulCount: 0,
      totalReactions: 0,
    },
  }
}

// ============================================================
// Argument Reactions (direct client writes)
// ============================================================

export async function addArgumentReaction(
  userId: string,
  argumentId: string,
  reactionType: ArgumentReactionType
): Promise<void> {
  const reactionId = `${userId}_${argumentId}`
  await setDoc(doc(db, 'argumentReactions', reactionId), {
    argumentId,
    userId,
    reactionType,
    createdAt: Timestamp.now(),
  })
}

export async function getUserArgumentReaction(
  userId: string,
  argumentId: string
): Promise<ArgumentReactionType | null> {
  const reactionId = `${userId}_${argumentId}`
  const snap = await getDoc(doc(db, 'argumentReactions', reactionId))
  if (!snap.exists()) return null
  return snap.data().reactionType as ArgumentReactionType
}

export async function removeArgumentReaction(
  userId: string,
  argumentId: string
): Promise<void> {
  const reactionId = `${userId}_${argumentId}`
  await deleteDoc(doc(db, 'argumentReactions', reactionId))
}

// ============================================================
// Votes (direct client writes with composite ID)
// ============================================================

export async function submitVote(vote: Omit<Vote, 'id' | 'createdAt'>): Promise<void> {
  const voteId = `${vote.debateId}_${vote.voterId}`
  await setDoc(doc(db, 'votes', voteId), {
    ...vote,
    createdAt: Timestamp.now(),
  })
}

export async function getUserVote(debateId: string, userId: string): Promise<Vote | null> {
  const voteId = `${debateId}_${userId}`
  const snap = await getDoc(doc(db, 'votes', voteId))
  if (!snap.exists()) return null
  const d = snap.data()
  return {
    id: snap.id,
    debateId: d.debateId,
    voterId: d.voterId,
    persuasivenessWinner: d.persuasivenessWinner,
    betterLogic: d.betterLogic,
    betterEvidence: d.betterEvidence,
    moreOnTopic: d.moreOnTopic,
    moreRespectful: d.moreRespectful,
    changedMind: d.changedMind ?? false,
    previousStance: d.previousStance || null,
    newStance: d.newStance || null,
    voterJudgeScore: d.voterJudgeScore ?? 50,
    createdAt: tsToISO(d.createdAt),
  }
}

// ============================================================
// Challenges
// ============================================================

export async function getUserChallenges(
  uid: string,
  type: 'received' | 'sent'
): Promise<Challenge[]> {
  const field = type === 'received' ? 'challengedId' : 'challengerId'
  const snap = await getDocs(
    query(
      collection(db, 'challenges'),
      where(field, '==', uid),
      orderBy('createdAt', 'desc')
    )
  )
  return snap.docs.map((d) => mapChallengeDoc(d.id, d.data()))
}

export function onChallengesSnapshot(
  uid: string,
  callback: (challenges: Challenge[]) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  const q = query(
    collection(db, 'challenges'),
    where('challengedId', '==', uid),
    where('status', '==', 'pending'),
    orderBy('createdAt', 'desc')
  )

  return onSnapshot(
    q,
    (snap) => {
      callback(snap.docs.map((d) => mapChallengeDoc(d.id, d.data())))
    },
    (error) => {
      console.error('Challenges snapshot error:', error)
      onError?.(error)
    }
  )
}

function mapChallengeDoc(id: string, d: DocumentData): Challenge {
  return {
    id,
    challengerId: d.challengerId || '',
    challengerUsername: d.challengerUsername || '',
    challengerDisplayName: d.challengerDisplayName || null,
    challengerRank: d.challengerRank || 'bronze',
    challengedId: d.challengedId || '',
    challengedUsername: d.challengedUsername || '',
    challengedDisplayName: d.challengedDisplayName || null,
    challengedRank: d.challengedRank || 'bronze',
    topicId: d.topicId || '',
    topicName: d.topicName || '',
    topicCategory: d.topicCategory || 'Culture & Trends',
    proposedTitle: d.proposedTitle || '',
    proposedPosition: d.proposedPosition || '',
    format: d.format || 'duel',
    status: d.status || 'pending',
    createdAt: tsToISO(d.createdAt),
    expiresAt: tsToISO(d.expiresAt),
    respondedAt: tsToISOOrNull(d.respondedAt),
    debateId: d.debateId || null,
    message: d.message || null,
  }
}

// ============================================================
// Debate Results
// ============================================================

export async function getDebateResult(debateId: string): Promise<DebateResult | null> {
  const snap = await getDoc(doc(db, 'debateResults', debateId))
  if (!snap.exists()) return null
  const d = snap.data()
  return {
    debateId: d.debateId,
    format: d.format,
    topicId: d.topicId,
    topicName: d.topicName,
    topicCategory: d.topicCategory,
    completedAt: tsToISO(d.completedAt),
    forTeam: d.forTeam || [],
    againstTeam: d.againstTeam || [],
    roundScores: d.roundScores || [],
    forTotalScore: d.forTotalScore || 0,
    againstTotalScore: d.againstTotalScore || 0,
    aiVerdict: d.aiVerdict || { winner: 'draw', reasoning: '', forStrengths: [], againstStrengths: [], forWeaknesses: [], againstWeaknesses: [] },
    crowdVerdict: d.crowdVerdict || { winner: 'draw', forVotes: 0, againstVotes: 0, drawVotes: 0, totalVoters: 0, totalWeightedVotes: 0, mindChangedCount: 0 },
    overallWinner: d.overallWinner || 'draw',
    rankChanges: d.rankChanges || [],
  }
}

// ============================================================
// Moderator Actions
// ============================================================

export function onModeratorActionsSnapshot(
  debateId: string,
  callback: (actions: ModeratorAction[]) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  const q = query(
    collection(db, 'moderatorActions'),
    where('debateId', '==', debateId),
    orderBy('createdAt', 'asc')
  )

  return onSnapshot(
    q,
    (snap) => {
      callback(snap.docs.map((d) => {
        const data = d.data()
        return {
          id: d.id,
          debateId: data.debateId,
          moderatorId: data.moderatorId,
          actionType: data.actionType,
          roundNumber: data.roundNumber ?? null,
          content: data.content || '',
          createdAt: tsToISO(data.createdAt),
          isVisible: data.isVisible ?? true,
        }
      }))
    },
    (error) => {
      console.error('Moderator actions snapshot error:', error)
      onError?.(error)
    }
  )
}

// ============================================================
// Matchmaking Queue
// ============================================================

export function onMatchmakingEntrySnapshot(
  entryId: string,
  callback: (entry: { status: string; matchedDebateId: string | null }) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  return onSnapshot(
    doc(db, 'matchmakingQueue', entryId),
    (snap) => {
      if (snap.exists()) {
        const d = snap.data()
        callback({
          status: d.status,
          matchedDebateId: d.matchedDebateId || null,
        })
      }
    },
    (error) => {
      console.error('Matchmaking snapshot error:', error)
      onError?.(error)
    }
  )
}

// ============================================================
// Judge Profile
// ============================================================

export async function getJudgeProfile(uid: string): Promise<JudgeProfile | null> {
  const snap = await getDoc(doc(db, 'users', uid, 'judgeProfile', 'stats'))
  if (!snap.exists()) return null
  const d = snap.data()
  return {
    totalVotesCast: d.totalVotesCast || 0,
    accurateVotes: d.accurateVotes || 0,
    neutralityScore: d.neutralityScore ?? 100,
    fairnessScore: d.fairnessScore ?? 100,
    compositeJudgeScore: d.compositeJudgeScore ?? 50,
    recentVoteDirections: d.recentVoteDirections || [],
    updatedAt: tsToISO(d.updatedAt),
  }
}

// ============================================================
// Topic Credibility
// ============================================================

export async function getTopicCredibility(uid: string): Promise<TopicCredibility[]> {
  const snap = await getDocs(collection(db, 'users', uid, 'topicCredibility'))
  return snap.docs.map((d) => {
    const data = d.data()
    return {
      topicId: d.id,
      category: data.category || 'Culture & Trends',
      debateCount: data.debateCount || 0,
      wins: data.wins || 0,
      losses: data.losses || 0,
      avgScore: data.avgScore || 0,
      credibilityTier: data.credibilityTier || 'novice',
      updatedAt: tsToISO(data.updatedAt),
    }
  })
}

// ============================================================
// Debate History
// ============================================================

export async function getDebateHistory(uid: string): Promise<DebateHistoryEntry[]> {
  const snap = await getDocs(collection(db, 'users', uid, 'debateHistory'))
  return snap.docs.map((d) => {
    const data = d.data()
    return {
      debateId: d.id,
      format: data.format || 'duel',
      role: data.role || 'proponent',
      side: data.side || null,
      result: data.result || null,
      rankPointsDelta: data.rankPointsDelta || 0,
      crowdVotePercent: data.crowdVotePercent ?? null,
      aiScoreAvg: data.aiScoreAvg ?? null,
      opponentRank: data.opponentRank || null,
      completedAt: tsToISOOrNull(data.completedAt),
      participated: data.participated ?? false,
      shownAt: tsToISO(data.shownAt),
    }
  })
}

// ============================================================
// Social Clips
// ============================================================

export async function createClip(
  uid: string,
  data: Omit<SocialClip, 'id' | 'createdAt' | 'shareCount' | 'createdBy'>
): Promise<string> {
  const ref = doc(collection(db, 'socialClips'))
  await setDoc(ref, {
    ...data,
    createdBy: uid,
    shareCount: 0,
    createdAt: Timestamp.now(),
  })
  return ref.id
}

export async function listClips(limitCount = 20): Promise<SocialClip[]> {
  const snap = await getDocs(
    query(
      collection(db, 'socialClips'),
      orderBy('createdAt', 'desc'),
      limit(limitCount)
    )
  )
  return snap.docs.map((d) => mapClipDoc(d.id, d.data()))
}

export async function getDebateClips(debateId: string): Promise<SocialClip[]> {
  const snap = await getDocs(
    query(
      collection(db, 'socialClips'),
      where('debateId', '==', debateId),
      orderBy('createdAt', 'desc')
    )
  )
  return snap.docs.map((d) => mapClipDoc(d.id, d.data()))
}

function mapClipDoc(id: string, d: DocumentData): SocialClip {
  return {
    id,
    debateId: d.debateId || '',
    createdBy: d.createdBy || '',
    type: d.type || 'highlight',
    title: d.title || '',
    hookText: d.hookText || '',
    claimText: d.claimText || '',
    counterText: d.counterText || '',
    resultText: d.resultText || '',
    argumentIds: d.argumentIds || [],
    crowdVoteResult: d.crowdVoteResult || '',
    cardImageUrl: d.cardImageUrl || null,
    cardTemplate: d.cardTemplate || 'dark',
    debateTitle: d.debateTitle || '',
    topicCategory: d.topicCategory || 'Culture & Trends',
    forUsername: d.forUsername || '',
    againstUsername: d.againstUsername || '',
    createdAt: tsToISO(d.createdAt),
    shareCount: d.shareCount || 0,
    videoUrl: d.videoUrl || null,
    sourcePlatform: d.sourcePlatform || null,
    sourceUrl: d.sourceUrl || null,
    embedHtml: d.embedHtml || null,
  }
}

// ============================================================
// Social Accounts (retained from v1)
// ============================================================

export async function listSocialAccounts(uid: string): Promise<SocialAccount[]> {
  const snap = await getDocs(collection(db, 'users', uid, 'socialAccounts'))
  return snap.docs.map((d) => {
    const data = d.data()
    return {
      id: d.id,
      provider: d.id,
      providerUserId: data.providerUserId || '',
      lastSyncedAt: tsToISOOrNull(data.lastSyncedAt),
    }
  })
}

// ============================================================
// Settings
// ============================================================

export async function getNotificationPreferences(uid: string): Promise<NotificationPreferences> {
  const snap = await getDoc(doc(db, 'users', uid, 'settings', 'notifications'))
  if (!snap.exists()) {
    return {
      replyNotifications: true,
      reactionNotifications: true,
      newDebateNotifications: true,
      challengeNotifications: true,
      matchFoundNotifications: true,
      weeklyDigest: false,
    }
  }
  const d = snap.data()
  return {
    replyNotifications: d.replyNotifications ?? true,
    reactionNotifications: d.reactionNotifications ?? true,
    newDebateNotifications: d.newDebateNotifications ?? true,
    challengeNotifications: d.challengeNotifications ?? true,
    matchFoundNotifications: d.matchFoundNotifications ?? true,
    weeklyDigest: d.weeklyDigest ?? false,
  }
}

export async function updateNotificationPreferences(
  uid: string,
  prefs: Partial<NotificationPreferences>
): Promise<void> {
  await setDoc(doc(db, 'users', uid, 'settings', 'notifications'), prefs, { merge: true })
}

export async function getBlockedUsers(uid: string): Promise<string[]> {
  const snap = await getDoc(doc(db, 'users', uid, 'settings', 'privacy'))
  if (!snap.exists()) return []
  return (snap.data().blockedUsers as string[]) || []
}

export async function updateBlockedUsers(uid: string, ids: string[]): Promise<void> {
  await setDoc(doc(db, 'users', uid, 'settings', 'privacy'), { blockedUsers: ids }, { merge: true })
}

// ============================================================
// Profile Stats (computed from user doc)
// ============================================================

export function getProfileStats(user: User): ProfileStats {
  return {
    totalDebates: user.totalDebates,
    wins: user.wins,
    losses: user.losses,
    draws: user.draws,
    winStreak: user.winStreak,
    bestWinStreak: user.bestWinStreak,
    upsetWins: user.upsetWins,
    avgLogicScore: user.avgLogicScore,
    avgEvidenceScore: user.avgEvidenceScore,
    avgOnTopicScore: user.avgOnTopicScore,
    avgCrowdScore: user.avgCrowdScore,
    judgeScore: user.judgeScore,
  }
}
