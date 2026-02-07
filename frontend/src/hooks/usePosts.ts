import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createPostFn, replyToPostFn, reportPostFn } from '../services/functions'
import { addReaction, removeReaction } from '../services/firestore'
import { useAuthStore } from '../store/auth'
import type { PostStance, ReplyStance, ReactionType } from '../types'

export function useCreatePost(debateId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      stance,
      position,
      reasoning,
    }: {
      stance: PostStance
      position: string
      reasoning: string
    }) => createPostFn({ debateId, stance, position, reasoning }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['debate', debateId] })
    },
  })
}

export function useReplyToPost(debateId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      postId,
      stance,
      position,
      reasoning,
    }: {
      postId: string
      stance: ReplyStance
      position: string
      reasoning: string
    }) => replyToPostFn({ postId, stance, position, reasoning }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['debate', debateId] })
    },
  })
}

export function useReactToPost(debateId: string) {
  const queryClient = useQueryClient()
  const { firebaseUser } = useAuthStore()

  return useMutation({
    mutationFn: ({
      postId,
      reactionType,
    }: {
      postId: string
      reactionType: ReactionType
    }) => {
      if (!firebaseUser) throw new Error('Not authenticated')
      return addReaction(firebaseUser.uid, postId, reactionType)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['debate', debateId] })
    },
  })
}

export function useRemoveReaction(debateId: string) {
  const queryClient = useQueryClient()
  const { firebaseUser } = useAuthStore()

  return useMutation({
    mutationFn: (postId: string) => {
      if (!firebaseUser) throw new Error('Not authenticated')
      return removeReaction(firebaseUser.uid, postId)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['debate', debateId] })
    },
  })
}

export function useReportPost() {
  return useMutation({
    mutationFn: ({
      postId,
      reason,
      details,
    }: {
      postId: string
      reason: string
      details?: string
    }) => reportPostFn({ postId, reason, details }),
  })
}
