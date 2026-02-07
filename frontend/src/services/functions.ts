import { httpsCallable } from 'firebase/functions'
import { functions } from '../lib/firebase'
import type { Debate, Post } from '../types'

// Auth
export async function registerUsername(
  username: string,
  displayName?: string
): Promise<{ success: boolean; username: string }> {
  const fn = httpsCallable<
    { username: string; displayName?: string },
    { success: boolean; username: string }
  >(functions, 'registerUsername')
  const result = await fn({ username, displayName })
  return result.data
}

// Debates
export async function getDailyDebates(): Promise<Debate[]> {
  const fn = httpsCallable<void, Record<string, unknown>[]>(functions, 'getDailyDebates')
  const result = await fn()
  // Map the returned data to ensure proper Debate shape
  return result.data.map((d) => ({
    id: d.id as string,
    topicId: d.topicId as string,
    title: d.title as string,
    description: (d.description as string) || null,
    createdAt: d.createdAt as string,
    expiresAt: d.expiresAt as string,
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
  }))
}

export async function createDebateFn(data: {
  topicId: string
  title: string
  description?: string
  durationHours?: number
}): Promise<Debate> {
  const fn = httpsCallable(functions, 'createDebate')
  const result = await fn(data)
  return result.data as Debate
}

// Posts
export async function createPostFn(data: {
  debateId: string
  stance: string
  position: string
  reasoning: string
}): Promise<Post> {
  const fn = httpsCallable(functions, 'createPost')
  const result = await fn(data)
  return result.data as Post
}

export async function replyToPostFn(data: {
  postId: string
  stance: string
  position: string
  reasoning: string
}): Promise<Post> {
  const fn = httpsCallable(functions, 'replyToPost')
  const result = await fn(data)
  return result.data as Post
}

// Topics
export async function manageTopicFn(data: {
  action: 'create' | 'update'
  slug: string
  name?: string
  category?: string
  description?: string
  isActive?: boolean
}): Promise<Record<string, unknown>> {
  const fn = httpsCallable(functions, 'manageTopic')
  const result = await fn(data)
  return result.data as Record<string, unknown>
}

// Moderation
export async function reportPostFn(data: {
  postId: string
  reason: string
  details?: string
}): Promise<{ id: string; success: boolean }> {
  const fn = httpsCallable<
    { postId: string; reason: string; details?: string },
    { id: string; success: boolean }
  >(functions, 'reportPost')
  const result = await fn(data)
  return result.data
}

export async function actionReportFn(data: {
  reportId: string
  status: 'reviewed' | 'actioned'
  hidePost?: boolean
}): Promise<{ success: boolean }> {
  const fn = httpsCallable(functions, 'actionReport')
  const result = await fn(data)
  return result.data as { success: boolean }
}

// Social
export async function syncSocialAccountFn(
  provider: string
): Promise<{ success: boolean; lastSyncedAt: string }> {
  const fn = httpsCallable(functions, 'syncSocialAccount')
  const result = await fn({ provider })
  return result.data as { success: boolean; lastSyncedAt: string }
}

export async function getSuggestedPreferencesFn(): Promise<
  Array<{
    topicId: string
    stance: string
    source: string
    confidence: number
  }>
> {
  const fn = httpsCallable(functions, 'getSuggestedPreferences')
  const result = await fn()
  return result.data as Array<{
    topicId: string
    stance: string
    source: string
    confidence: number
  }>
}
