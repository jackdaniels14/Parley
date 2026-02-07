// User types
export interface User {
  id: string
  email: string
  username: string
  displayName: string | null
  bio: string | null
  location: string | null
  website: string | null
  pronouns: string | null
  profileVisibility: 'public' | 'private'
  createdAt: string
  isActive: boolean
  isModerator: boolean
}

// Theme types
export type ThemeMode = 'light' | 'dark' | 'system'

// Notification preferences
export interface NotificationPreferences {
  replyNotifications: boolean
  reactionNotifications: boolean
  newDebateNotifications: boolean
  weeklyDigest: boolean
}

// Profile stats
export interface ProfileStats {
  debatesJoined: number
  opinionsShared: number
  reactionsReceived: number
}

export interface UserSummary {
  id: string
  username: string
  displayName: string | null
}

// Topic types
export interface Topic {
  id: string
  name: string
  slug: string
  category: string | null
  description: string | null
  isActive: boolean
}

export interface Category {
  name: string
  topicCount: number
}

// Preference types
export type Stance = 'love' | 'hate' | 'neutral'
export type Source = 'manual' | 'inferred'

export interface UserPreference {
  id: string
  topicId: string
  stance: Stance
  source: Source
  confidence: number
  createdAt: string
}

// Debate types
export interface Debate {
  id: string
  topicId: string
  title: string
  description: string | null
  createdAt: string
  expiresAt: string
  isActive: boolean
  participantCount: number
  topic: Topic | null
}

export interface DebateWithPosts extends Debate {
  posts: Post[]
}

// Post types
export type PostStance = 'support' | 'oppose' | 'mixed'
export type ReplyStance = 'disagree' | 'partial_agree' | 'changed_mind' | 'agree'

export interface ReactionSummary {
  changedMindCount: number
  goodPointCount: number
  fairDisagreeCount: number
}

export interface Post {
  id: string
  debateId: string
  userId: string
  parentId: string | null
  stance: PostStance | ReplyStance
  position: string
  reasoning: string
  createdAt: string
  isHidden: boolean
  user: UserSummary | null
  reactions: ReactionSummary
  replyCount: number
}

// Reaction types
export type ReactionType = 'changed_mind' | 'good_point' | 'fair_disagree'

export interface Reaction {
  id: string
  postId: string
  userId: string
  reactionType: ReactionType
  createdAt: string
}

// Social account types
export interface SocialAccount {
  id: string
  provider: string
  providerUserId: string
  lastSyncedAt: string | null
}
