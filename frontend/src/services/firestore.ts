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
  onSnapshot,
  Timestamp,
  type Unsubscribe,
} from 'firebase/firestore'
import { db } from '../lib/firebase'
import type {
  User,
  Topic,
  Category,
  UserPreference,
  Debate,
  DebateWithPosts,
  Post,
  SocialAccount,
  Stance,
  ReactionType,
  NotificationPreferences,
  ProfileStats,
} from '../types'

// --- Users ---

export async function getUser(uid: string): Promise<User | null> {
  const snap = await getDoc(doc(db, 'users', uid))
  if (!snap.exists()) return null
  const data = snap.data()
  return {
    id: snap.id,
    email: data.email,
    username: data.username,
    displayName: data.displayName || null,
    bio: data.bio || null,
    location: data.location || null,
    website: data.website || null,
    pronouns: data.pronouns || null,
    profileVisibility: data.profileVisibility || 'public',
    createdAt: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
    isActive: data.isActive ?? true,
    isModerator: data.isModerator ?? false,
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
    profileVisibility?: 'public' | 'private'
    isActive?: boolean
  }
): Promise<void> {
  await updateDoc(doc(db, 'users', uid), updates)
}

export async function checkUsernameAvailable(username: string): Promise<boolean> {
  const snap = await getDoc(doc(db, 'usernames', username.toLowerCase()))
  return !snap.exists()
}

// --- Topics ---

export async function listTopics(category?: string): Promise<Topic[]> {
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
  return snap.docs.map((d) => {
    const data = d.data()
    return {
      id: d.id,
      name: data.name,
      slug: data.slug,
      category: data.category || null,
      description: data.description || null,
      isActive: data.isActive,
    }
  })
}

export async function getTopicBySlug(slug: string): Promise<Topic | null> {
  const q = query(collection(db, 'topics'), where('slug', '==', slug))
  const snap = await getDocs(q)
  if (snap.empty) return null
  const d = snap.docs[0]
  const data = d.data()
  return {
    id: d.id,
    name: data.name,
    slug: data.slug,
    category: data.category || null,
    description: data.description || null,
    isActive: data.isActive,
  }
}

export async function getCategories(): Promise<Category[]> {
  const topics = await listTopics()
  const counts: Record<string, number> = {}
  for (const topic of topics) {
    if (topic.category) {
      counts[topic.category] = (counts[topic.category] || 0) + 1
    }
  }
  return Object.entries(counts)
    .map(([name, topicCount]) => ({ name, topicCount }))
    .sort((a, b) => a.name.localeCompare(b.name))
}

// --- Preferences ---

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
      createdAt: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
    }
  })
}

export async function createPreference(
  uid: string,
  topicId: string,
  stance: Stance
): Promise<void> {
  await setDoc(doc(db, 'users', uid, 'preferences', topicId), {
    stance,
    source: 'manual',
    confidence: 1.0,
    createdAt: Timestamp.now(),
  })
}

export async function deletePreference(
  uid: string,
  topicId: string
): Promise<void> {
  await deleteDoc(doc(db, 'users', uid, 'preferences', topicId))
}

// --- Debates ---

export async function getDebateById(debateId: string): Promise<Debate | null> {
  const snap = await getDoc(doc(db, 'debates', debateId))
  if (!snap.exists()) return null
  return mapDebateDoc(snap.id, snap.data())
}

export async function getDebateWithPosts(debateId: string): Promise<DebateWithPosts | null> {
  const debate = await getDebateById(debateId)
  if (!debate) return null

  const postsSnap = await getDocs(
    query(
      collection(db, 'posts'),
      where('debateId', '==', debateId),
      where('isHidden', '==', false),
      orderBy('createdAt', 'asc')
    )
  )

  const posts: Post[] = postsSnap.docs.map((d) => mapPostDoc(d.id, d.data()))

  return { ...debate, posts }
}

export function onDebatePostsSnapshot(
  debateId: string,
  callback: (posts: Post[]) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  const q = query(
    collection(db, 'posts'),
    where('debateId', '==', debateId),
    where('isHidden', '==', false),
    orderBy('createdAt', 'asc')
  )

  return onSnapshot(
    q,
    (snap) => {
      const posts = snap.docs.map((d) => mapPostDoc(d.id, d.data()))
      callback(posts)
    },
    (error) => {
      console.error('Debate posts snapshot error:', error)
      onError?.(error)
    }
  )
}

// --- Social Accounts ---

export async function listSocialAccounts(uid: string): Promise<SocialAccount[]> {
  const snap = await getDocs(collection(db, 'users', uid, 'socialAccounts'))
  return snap.docs.map((d) => {
    const data = d.data()
    return {
      id: d.id,
      provider: d.id,
      providerUserId: data.providerUserId || '',
      lastSyncedAt: data.lastSyncedAt?.toDate?.()?.toISOString() || null,
    }
  })
}

// --- Reactions (direct client writes, backed by security rules) ---

export async function addReaction(
  userId: string,
  postId: string,
  reactionType: ReactionType
): Promise<void> {
  const reactionId = `${userId}_${postId}`
  await setDoc(doc(db, 'reactions', reactionId), {
    postId,
    userId,
    reactionType,
    createdAt: Timestamp.now(),
  })
}

export async function getUserReaction(
  userId: string,
  postId: string
): Promise<ReactionType | null> {
  const reactionId = `${userId}_${postId}`
  const snap = await getDoc(doc(db, 'reactions', reactionId))
  if (!snap.exists()) return null
  return snap.data().reactionType as ReactionType
}

export async function removeReaction(
  userId: string,
  postId: string
): Promise<void> {
  const reactionId = `${userId}_${postId}`
  await deleteDoc(doc(db, 'reactions', reactionId))
}

// --- Notification Preferences ---

export async function getNotificationPreferences(uid: string): Promise<NotificationPreferences> {
  const snap = await getDoc(doc(db, 'users', uid, 'settings', 'notifications'))
  if (!snap.exists()) {
    return {
      replyNotifications: true,
      reactionNotifications: true,
      newDebateNotifications: true,
      weeklyDigest: false,
    }
  }
  const data = snap.data()
  return {
    replyNotifications: data.replyNotifications ?? true,
    reactionNotifications: data.reactionNotifications ?? true,
    newDebateNotifications: data.newDebateNotifications ?? true,
    weeklyDigest: data.weeklyDigest ?? false,
  }
}

export async function updateNotificationPreferences(
  uid: string,
  prefs: Partial<NotificationPreferences>
): Promise<void> {
  await setDoc(doc(db, 'users', uid, 'settings', 'notifications'), prefs, { merge: true })
}

// --- Blocked Users ---

export async function getBlockedUsers(uid: string): Promise<string[]> {
  const snap = await getDoc(doc(db, 'users', uid, 'settings', 'privacy'))
  if (!snap.exists()) return []
  return (snap.data().blockedUsers as string[]) || []
}

export async function updateBlockedUsers(uid: string, ids: string[]): Promise<void> {
  await setDoc(doc(db, 'users', uid, 'settings', 'privacy'), { blockedUsers: ids }, { merge: true })
}

// --- Profile Stats ---

export async function getProfileStats(uid: string): Promise<ProfileStats> {
  const postsSnap = await getDocs(
    query(
      collection(db, 'posts'),
      where('userId', '==', uid),
      where('isHidden', '==', false)
    )
  )

  const debateIds = new Set<string>()
  let reactionsReceived = 0

  postsSnap.docs.forEach((d) => {
    const data = d.data()
    debateIds.add(data.debateId as string)
    const rc = (data.reactionCounts || {}) as Record<string, number>
    reactionsReceived += (rc.changedMindCount || 0) + (rc.goodPointCount || 0) + (rc.fairDisagreeCount || 0)
  })

  return {
    debatesJoined: debateIds.size,
    opinionsShared: postsSnap.docs.length,
    reactionsReceived,
  }
}

// --- User Posts ---

export async function getUserPosts(uid: string): Promise<Post[]> {
  const snap = await getDocs(
    query(
      collection(db, 'posts'),
      where('userId', '==', uid),
      where('isHidden', '==', false),
      orderBy('createdAt', 'desc')
    )
  )
  return snap.docs.map((d) => mapPostDoc(d.id, d.data()))
}

// --- Helpers ---

function mapDebateDoc(id: string, data: Record<string, unknown>): Debate {
  const d = data as Record<string, unknown>
  return {
    id,
    topicId: d.topicId as string,
    title: d.title as string,
    description: (d.description as string) || null,
    createdAt: tsToISO(d.createdAt),
    expiresAt: tsToISO(d.expiresAt),
    isActive: d.isActive as boolean,
    participantCount: (d.participantCount as number) || 0,
    topic: {
      id: d.topicId as string,
      name: (d.topicName as string) || '',
      slug: (d.topicSlug as string) || '',
      category: (d.topicCategory as string) || null,
      description: null,
      isActive: true,
    },
  }
}

function mapPostDoc(id: string, data: Record<string, unknown>): Post {
  const d = data as Record<string, unknown>
  const rc = (d.reactionCounts || {}) as Record<string, number>
  return {
    id,
    debateId: d.debateId as string,
    userId: d.userId as string,
    parentId: (d.parentId as string) || null,
    stance: d.stance as Post['stance'],
    position: d.position as string,
    reasoning: d.reasoning as string,
    createdAt: tsToISO(d.createdAt),
    isHidden: (d.isHidden as boolean) || false,
    user: {
      id: d.userId as string,
      username: (d.userName as string) || 'Anonymous',
      displayName: (d.userDisplayName as string) || null,
    },
    reactions: {
      changedMindCount: rc.changedMindCount || 0,
      goodPointCount: rc.goodPointCount || 0,
      fairDisagreeCount: rc.fairDisagreeCount || 0,
    },
    replyCount: (d.replyCount as number) || 0,
  }
}

function tsToISO(val: unknown): string {
  if (val && typeof val === 'object' && 'toDate' in val) {
    return (val as { toDate: () => Date }).toDate().toISOString()
  }
  if (typeof val === 'string') return val
  return new Date().toISOString()
}
