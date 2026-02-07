import { useState, useEffect } from 'react'
import { useReactToPost, useRemoveReaction } from '../../hooks'
import { getUserReaction } from '../../services/firestore'
import { useAuthStore } from '../../store/auth'
import { LightbulbIcon, ThumbsUpIcon, ScaleIcon } from '../icons'
import type { ReactionType } from '../../types'
import clsx from 'clsx'

interface ReactionButtonsProps {
  postId: string
  debateId: string
}

const reactions: { type: ReactionType; label: string; icon: typeof LightbulbIcon; color: string; activeColor: string; hoverBg: string; activeBg: string }[] = [
  { type: 'changed_mind', label: 'Changed my mind', icon: LightbulbIcon, color: 'text-purple-600', activeColor: 'text-white', hoverBg: 'hover:bg-purple-50', activeBg: 'bg-purple-600' },
  { type: 'good_point', label: 'Good point', icon: ThumbsUpIcon, color: 'text-green-600', activeColor: 'text-white', hoverBg: 'hover:bg-green-50', activeBg: 'bg-green-600' },
  { type: 'fair_disagree', label: 'Fair, but disagree', icon: ScaleIcon, color: 'text-amber-600', activeColor: 'text-white', hoverBg: 'hover:bg-amber-50', activeBg: 'bg-amber-600' },
]

export default function ReactionButtons({
  postId,
  debateId,
}: ReactionButtonsProps) {
  const { firebaseUser } = useAuthStore()
  const reactMutation = useReactToPost(debateId)
  const removeMutation = useRemoveReaction(debateId)
  const [activeReaction, setActiveReaction] = useState<ReactionType | null>(null)

  useEffect(() => {
    if (!firebaseUser) return
    getUserReaction(firebaseUser.uid, postId).then(setActiveReaction)
  }, [firebaseUser, postId])

  const handleReact = (type: ReactionType) => {
    if (!firebaseUser) return

    if (activeReaction === type) {
      setActiveReaction(null)
      removeMutation.mutate(postId)
    } else {
      setActiveReaction(type)
      reactMutation.mutate({ postId, reactionType: type })
    }
  }

  const isPending = reactMutation.isPending || removeMutation.isPending

  return (
    <div className="flex items-center gap-1">
      {reactions.map((reaction) => {
        const isActive = activeReaction === reaction.type
        return (
          <button
            key={reaction.type}
            onClick={() => handleReact(reaction.type)}
            disabled={isPending}
            title={reaction.label}
            className={clsx(
              'inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-sm transition-all',
              'active:scale-95 disabled:opacity-50',
              isActive
                ? `${reaction.activeBg} ${reaction.activeColor}`
                : `${reaction.color} ${reaction.hoverBg}`
            )}
          >
            <reaction.icon className="w-4 h-4" />
            <span className="hidden sm:inline text-xs font-medium">{reaction.label}</span>
          </button>
        )
      })}
    </div>
  )
}
