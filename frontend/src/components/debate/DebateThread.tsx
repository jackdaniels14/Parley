import { useState, useMemo } from 'react'
import { formatDistanceToNow } from 'date-fns'
import type { DebateWithPosts, Post as PostType } from '../../types'
import PostCard from '../post/PostCard'
import PostComposer from '../post/PostComposer'
import { Card, Avatar } from '../common'
import { UsersIcon, ChatBubbleIcon, ClockIcon } from '../icons'
import { onDebatePostsSnapshot } from '../../services/firestore'
import { categoryGradients } from '../../constants/categories'
import { useAuthStore } from '../../store/auth'
import { useEffect } from 'react'
import clsx from 'clsx'

interface DebateThreadProps {
  debate: DebateWithPosts
}

type PostSort = 'newest' | 'reactions'

export default function DebateThread({ debate }: DebateThreadProps) {
  const [showComposer, setShowComposer] = useState(false)
  const [livePosts, setLivePosts] = useState<PostType[]>(debate.posts)
  const [postSort, setPostSort] = useState<PostSort>('newest')
  const { user } = useAuthStore()

  useEffect(() => {
    setLivePosts(debate.posts)
    const unsubscribe = onDebatePostsSnapshot(debate.id, (posts) => {
      setLivePosts(posts)
    })
    return () => unsubscribe()
  }, [debate.id, debate.posts])

  // Organize posts into tree structure
  const topLevelPosts = useMemo(() => {
    const top = livePosts.filter((p) => !p.parentId)
    if (postSort === 'reactions') {
      return [...top].sort((a, b) => {
        const aTotal = a.reactions.changedMindCount + a.reactions.goodPointCount + a.reactions.fairDisagreeCount
        const bTotal = b.reactions.changedMindCount + b.reactions.goodPointCount + b.reactions.fairDisagreeCount
        return bTotal - aTotal
      })
    }
    return [...top].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  }, [livePosts, postSort])

  const repliesMap = useMemo(() => {
    const map = new Map<string, PostType[]>()
    livePosts.forEach((post) => {
      if (post.parentId) {
        const replies = map.get(post.parentId) || []
        replies.push(post)
        map.set(post.parentId, replies)
      }
    })
    return map
  }, [livePosts])

  // Stance distribution
  const stanceStats = useMemo(() => {
    const topPosts = livePosts.filter((p) => !p.parentId)
    const total = topPosts.length || 1
    const support = topPosts.filter((p) => p.stance === 'support').length
    const oppose = topPosts.filter((p) => p.stance === 'oppose').length
    const mixed = topPosts.filter((p) => p.stance === 'mixed').length
    return {
      support: Math.round((support / total) * 100),
      oppose: Math.round((oppose / total) * 100),
      mixed: Math.round((mixed / total) * 100),
    }
  }, [livePosts])

  const expiresIn = formatDistanceToNow(new Date(debate.expiresAt), {
    addSuffix: true,
  })

  const gradient = debate.topic?.category
    ? categoryGradients[debate.topic.category] || 'from-gray-500 to-gray-600'
    : 'from-gray-500 to-gray-600'

  const displayName = user?.displayName || user?.username || 'User'

  return (
    <div className="space-y-4">
      {/* Debate header */}
      <Card padding="none" className="overflow-hidden">
        <div className={`bg-gradient-to-r ${gradient} px-6 py-4`}>
          {debate.topic && (
            <div className="text-white/80 text-sm font-medium mb-1">
              {debate.topic.category} / {debate.topic.name}
            </div>
          )}
          <h1 className="text-xl font-bold text-white">{debate.title}</h1>
        </div>

        <div className="p-4 space-y-4">
          {debate.description && (
            <p className="text-gray-600 dark:text-gray-400">{debate.description}</p>
          )}

          {/* Stance distribution bar */}
          {livePosts.filter((p) => !p.parentId).length > 0 && (
            <div className="space-y-1.5">
              <div className="flex h-2 rounded-full overflow-hidden">
                <div className="bg-green-500 transition-all" style={{ width: `${stanceStats.support}%` }} />
                <div className="bg-amber-500 transition-all" style={{ width: `${stanceStats.mixed}%` }} />
                <div className="bg-red-500 transition-all" style={{ width: `${stanceStats.oppose}%` }} />
              </div>
              <div className="flex justify-between text-xs text-gray-500">
                <span>{stanceStats.support}% Support</span>
                <span>{stanceStats.mixed}% Mixed</span>
                <span>{stanceStats.oppose}% Oppose</span>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between pt-3 border-t border-gray-200">
            <div className="flex items-center gap-4 text-sm text-gray-500">
              <span className="flex items-center gap-1.5">
                <UsersIcon className="w-4 h-4" />
                {debate.participantCount} participants
              </span>
              <span className="flex items-center gap-1.5">
                <ChatBubbleIcon className="w-4 h-4" />
                {livePosts.length} opinions
              </span>
            </div>

            <div className="text-sm font-medium text-gray-500 flex items-center gap-1.5">
              <ClockIcon className="w-4 h-4" />
              {debate.isActive ? (
                <>Expires {expiresIn}</>
              ) : (
                <span className="text-red-600">Debate ended</span>
              )}
            </div>
          </div>
        </div>
      </Card>

      {/* Add opinion button */}
      {debate.isActive && !showComposer && (
        <button
          onClick={() => setShowComposer(true)}
          className="w-full flex items-center gap-3 p-4 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-500 hover:border-primary-400 hover:text-primary-600 dark:hover:border-violet-400 dark:hover:text-violet-400 transition-colors"
        >
          <Avatar name={displayName} size="sm" />
          <span className="text-sm">Share your opinion...</span>
        </button>
      )}

      {/* Post composer */}
      {showComposer && (
        <PostComposer
          debateId={debate.id}
          onCancel={() => setShowComposer(false)}
          onSuccess={() => setShowComposer(false)}
        />
      )}

      {/* Sort controls */}
      {topLevelPosts.length > 0 && (
        <div className="flex items-center gap-2 text-sm">
          <span className="text-gray-500 font-medium">Sort by:</span>
          <button
            onClick={() => setPostSort('newest')}
            className={clsx(
              'px-2 py-1 rounded-md transition-colors',
              postSort === 'newest' ? 'bg-gray-100 text-gray-900 font-medium' : 'text-gray-500 hover:text-gray-700'
            )}
          >
            Newest
          </button>
          <button
            onClick={() => setPostSort('reactions')}
            className={clsx(
              'px-2 py-1 rounded-md transition-colors',
              postSort === 'reactions' ? 'bg-gray-100 text-gray-900 font-medium' : 'text-gray-500 hover:text-gray-700'
            )}
          >
            Most Reactions
          </button>
        </div>
      )}

      {/* Posts */}
      <div className="space-y-4">
        {topLevelPosts.length === 0 ? (
          <Card className="text-center py-8">
            <p className="text-gray-500">
              No opinions yet. Be the first to share your thoughts!
            </p>
          </Card>
        ) : (
          topLevelPosts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              replies={repliesMap.get(post.id) || []}
              debateId={debate.id}
              debateActive={debate.isActive}
            />
          ))
        )}
      </div>
    </div>
  )
}
