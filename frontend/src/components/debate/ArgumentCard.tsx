import { useState, useEffect } from 'react'
import clsx from 'clsx'
import { formatDistanceToNow } from 'date-fns'
import RankBadge from '../common/RankBadge'
import { addArgumentReaction, removeArgumentReaction, getUserArgumentReaction } from '../../services/firestore'
import { useAuthStore } from '../../store/auth'
import type { Argument, ArgumentReactionType } from '../../types'

interface ArgumentCardProps {
  argument: Argument
  className?: string
}

const REACTIONS: { type: ArgumentReactionType; label: string; icon: string; countKey: keyof Argument['crowdReactions'] }[] = [
  { type: 'persuasive', label: 'Persuasive', icon: '💡', countKey: 'persuasiveCount' },
  { type: 'strongLogic', label: 'Logic', icon: '🧠', countKey: 'strongLogicCount' },
  { type: 'goodEvidence', label: 'Evidence', icon: '📊', countKey: 'goodEvidenceCount' },
  { type: 'respectful', label: 'Respectful', icon: '🤝', countKey: 'respectfulCount' },
]

export default function ArgumentCard({ argument, className }: ArgumentCardProps) {
  const user = useAuthStore((s) => s.user)
  const [activeReaction, setActiveReaction] = useState<ArgumentReactionType | null>(null)
  const [counts, setCounts] = useState({ ...argument.crowdReactions })

  useEffect(() => {
    if (!user) return
    getUserArgumentReaction(user.id, argument.id).then((r) => {
      if (r) setActiveReaction(r)
    })
  }, [user, argument.id])

  async function handleReaction(type: ArgumentReactionType) {
    if (!user) return
    if (activeReaction === type) {
      // Remove
      setActiveReaction(null)
      setCounts((prev) => ({ ...prev, [REACTIONS.find((r) => r.type === type)!.countKey]: Math.max(0, prev[REACTIONS.find((r) => r.type === type)!.countKey] - 1), totalReactions: Math.max(0, prev.totalReactions - 1) }))
      await removeArgumentReaction(user.id, argument.id)
    } else {
      // Add or switch
      const prevType = activeReaction
      setActiveReaction(type)
      setCounts((prev) => {
        const next = { ...prev }
        const newKey = REACTIONS.find((r) => r.type === type)!.countKey
        next[newKey] = prev[newKey] + 1
        if (prevType) {
          const oldKey = REACTIONS.find((r) => r.type === prevType)!.countKey
          next[oldKey] = Math.max(0, prev[oldKey] - 1)
        } else {
          next.totalReactions = prev.totalReactions + 1
        }
        return next
      })
      await addArgumentReaction(user.id, argument.id, type)
    }
  }

  const sideColor = argument.side === 'for'
    ? 'border-l-green-500'
    : 'border-l-red-500'

  const hasAiScores = argument.aiScores !== null

  return (
    <div className={clsx(
      'rounded-lg border border-gray-200 border-l-4 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800',
      sideColor,
      className
    )}>
      {/* Header: User + Rank + Time */}
      <div className="flex items-center gap-2 mb-3">
        <div className="h-8 w-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-sm font-bold text-gray-600 dark:text-gray-300">
          {(argument.userName || 'A')[0].toUpperCase()}
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="font-semibold text-sm text-gray-900 dark:text-white">
              {argument.userDisplayName || argument.userName}
            </span>
            <RankBadge rank={argument.userRank} size="sm" showLabel={false} />
          </div>
          <span className="text-xs text-gray-500">
            {formatDistanceToNow(new Date(argument.createdAt), { addSuffix: true })}
          </span>
        </div>
        {argument.acknowledgesOpponentPoint && (
          <span className="ml-auto rounded-full bg-purple-100 px-2 py-0.5 text-xs font-medium text-purple-700 dark:bg-purple-900/30 dark:text-purple-300">
            Concedes a point
          </span>
        )}
      </div>

      {/* Claim */}
      <div className="mb-3">
        <div className="text-xs font-medium uppercase tracking-wide text-gray-400 mb-1">Claim</div>
        <p className="text-base font-semibold text-gray-900 dark:text-white leading-snug">
          {argument.claim}
        </p>
      </div>

      {/* Reasoning */}
      <div className="mb-3">
        <div className="text-xs font-medium uppercase tracking-wide text-gray-400 mb-1">Reasoning</div>
        <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
          {argument.reasoning}
        </p>
      </div>

      {/* Evidence */}
      <div className="mb-3">
        <div className="text-xs font-medium uppercase tracking-wide text-gray-400 mb-1">Evidence</div>
        <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
          {argument.evidence}
        </p>
        {argument.sources.length > 0 && (
          <div className="mt-1 flex flex-wrap gap-1">
            {argument.sources.map((src, i) => (
              <a
                key={i}
                href={src}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-primary-600 hover:underline dark:text-primary-400"
              >
                [{i + 1}]
              </a>
            ))}
          </div>
        )}
      </div>

      {/* Concession */}
      {argument.concessionText && (
        <div className="mb-3 rounded-md bg-purple-50 px-3 py-2 dark:bg-purple-900/20">
          <div className="text-xs font-medium text-purple-700 dark:text-purple-300 mb-0.5">
            Acknowledges opponent:
          </div>
          <p className="text-sm text-purple-600 dark:text-purple-400 italic">
            "{argument.concessionText}"
          </p>
        </div>
      )}

      {/* AI Scores */}
      {hasAiScores && (
        <div className="flex flex-wrap gap-2 mb-3">
          <ScorePill label="Logic" score={argument.aiScores!.logicClarity} />
          <ScorePill label="Evidence" score={argument.aiScores!.evidenceQuality} />
          <ScorePill label="On Topic" score={argument.aiScores!.onTopic} />
          <ScorePill
            label="Overall"
            score={argument.aiScores!.overallScore}
            bold
          />
        </div>
      )}

      {/* Crowd Reactions */}
      <div className="flex items-center gap-1.5 flex-wrap mt-1">
        {REACTIONS.map(({ type, label, icon, countKey }) => {
          const count = counts[countKey]
          const isActive = activeReaction === type
          return (
            <button
              key={type}
              onClick={() => handleReaction(type)}
              className={clsx(
                'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium transition-all border',
                isActive
                  ? 'bg-primary-100 border-primary-300 text-primary-700 dark:bg-primary-900/30 dark:border-primary-600 dark:text-primary-300'
                  : 'border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800'
              )}
            >
              <span>{icon}</span>
              <span>{label}</span>
              {count > 0 && <span className="ml-0.5 opacity-70">{count}</span>}
            </button>
          )
        })}
      </div>
    </div>
  )
}

function ScorePill({ label, score, bold }: { label: string; score: number; bold?: boolean }) {
  const color =
    score >= 70 ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
    score >= 40 ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' :
    'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'

  return (
    <span className={clsx(
      'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs',
      color,
      bold && 'font-bold'
    )}>
      {label}: {score}
    </span>
  )
}
