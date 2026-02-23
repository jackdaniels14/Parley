import clsx from 'clsx'

interface ScoreBarProps {
  forScore: number
  againstScore: number
  label?: string
  showValues?: boolean
  className?: string
}

export default function ScoreBar({
  forScore,
  againstScore,
  label,
  showValues = true,
  className,
}: ScoreBarProps) {
  const total = forScore + againstScore || 1
  const forPercent = Math.round((forScore / total) * 100)
  const againstPercent = 100 - forPercent

  return (
    <div className={clsx('space-y-1', className)}>
      {label && (
        <div className="text-xs font-medium text-gray-500 dark:text-gray-400">{label}</div>
      )}
      <div className="flex items-center gap-2">
        {showValues && (
          <span className="w-8 text-right text-xs font-bold text-green-600 dark:text-green-400">
            {forPercent}%
          </span>
        )}
        <div className="flex h-2 flex-1 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
          <div
            className="rounded-l-full bg-green-500 transition-all duration-500"
            style={{ width: `${forPercent}%` }}
          />
          <div
            className="rounded-r-full bg-red-500 transition-all duration-500"
            style={{ width: `${againstPercent}%` }}
          />
        </div>
        {showValues && (
          <span className="w-8 text-xs font-bold text-red-600 dark:text-red-400">
            {againstPercent}%
          </span>
        )}
      </div>
    </div>
  )
}
