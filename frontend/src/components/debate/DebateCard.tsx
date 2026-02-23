import { Link } from 'react-router-dom'
import { formatDistanceToNow } from 'date-fns'
import { Card } from '../common'
import FormatBadge from '../common/FormatBadge'
import StatusBadge from '../common/StatusBadge'
import RankBadge from '../common/RankBadge'
import { categoryBadgeColors } from '../../constants/categories'
import type { Debate, TopicCategory } from '../../types'

interface DebateCardProps {
  debate: Debate
}

export default function DebateCard({ debate }: DebateCardProps) {
  const timeLabel =
    debate.status === 'completed'
      ? `Ended ${formatDistanceToNow(new Date(debate.completedAt || debate.expiresAt), { addSuffix: true })}`
      : debate.status === 'setup'
        ? `Expires ${formatDistanceToNow(new Date(debate.expiresAt), { addSuffix: true })}`
        : `Round ${debate.currentRound + 1}/${debate.totalRounds}`

  const badgeClass = categoryBadgeColors[debate.topicCategory as TopicCategory] || 'bg-gray-100 text-gray-700'

  const forMembers = debate.forSide.teamMembers
  const againstMembers = debate.againstSide.teamMembers

  return (
    <Link to={`/debate/${debate.id}`} className="block">
      <Card hover className="cursor-pointer">
        <div className="space-y-3">
          {/* Top row: Category + Format + Status */}
          <div className="flex flex-wrap items-center gap-2">
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${badgeClass}`}>
              {debate.topicName}
            </span>
            <FormatBadge format={debate.format} />
            <StatusBadge status={debate.status} />
          </div>

          {/* Title */}
          <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 leading-tight">
            {debate.title}
          </h3>

          {/* Sides preview */}
          <div className="flex items-center gap-3 text-sm">
            {/* FOR side */}
            <div className="flex items-center gap-1.5">
              <span className="inline-block h-3 w-3 rounded-full bg-green-500" />
              <span className="font-medium text-green-700 dark:text-green-400">FOR</span>
              {forMembers.length > 0 && (
                <span className="text-gray-600 dark:text-gray-400">
                  {forMembers.map((m) => m.username).join(', ')}
                </span>
              )}
              {forMembers[0] && <RankBadge rank={forMembers[0].rank} showLabel={false} size="sm" />}
              {forMembers.length === 0 && (
                <span className="italic text-gray-400">Open</span>
              )}
            </div>

            <span className="font-bold text-gray-400">vs</span>

            {/* AGAINST side */}
            <div className="flex items-center gap-1.5">
              <span className="inline-block h-3 w-3 rounded-full bg-red-500" />
              <span className="font-medium text-red-700 dark:text-red-400">AGAINST</span>
              {againstMembers.length > 0 && (
                <span className="text-gray-600 dark:text-gray-400">
                  {againstMembers.map((m) => m.username).join(', ')}
                </span>
              )}
              {againstMembers[0] && <RankBadge rank={againstMembers[0].rank} showLabel={false} size="sm" />}
              {againstMembers.length === 0 && (
                <span className="italic text-gray-400">Open</span>
              )}
            </div>
          </div>

          {/* Bottom row: Round progress, spectators, time */}
          <div className="flex items-center gap-4 pt-1 text-xs text-gray-500 dark:text-gray-400">
            {/* Round progress */}
            <div className="flex items-center gap-1">
              {Array.from({ length: debate.totalRounds }).map((_, i) => (
                <div
                  key={i}
                  className={`h-1.5 w-4 rounded-full ${
                    i < debate.currentRound + 1
                      ? 'bg-primary-500'
                      : i === debate.currentRound + 1 && debate.status === 'active'
                        ? 'bg-primary-300 animate-pulse'
                        : 'bg-gray-200 dark:bg-gray-700'
                  }`}
                />
              ))}
            </div>

            <span className="flex items-center gap-1">
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
              {debate.spectatorCount}
            </span>

            <span className="flex items-center gap-1">
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0" />
              </svg>
              {debate.participantCount}
            </span>

            <span className="ml-auto font-medium">{timeLabel}</span>
          </div>

          {/* Winner badge for completed */}
          {debate.status === 'completed' && debate.overallWinner && debate.overallWinner !== 'draw' && (
            <div className={`mt-1 rounded-lg px-3 py-1.5 text-sm font-bold ${
              debate.overallWinner === 'for'
                ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
            }`}>
              {debate.overallWinner === 'for' ? 'FOR' : 'AGAINST'} side won
            </div>
          )}
        </div>
      </Card>
    </Link>
  )
}
