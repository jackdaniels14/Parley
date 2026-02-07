import { Card } from '../common'

interface RightSidebarProps {
  debateCount: number
  totalParticipants: number
}

export default function RightSidebar({ debateCount, totalParticipants }: RightSidebarProps) {
  return (
    <aside className="hidden xl:block w-80 flex-shrink-0 sticky top-14 h-[calc(100vh-3.5rem)] overflow-y-auto py-6 pr-4">
      <div className="space-y-4">
        <Card padding="md">
          <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">About Parley</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Structured debate for thoughtful discourse. Share opinions, engage respectfully, and discover new perspectives.
          </p>
        </Card>

        <Card padding="md">
          <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-3">Today's Stats</h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="text-center p-2 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div className="text-2xl font-bold text-primary-600 dark:text-violet-400">{debateCount}</div>
              <div className="text-xs text-gray-500">Debates</div>
            </div>
            <div className="text-center p-2 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div className="text-2xl font-bold text-primary-600 dark:text-violet-400">{totalParticipants}</div>
              <div className="text-xs text-gray-500">Participants</div>
            </div>
          </div>
        </Card>
      </div>
    </aside>
  )
}
