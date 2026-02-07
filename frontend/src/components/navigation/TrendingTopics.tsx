import type { Debate } from '../../types'

interface TrendingTopicsProps {
  debates: Debate[]
}

const gradients = [
  'from-amber-400 via-red-400 to-purple-500',
  'from-blue-400 via-cyan-400 to-green-400',
  'from-pink-400 via-red-400 to-amber-400',
  'from-purple-400 via-blue-400 to-cyan-400',
  'from-green-400 via-emerald-400 to-teal-400',
]

export default function TrendingTopics({ debates }: TrendingTopicsProps) {
  // Deduplicate by topic and sort by participant count
  const topicMap = new Map<string, { name: string; participantCount: number }>()
  debates.forEach((d) => {
    if (!d.topic) return
    const existing = topicMap.get(d.topicId)
    if (!existing || d.participantCount > existing.participantCount) {
      topicMap.set(d.topicId, { name: d.topic.name, participantCount: d.participantCount })
    }
  })

  const trending = Array.from(topicMap.entries())
    .sort((a, b) => b[1].participantCount - a[1].participantCount)
    .slice(0, 8)

  if (trending.length === 0) return null

  return (
    <div className="flex gap-4 overflow-x-auto scrollbar-hide pb-2">
      {trending.map(([topicId, { name }], i) => {
        const abbr = name
          .split(/\s+/)
          .map((w) => w[0])
          .join('')
          .slice(0, 3)
          .toUpperCase()

        return (
          <div key={topicId} className="flex flex-col items-center flex-shrink-0 w-16">
            <div className={`w-14 h-14 rounded-full bg-gradient-to-br ${gradients[i % gradients.length]} p-[2px]`}>
              <div className="w-full h-full rounded-full bg-white dark:bg-gray-900 flex items-center justify-center">
                <span className="text-xs font-bold text-gray-700 dark:text-gray-300">{abbr}</span>
              </div>
            </div>
            <span className="text-[11px] text-gray-600 dark:text-gray-400 mt-1 text-center truncate w-full">
              {name}
            </span>
          </div>
        )
      })}
    </div>
  )
}
