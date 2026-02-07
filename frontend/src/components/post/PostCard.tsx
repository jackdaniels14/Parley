import { useState } from 'react'
import { formatDistanceToNow } from 'date-fns'
import { Card, StanceBadge, Button, Avatar } from '../common'
import { ChatBubbleIcon } from '../icons'
import ReplyForm from './ReplyForm'
import ReactionButtons from './ReactionButtons'
import type { Post } from '../../types'
import { useAuthStore } from '../../store/auth'
import clsx from 'clsx'

interface PostCardProps {
  post: Post
  replies?: Post[]
  debateId: string
  debateActive: boolean
  isReply?: boolean
}

const stanceRingColor: Record<string, string> = {
  support: 'ring-green-400',
  oppose: 'ring-red-400',
  mixed: 'ring-amber-400',
  agree: 'ring-green-400',
  disagree: 'ring-red-400',
  partial_agree: 'ring-amber-400',
  changed_mind: 'ring-purple-400',
}

export default function PostCard({
  post,
  replies = [],
  debateId,
  debateActive,
  isReply = false,
}: PostCardProps) {
  const [showReplies, setShowReplies] = useState(false)
  const [showReplyForm, setShowReplyForm] = useState(false)
  const { firebaseUser } = useAuthStore()

  const isOwnPost = firebaseUser?.uid === post.userId
  const timeAgo = formatDistanceToNow(new Date(post.createdAt), {
    addSuffix: true,
  })

  const displayName = post.user?.displayName || post.user?.username || 'Anonymous'

  const totalReactions =
    post.reactions.changedMindCount +
    post.reactions.goodPointCount +
    post.reactions.fairDisagreeCount

  return (
    <div className={clsx(isReply && 'ml-6 relative')}>
      {/* Thread line */}
      {isReply && <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-gray-200 dark:bg-gray-800 -ml-3" />}

      <Card padding="md" className="animate-fade-in">
        {/* Post header */}
        <div className="flex items-center gap-3 mb-3">
          <div className={clsx('ring-2 rounded-full', stanceRingColor[post.stance] || 'ring-gray-300')}>
            <Avatar name={displayName} size="sm" />
          </div>
          <div className="flex items-center gap-2 flex-wrap min-w-0">
            <span className="font-medium text-gray-900 dark:text-gray-100 hover:underline cursor-pointer">
              {displayName}
            </span>
            <StanceBadge stance={post.stance} />
            <span className="text-gray-400 dark:text-gray-500 text-sm">{timeAgo}</span>
          </div>
        </div>

        {/* Post content */}
        <div className="space-y-1.5 mb-3">
          <p className="text-gray-900 dark:text-gray-100 font-semibold">{post.position}</p>
          <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">{post.reasoning}</p>
        </div>

        {/* Reactions summary */}
        {totalReactions > 0 && (
          <div className="flex items-center gap-3 text-sm text-gray-500 dark:text-gray-400 mb-3">
            {post.reactions.changedMindCount > 0 && (
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-purple-400" />
                {post.reactions.changedMindCount} changed mind
              </span>
            )}
            {post.reactions.goodPointCount > 0 && (
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
                {post.reactions.goodPointCount} compelling
              </span>
            )}
            {post.reactions.fairDisagreeCount > 0 && (
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                {post.reactions.fairDisagreeCount} fair disagree
              </span>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-gray-800">
          <div className="flex items-center">
            {!isOwnPost && debateActive && (
              <ReactionButtons postId={post.id} debateId={debateId} />
            )}
          </div>

          <div className="flex items-center gap-2">
            {replies.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowReplies(!showReplies)}
              >
                <ChatBubbleIcon className="w-4 h-4 mr-1" />
                {showReplies ? 'Hide' : replies.length} {replies.length === 1 ? 'reply' : 'replies'}
              </Button>
            )}

            {debateActive && !isReply && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowReplyForm(!showReplyForm)}
              >
                <ChatBubbleIcon className="w-4 h-4 mr-1" />
                Reply
              </Button>
            )}
          </div>
        </div>
      </Card>

      {/* Reply form */}
      {showReplyForm && (
        <div className="mt-3 ml-6">
          <ReplyForm
            postId={post.id}
            debateId={debateId}
            onCancel={() => setShowReplyForm(false)}
            onSuccess={() => setShowReplyForm(false)}
          />
        </div>
      )}

      {/* Replies */}
      {showReplies && replies.length > 0 && (
        <div className="mt-3 space-y-3">
          {replies.map((reply) => (
            <PostCard
              key={reply.id}
              post={reply}
              debateId={debateId}
              debateActive={debateActive}
              isReply
            />
          ))}
        </div>
      )}
    </div>
  )
}
