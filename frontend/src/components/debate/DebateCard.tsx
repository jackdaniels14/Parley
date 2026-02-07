import { Link } from 'react-router-dom'
import { formatDistanceToNow } from 'date-fns'
import { Card } from '../common'
import { UsersIcon, ChatBubbleIcon, ClockIcon } from '../icons'
import { categoryColors, categoryBadgeColors } from '../../constants/categories'
import type { Debate } from '../../types'

interface DebateCardProps {
  debate: Debate
}

export default function DebateCard({ debate }: DebateCardProps) {
  const expiresIn = formatDistanceToNow(new Date(debate.expiresAt), {
    addSuffix: true,
  })

  const msLeft = new Date(debate.expiresAt).getTime() - Date.now()
  const isExpiring = msLeft < 3600000
  const isUrgent = msLeft < 900000

  const accentColor = debate.topic?.category
    ? categoryColors[debate.topic.category] || '#9ca3af'
    : '#9ca3af'

  const badgeClass = debate.topic?.category
    ? categoryBadgeColors[debate.topic.category] || 'bg-gray-100 text-gray-700'
    : 'bg-gray-100 text-gray-700'

  return (
    <Link to={`/debate/${debate.id}`} className="block">
      <Card hover accentColor={accentColor} className="cursor-pointer">
        <div className="space-y-3">
          {/* Topic flair */}
          {debate.topic && (
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${badgeClass}`}>
              {debate.topic.name}
            </span>
          )}

          {/* Title */}
          <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 leading-tight">
            {debate.title}
          </h3>

          {/* Description */}
          {debate.description && (
            <p className="text-gray-600 dark:text-gray-400 text-sm line-clamp-2">
              {debate.description}
            </p>
          )}

          {/* Engagement row */}
          <div className="flex items-center gap-4 pt-1 text-sm">
            <span className="flex items-center gap-1.5 text-gray-500">
              <UsersIcon className="w-4 h-4" />
              {debate.participantCount}
            </span>

            <span className="flex items-center gap-1.5 text-gray-500">
              <ChatBubbleIcon className="w-4 h-4" />
              Opinions
            </span>

            <span
              className={`flex items-center gap-1.5 ml-auto font-medium ${
                isUrgent ? 'text-red-600' : isExpiring ? 'text-amber-600' : 'text-gray-500'
              }`}
            >
              <ClockIcon className="w-4 h-4" />
              {expiresIn}
            </span>
          </div>
        </div>
      </Card>
    </Link>
  )
}
