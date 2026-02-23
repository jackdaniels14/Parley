import clsx from 'clsx'
import type { DebateRank } from '../../types'

const RANK_CONFIG: Record<DebateRank, { label: string; color: string; icon: string }> = {
  bronze: { label: 'Bronze', color: 'bg-amber-700/20 text-amber-700 dark:text-amber-400 border-amber-700/30', icon: '🥉' },
  silver: { label: 'Silver', color: 'bg-gray-300/20 text-gray-600 dark:text-gray-300 border-gray-400/30', icon: '🥈' },
  gold: { label: 'Gold', color: 'bg-yellow-400/20 text-yellow-700 dark:text-yellow-400 border-yellow-500/30', icon: '🥇' },
  platinum: { label: 'Platinum', color: 'bg-cyan-400/20 text-cyan-700 dark:text-cyan-300 border-cyan-500/30', icon: '💎' },
  diamond: { label: 'Diamond', color: 'bg-blue-400/20 text-blue-700 dark:text-blue-300 border-blue-500/30', icon: '💠' },
  legend: { label: 'Legend', color: 'bg-purple-500/20 text-purple-700 dark:text-purple-300 border-purple-500/30', icon: '👑' },
}

interface RankBadgeProps {
  rank: DebateRank
  size?: 'sm' | 'md' | 'lg'
  showLabel?: boolean
  className?: string
}

export default function RankBadge({ rank, size = 'sm', showLabel = true, className }: RankBadgeProps) {
  const config = RANK_CONFIG[rank]

  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1 rounded-full border font-medium',
        config.color,
        size === 'sm' && 'px-2 py-0.5 text-xs',
        size === 'md' && 'px-3 py-1 text-sm',
        size === 'lg' && 'px-4 py-1.5 text-base',
        className
      )}
    >
      <span>{config.icon}</span>
      {showLabel && <span>{config.label}</span>}
    </span>
  )
}
