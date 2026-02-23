import clsx from 'clsx'
import type { DebateStatus } from '../../types'

const STATUS_CONFIG: Record<DebateStatus, { label: string; color: string; dot: string }> = {
  setup: { label: 'Waiting for Players', color: 'text-yellow-600 dark:text-yellow-400', dot: 'bg-yellow-500' },
  active: { label: 'Live', color: 'text-green-600 dark:text-green-400', dot: 'bg-green-500 animate-pulse' },
  voting: { label: 'Voting', color: 'text-blue-600 dark:text-blue-400', dot: 'bg-blue-500 animate-pulse' },
  scoring: { label: 'Scoring', color: 'text-purple-600 dark:text-purple-400', dot: 'bg-purple-500' },
  completed: { label: 'Completed', color: 'text-gray-500 dark:text-gray-400', dot: 'bg-gray-400' },
  cancelled: { label: 'Cancelled', color: 'text-red-500 dark:text-red-400', dot: 'bg-red-400' },
}

interface StatusBadgeProps {
  status: DebateStatus
  className?: string
}

export default function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = STATUS_CONFIG[status]

  return (
    <span className={clsx('inline-flex items-center gap-1.5 text-xs font-medium', config.color, className)}>
      <span className={clsx('h-2 w-2 rounded-full', config.dot)} />
      {config.label}
    </span>
  )
}
