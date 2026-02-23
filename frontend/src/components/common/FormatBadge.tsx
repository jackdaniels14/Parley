import clsx from 'clsx'
import type { DebateFormat } from '../../types'

const FORMAT_CONFIG: Record<DebateFormat, { label: string; color: string; icon: string }> = {
  duel: { label: '1v1 Duel', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300', icon: '⚔️' },
  team: { label: 'Team vs Team', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300', icon: '👥' },
  openFloor: { label: 'Open Floor', color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300', icon: '🎤' },
  devilsAdvocate: { label: "Devil's Advocate", color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300', icon: '😈' },
  video: { label: 'Video Debate', color: 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300', icon: '📹' },
}

interface FormatBadgeProps {
  format: DebateFormat
  size?: 'sm' | 'md'
  className?: string
}

export default function FormatBadge({ format, size = 'sm', className }: FormatBadgeProps) {
  const config = FORMAT_CONFIG[format]

  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1 rounded-full font-medium',
        config.color,
        size === 'sm' && 'px-2 py-0.5 text-xs',
        size === 'md' && 'px-3 py-1 text-sm',
        className
      )}
    >
      <span>{config.icon}</span>
      <span>{config.label}</span>
    </span>
  )
}
