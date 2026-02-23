import { httpsCallable } from 'firebase/functions'
import { functions } from '../lib/firebase'
import type {
  Debate,
  Argument,
  DebateFormat,
  TopicCategory,
} from '../types'

// ============================================================
// Auth
// ============================================================

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

// ============================================================
// Debates
// ============================================================

export async function createDebateFn(data: {
  topicId: string
  title: string
  description?: string
  format: DebateFormat
  totalRounds?: number
  wordLimit?: number
  timePerRound?: number
  position: string
  side: 'for' | 'against'
}): Promise<Debate> {
  const fn = httpsCallable(functions, 'createDebate')
  const result = await fn(data)
  return result.data as Debate
}

export async function joinDebateFn(data: {
  debateId: string
  side: 'for' | 'against'
  position?: string
}): Promise<{ success: boolean; side: string; role: string }> {
  const fn = httpsCallable(functions, 'joinDebate')
  const result = await fn(data)
  return result.data as { success: boolean; side: string; role: string }
}

export async function startDebateFn(debateId: string): Promise<{ success: boolean }> {
  const fn = httpsCallable(functions, 'startDebate')
  const result = await fn({ debateId })
  return result.data as { success: boolean }
}

export async function advanceRoundFn(debateId: string): Promise<{ success: boolean }> {
  const fn = httpsCallable(functions, 'advanceRound')
  const result = await fn({ debateId })
  return result.data as { success: boolean }
}

export async function finalizeDebateFn(debateId: string): Promise<{
  success: boolean
  overallWinner: string
}> {
  const fn = httpsCallable(functions, 'finalizeDebate')
  const result = await fn({ debateId })
  return result.data as { success: boolean; overallWinner: string }
}

export async function cancelDebateFn(
  debateId: string,
  reason?: string
): Promise<{ success: boolean }> {
  const fn = httpsCallable(functions, 'cancelDebate')
  const result = await fn({ debateId, reason })
  return result.data as { success: boolean }
}

// ============================================================
// Arguments
// ============================================================

export async function submitArgumentFn(data: {
  debateId: string
  claim: string
  reasoning: string
  evidence: string
  sources?: string[]
  acknowledgesOpponentPoint?: boolean
  concessionText?: string
  rebuttalTargetId?: string
}): Promise<Argument> {
  const fn = httpsCallable(functions, 'submitArgument')
  const result = await fn(data)
  return result.data as Argument
}

// ============================================================
// Matchmaking
// ============================================================

export async function enqueueForMatchFn(data: {
  format: DebateFormat
  category?: TopicCategory
  topicId?: string
  stance: 'for' | 'against' | 'either'
}): Promise<{ queueEntryId: string; success: boolean }> {
  const fn = httpsCallable(functions, 'enqueueForMatch')
  const result = await fn(data)
  return result.data as { queueEntryId: string; success: boolean }
}

export async function dequeueFromMatchFn(
  queueEntryId: string
): Promise<{ success: boolean }> {
  const fn = httpsCallable(functions, 'dequeueFromMatch')
  const result = await fn({ queueEntryId })
  return result.data as { success: boolean }
}

// ============================================================
// Challenges
// ============================================================

export async function issueChallengeFn(data: {
  challengedUserId: string
  topicId: string
  proposedTitle: string
  proposedPosition: string
  format?: DebateFormat
  message?: string
}): Promise<{ challengeId: string; success: boolean }> {
  const fn = httpsCallable(functions, 'issueChallenge')
  const result = await fn(data)
  return result.data as { challengeId: string; success: boolean }
}

export async function respondToChallengeFn(data: {
  challengeId: string
  response: 'accept' | 'decline'
  counterPosition?: string
}): Promise<{ success: boolean; debateId: string | null }> {
  const fn = httpsCallable(functions, 'respondToChallenge')
  const result = await fn(data)
  return result.data as { success: boolean; debateId: string | null }
}

// ============================================================
// Topics
// ============================================================

export async function manageTopicFn(data: {
  action: 'create' | 'update'
  slug: string
  name?: string
  category?: TopicCategory
  description?: string
  isActive?: boolean
}): Promise<Record<string, unknown>> {
  const fn = httpsCallable(functions, 'manageTopic')
  const result = await fn(data)
  return result.data as Record<string, unknown>
}

// ============================================================
// Moderation
// ============================================================

export async function reportContentFn(data: {
  targetType: 'argument' | 'user' | 'debate' | 'clip'
  targetId: string
  reason: string
  details?: string
}): Promise<{ id: string; success: boolean }> {
  const fn = httpsCallable(functions, 'reportContent')
  const result = await fn(data)
  return result.data as { id: string; success: boolean }
}

export async function actionReportFn(data: {
  reportId: string
  status: 'reviewed' | 'actioned' | 'dismissed'
  hideContent?: boolean
  actionTaken?: string
}): Promise<{ success: boolean }> {
  const fn = httpsCallable(functions, 'actionReport')
  const result = await fn(data)
  return result.data as { success: boolean }
}

export async function moderateDebateFn(data: {
  debateId: string
  actionType: string
  content: string
  roundNumber?: number
}): Promise<{ id: string; success: boolean }> {
  const fn = httpsCallable(functions, 'moderateDebate')
  const result = await fn(data)
  return result.data as { id: string; success: boolean }
}

export async function contentCheckFn(
  text: string
): Promise<{ ok: boolean; reason?: string }> {
  const fn = httpsCallable(functions, 'contentCheck')
  const result = await fn({ text })
  return result.data as { ok: boolean; reason?: string }
}

// ============================================================
// Clips
// ============================================================

export async function processVideoClipsFn(clipId: string): Promise<{
  suggestions: Array<{ startTime: number; endTime: number; hookText: string; reason: string }>
}> {
  const fn = httpsCallable(functions, 'processVideoClips')
  const result = await fn({ clipId })
  return result.data as {
    suggestions: Array<{ startTime: number; endTime: number; hookText: string; reason: string }>
  }
}

export async function fetchOEmbedFn(url: string): Promise<{
  platform: string
  title: string
  authorName: string
  thumbnailUrl: string | null
  embedHtml: string | null
}> {
  const fn = httpsCallable(functions, 'fetchOEmbed')
  const result = await fn({ url })
  return result.data as {
    platform: string
    title: string
    authorName: string
    thumbnailUrl: string | null
    embedHtml: string | null
  }
}
