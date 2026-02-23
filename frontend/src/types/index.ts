// ============================================================
// Parley Arena — Type Definitions
// ============================================================

// --- Enums & Union Types ---

export type DebateFormat = 'duel' | 'team' | 'openFloor' | 'devilsAdvocate' | 'video'
export type DebateStatus = 'setup' | 'active' | 'voting' | 'scoring' | 'completed' | 'cancelled'
export type DebateRank = 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond' | 'legend'
export type RoundStatus = 'pending' | 'forTurn' | 'againstTurn' | 'completed'
export type Side = 'for' | 'against'
export type VoteChoice = 'for' | 'against' | 'draw'
export type CategoryVote = 'for' | 'against' | 'equal'
export type ArgumentReactionType = 'persuasive' | 'strongLogic' | 'goodEvidence' | 'respectful'
export type ChallengeStatus = 'pending' | 'accepted' | 'declined' | 'expired' | 'cancelled'
export type MatchmakingStatus = 'waiting' | 'matched' | 'expired'
export type CredibilityTier = 'novice' | 'informed' | 'expert' | 'authority'
export type ClipTemplate = 'dark' | 'light' | 'vibrant'
export type ClipType = 'highlight' | 'result' | 'bestOf'
export type ReportTargetType = 'argument' | 'user' | 'debate' | 'clip'
export type ReportReason = 'personalAttack' | 'spam' | 'harassment' | 'misinformation' | 'inappropriateContent' | 'other'
export type ReportStatus = 'pending' | 'reviewed' | 'actioned' | 'dismissed'
export type ModeratorActionType = 'introduction' | 'roundSummary' | 'timeWarning' | 'ruling' | 'debateSummary' | 'winnerDeclaration'

// Theme
export type ThemeMode = 'light' | 'dark' | 'system'

// Topic preferences (retained from v1)
export type Stance = 'love' | 'hate' | 'neutral'
export type Source = 'manual' | 'inferred'

// --- Rank Thresholds ---

export const RANK_THRESHOLDS: Record<DebateRank, number> = {
  bronze: 0,
  silver: 500,
  gold: 1500,
  platinum: 3500,
  diamond: 7000,
  legend: 12000,
}

// --- User Types ---

export interface User {
  id: string
  email: string
  username: string
  displayName: string | null
  bio: string | null
  location: string | null
  website: string | null
  pronouns: string | null
  avatarUrl: string | null
  profileVisibility: 'public' | 'private'
  createdAt: string
  isActive: boolean
  isModerator: boolean

  // Competitive stats
  rank: DebateRank
  rankPoints: number
  totalDebates: number
  wins: number
  losses: number
  draws: number
  winStreak: number
  bestWinStreak: number
  upsetWins: number

  // Aggregate AI scores (rolling averages)
  avgLogicScore: number
  avgEvidenceScore: number
  avgOnTopicScore: number
  avgCrowdScore: number

  // Matchmaking preferences
  matchmakingEnabled: boolean
  preferredFormats: DebateFormat[]
  preferredCategories: string[]

  // Merit-based judging (0-100, starts at 50)
  judgeScore: number
}

export interface UserSummary {
  id: string
  username: string
  displayName: string | null
  rank: DebateRank
}

export interface NotificationPreferences {
  replyNotifications: boolean
  reactionNotifications: boolean
  newDebateNotifications: boolean
  challengeNotifications: boolean
  matchFoundNotifications: boolean
  weeklyDigest: boolean
}

export interface ProfileStats {
  totalDebates: number
  wins: number
  losses: number
  draws: number
  winStreak: number
  bestWinStreak: number
  upsetWins: number
  avgLogicScore: number
  avgEvidenceScore: number
  avgOnTopicScore: number
  avgCrowdScore: number
  judgeScore: number
}

// --- Judge System Types ---

export interface JudgeProfile {
  totalVotesCast: number
  accurateVotes: number
  neutralityScore: number    // 0-100, penalized if >70% votes go one direction
  fairnessScore: number      // 0-100, uses full range of categories
  compositeJudgeScore: number // 0-100, maps to 1x-3x vote weight
  recentVoteDirections: Side[] // last 20 votes for neutrality tracking
  updatedAt: string
}

/**
 * Maps judgeScore (0-100) to vote weight (1.0x - 3.0x)
 * 0-33  → 1.0x
 * 34-66 → 1.0x-2.0x (linear)
 * 67-100 → 2.0x-3.0x (linear)
 */
export function getVoteWeight(judgeScore: number): number {
  if (judgeScore <= 33) return 1.0
  if (judgeScore <= 66) return 1.0 + ((judgeScore - 33) / 33)
  return 2.0 + ((judgeScore - 66) / 34)
}

// --- Topic Types ---

export type TopicCategory =
  | 'Culture & Trends'
  | 'Business & Money'
  | 'Fitness & Health'
  | 'Local Issues'
  | 'Hypotheticals & Moral Dilemmas'

export interface Topic {
  id: string
  name: string
  slug: string
  category: TopicCategory
  description: string | null
  isActive: boolean
  debateCount: number
  createdAt: string
}

export interface Category {
  name: TopicCategory
  topicCount: number
}

// --- Topic Preference Types (retained from v1) ---

export interface UserPreference {
  id: string
  topicId: string
  stance: Stance
  source: Source
  confidence: number
  createdAt: string
}

// --- Topic Credibility Types ---

export interface TopicCredibility {
  topicId: string
  category: TopicCategory
  debateCount: number
  wins: number
  losses: number
  avgScore: number
  credibilityTier: CredibilityTier
  updatedAt: string
}

// --- Debate Types ---

export interface SideParticipant {
  uid: string
  username: string
  displayName: string | null
  rank: DebateRank
  joinedAt: string
  isLeader: boolean
}

export interface DebateSide {
  position: string
  teamMembers: SideParticipant[]
}

export interface Debate {
  id: string
  topicId: string
  title: string
  description: string | null
  format: DebateFormat
  status: DebateStatus

  // Denormalized topic info
  topicName: string
  topicSlug: string
  topicCategory: TopicCategory

  // Lifecycle timestamps
  createdAt: string
  startedAt: string | null
  votingStartedAt: string | null
  completedAt: string | null
  expiresAt: string

  // Structure
  totalRounds: number
  currentRound: number
  wordLimit: number
  timePerRound: number // seconds per round per side

  // Sides
  forSide: DebateSide
  againstSide: DebateSide

  // Audience
  spectatorCount: number
  participantCount: number

  // Creator / Moderator
  createdBy: string
  moderatorId: string | null

  // Results (populated after completion)
  crowdWinner: VoteChoice | null
  logicWinner: VoteChoice | null
  overallWinner: VoteChoice | null
  featured: boolean
}

export interface DebateWithArguments extends Debate {
  arguments: Argument[]
}

// --- Round Types ---

export interface Round {
  roundNumber: number
  status: RoundStatus
  startedAt: string | null
  completedAt: string | null
  deadline: string | null
  currentTurnSide: Side | null
  moderatorSummary: string | null
}

// --- Argument Types (replaces Post) ---

export interface AiScores {
  logicClarity: number    // 0-100
  evidenceQuality: number // 0-100
  onTopic: number         // 0-100
  overallScore: number    // weighted composite
  scoredAt: string
  feedback: string | null
}

export interface CrowdReactions {
  persuasiveCount: number
  strongLogicCount: number
  goodEvidenceCount: number
  respectfulCount: number
  totalReactions: number
}

export interface Argument {
  id: string
  debateId: string
  roundNumber: number
  userId: string
  side: Side

  // Structured content: Claim → Reasoning → Evidence
  claim: string           // max 200 chars
  reasoning: string       // max 1000 chars
  evidence: string        // max 1500 chars
  sources: string[]       // URLs/citations

  // Metadata
  createdAt: string
  wordCount: number
  isHidden: boolean
  isRebuttal: boolean
  rebuttalTargetId: string | null

  // Denormalized user info
  userName: string
  userDisplayName: string | null
  userRank: DebateRank

  // Concession tracking
  acknowledgesOpponentPoint: boolean
  concessionText: string | null

  // AI Scores (populated async)
  aiScores: AiScores | null

  // Crowd engagement (denormalized)
  crowdReactions: CrowdReactions
}

// --- Vote Types ---

export interface Vote {
  id: string // composite: {debateId}_{voterId}
  debateId: string
  voterId: string

  // Overall winner pick
  persuasivenessWinner: VoteChoice

  // Category votes
  betterLogic: CategoryVote
  betterEvidence: CategoryVote
  moreOnTopic: CategoryVote
  moreRespectful: CategoryVote

  // Mind change tracking
  changedMind: boolean
  previousStance: Side | 'neutral' | null
  newStance: Side | 'neutral' | null

  // Voter's judge score snapshot (for weighted tallying)
  voterJudgeScore: number

  createdAt: string
}

// --- Argument Reaction Types ---

export interface ArgumentReaction {
  id: string // composite: {userId}_{argumentId}
  argumentId: string
  userId: string
  reactionType: ArgumentReactionType
  createdAt: string
}

// --- Matchmaking Types ---

export interface MatchmakingQueueEntry {
  id: string
  userId: string
  username: string
  displayName: string | null
  rank: DebateRank
  rankPoints: number
  format: DebateFormat
  category: TopicCategory | null // null = any
  stance: 'for' | 'against' | 'either'
  topicId: string | null // null = any in category
  enqueuedAt: string
  status: MatchmakingStatus
  matchedDebateId: string | null
  rankRange: number // widens over time
}

// --- Challenge Types ---

export interface Challenge {
  id: string
  challengerId: string
  challengerUsername: string
  challengerDisplayName: string | null
  challengerRank: DebateRank

  challengedId: string
  challengedUsername: string
  challengedDisplayName: string | null
  challengedRank: DebateRank

  topicId: string
  topicName: string
  topicCategory: TopicCategory
  proposedTitle: string
  proposedPosition: string
  format: DebateFormat

  status: ChallengeStatus
  createdAt: string
  expiresAt: string
  respondedAt: string | null
  debateId: string | null
  message: string | null
}

// --- Debate Result Types ---

export interface ResultParticipant {
  uid: string
  username: string
  displayName: string | null
  rank: DebateRank
  avgAiScore: number
}

export interface RoundScore {
  roundNumber: number
  forScore: number
  againstScore: number
  forArgumentId: string
  againstArgumentId: string
}

export interface RankChange {
  uid: string
  username: string
  previousRank: DebateRank
  newRank: DebateRank
  pointsDelta: number
  isUpsetWin: boolean
}

export interface AiVerdict {
  winner: VoteChoice
  reasoning: string
  forStrengths: string[]
  againstStrengths: string[]
  forWeaknesses: string[]
  againstWeaknesses: string[]
}

export interface CrowdVerdict {
  winner: VoteChoice
  forVotes: number
  againstVotes: number
  drawVotes: number
  totalVoters: number
  totalWeightedVotes: number
  mindChangedCount: number
}

export interface DebateResult {
  debateId: string
  format: DebateFormat
  topicId: string
  topicName: string
  topicCategory: TopicCategory
  completedAt: string

  forTeam: ResultParticipant[]
  againstTeam: ResultParticipant[]

  roundScores: RoundScore[]
  forTotalScore: number
  againstTotalScore: number

  aiVerdict: AiVerdict
  crowdVerdict: CrowdVerdict
  overallWinner: VoteChoice

  rankChanges: RankChange[]
}

// --- Social Clip Types ---

export interface SocialClip {
  id: string
  debateId: string
  createdBy: string
  type: ClipType

  title: string
  hookText: string
  claimText: string
  counterText: string
  resultText: string

  argumentIds: string[]
  crowdVoteResult: string

  cardImageUrl: string | null
  cardTemplate: ClipTemplate

  debateTitle: string
  topicCategory: TopicCategory
  forUsername: string
  againstUsername: string
  createdAt: string
  shareCount: number

  // Video upload (Firebase Storage)
  videoUrl?: string | null
  // Social media import
  sourcePlatform?: 'youtube' | 'tiktok' | 'twitter' | 'instagram' | 'upload' | 'generated' | null
  sourceUrl?: string | null
  embedHtml?: string | null
}

// --- Moderator Action Types ---

export interface ModeratorAction {
  id: string
  debateId: string
  moderatorId: string
  actionType: ModeratorActionType
  roundNumber: number | null
  content: string
  createdAt: string
  isVisible: boolean
}

// --- Report Types ---

export interface Report {
  id: string
  targetType: ReportTargetType
  targetId: string
  reporterId: string
  reason: ReportReason
  details: string | null
  status: ReportStatus
  createdAt: string
  reviewedAt: string | null
  reviewedBy: string | null
  actionTaken: string | null
}

// --- Debate History Types ---

export interface DebateHistoryEntry {
  debateId: string
  format: DebateFormat
  role: 'proponent' | 'opponent' | 'teamMember' | 'openFloor' | 'devilsAdvocate'
  side: Side | null
  result: 'win' | 'loss' | 'draw' | 'pending' | null
  rankPointsDelta: number
  crowdVotePercent: number | null
  aiScoreAvg: number | null
  opponentRank: DebateRank | null
  completedAt: string | null
  participated: boolean
  shownAt: string
}

// --- Social Account Types (retained from v1) ---

export interface SocialAccount {
  id: string
  provider: string
  providerUserId: string
  lastSyncedAt: string | null
}
