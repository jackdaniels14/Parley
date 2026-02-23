import { useNavigate } from 'react-router-dom'
import type { Debate } from '../../types'
import { categoryBadgeColors } from '../../constants/categories'
import clsx from 'clsx'

interface LiveEventCardProps {
  debate: Debate
}

function StatusBadge({ debate }: { debate: Debate }) {
  if (debate.status === 'active') {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-bold text-red-400 bg-red-500/15 border border-red-500/30 px-2 py-0.5 rounded">
        <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
        LIVE NOW
      </span>
    )
  }
  if (debate.status === 'setup') {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded">
        <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
        Starting Soon
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 text-xs font-semibold text-gray-400 bg-gray-500/10 border border-gray-500/20 px-2 py-0.5 rounded">
      Scheduled
    </span>
  )
}

export default function LiveEventCard({ debate }: LiveEventCardProps) {
  const navigate = useNavigate()
  const categoryClass = categoryBadgeColors[debate.topicCategory] ?? 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'

  const forLeader = debate.forSide.teamMembers.find((m) => m.isLeader)
  const againstLeader = debate.againstSide.teamMembers.find((m) => m.isLeader)
  const forDisplay = forLeader?.displayName || forLeader?.username
  const againstDisplay = againstLeader?.displayName || againstLeader?.username

  const isActive = debate.status === 'active'

  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4 flex flex-col gap-3">
      {/* Header: status + category + round */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <StatusBadge debate={debate} />
        <div className="flex items-center gap-2">
          {isActive && debate.currentRound >= 0 && (
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
              Round {debate.currentRound + 1}/{debate.totalRounds}
            </span>
          )}
          <span className={clsx('text-xs font-medium px-2 py-0.5 rounded-full', categoryClass)}>
            {debate.topicCategory}
          </span>
        </div>
      </div>

      {/* Title */}
      <div>
        <p className="text-[10px] text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-0.5">
          {debate.topicName}
        </p>
        <h3 className="text-gray-900 dark:text-gray-100 font-semibold text-sm leading-snug line-clamp-2">
          {debate.title}
        </h3>
      </div>

      {/* Participants */}
      {(forDisplay || againstDisplay) && (
        <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
          <span className="font-medium text-gray-700 dark:text-gray-300 truncate max-w-[100px]">
            {forDisplay ? `@${forLeader?.username}` : 'TBD'}
          </span>
          <span className="text-gray-300 dark:text-gray-600 font-bold flex-shrink-0">vs</span>
          <span className="font-medium text-gray-700 dark:text-gray-300 truncate max-w-[100px]">
            {againstDisplay ? `@${againstLeader?.username}` : 'TBD'}
          </span>
          {debate.spectatorCount > 0 && (
            <>
              <span className="flex-1" />
              <span className="flex items-center gap-0.5 text-gray-400 flex-shrink-0">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                {debate.spectatorCount}
              </span>
            </>
          )}
        </div>
      )}

      {/* CTA */}
      <button
        onClick={() => navigate(`/debate/${debate.id}`)}
        className={clsx(
          'w-full py-2 rounded-lg text-sm font-semibold transition-colors mt-1',
          isActive
            ? 'bg-red-500 hover:bg-red-600 text-white'
            : 'bg-primary-600 hover:bg-primary-700 text-white dark:bg-violet-600 dark:hover:bg-violet-700'
        )}
      >
        {isActive ? 'Watch Live' : 'Join Debate'}
      </button>
    </div>
  )
}
