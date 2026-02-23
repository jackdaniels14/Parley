import clsx from 'clsx'

interface TimerProps {
  seconds: number
  className?: string
}

export default function Timer({ seconds, className }: TimerProps) {
  const minutes = Math.floor(seconds / 60)
  const secs = seconds % 60
  const formatted = `${minutes}:${secs.toString().padStart(2, '0')}`

  const urgency =
    seconds <= 30
      ? 'text-red-600 dark:text-red-400'
      : seconds <= 120
        ? 'text-yellow-600 dark:text-yellow-400'
        : 'text-gray-600 dark:text-gray-400'

  return (
    <span className={clsx('font-mono font-bold tabular-nums', urgency, className)}>
      {formatted}
    </span>
  )
}
