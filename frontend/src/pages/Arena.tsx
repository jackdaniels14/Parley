import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { listDebates } from '../services/firestore'
import { DebateCard } from '../components/debate'
import { Loading, Card, Button } from '../components/common'
import Tabs from '../components/common/Tabs'
import type { DebateFormat, DebateStatus, TopicCategory } from '../types'
import { CATEGORIES, categoryBadgeColors } from '../constants/categories'

type FeedFilter = 'all' | DebateStatus

export default function Arena() {
  const [formatFilter, setFormatFilter] = useState<DebateFormat | 'all'>('all')
  const [categoryFilter, setCategoryFilter] = useState<TopicCategory | null>(null)
  const [statusFilter, setStatusFilter] = useState<FeedFilter>('all')

  const { data: debates, isLoading, error } = useQuery({
    queryKey: ['debates', 'arena'],
    queryFn: () => listDebates({ limit: 50 }),
    refetchInterval: 30000,
  })

  const filteredDebates = useMemo(() => {
    if (!debates) return []
    let result = [...debates]

    if (formatFilter !== 'all') {
      result = result.filter((d) => d.format === formatFilter)
    }
    if (categoryFilter) {
      result = result.filter((d) => d.topicCategory === categoryFilter)
    }
    if (statusFilter !== 'all') {
      result = result.filter((d) => d.status === statusFilter)
    }

    return result
  }, [debates, formatFilter, categoryFilter, statusFilter])

  const activeCount = debates?.filter((d) => d.status === 'active').length || 0
  const votingCount = debates?.filter((d) => d.status === 'voting').length || 0
  const setupCount = debates?.filter((d) => d.status === 'setup').length || 0

  const statusTabs = [
    { id: 'all', label: 'All', count: debates?.length },
    { id: 'active', label: 'Live', count: activeCount },
    { id: 'voting', label: 'Voting', count: votingCount },
    { id: 'setup', label: 'Open', count: setupCount },
    { id: 'completed', label: 'Completed' },
  ]

  return (
    <div className="space-y-6">
      {/* Hero section */}
      <div className="rounded-2xl bg-gradient-to-r from-primary-600 to-primary-800 px-6 py-8 text-white">
        <h1 className="text-3xl font-bold">The Arena</h1>
        <p className="mt-2 text-primary-100">
          Where opinions are challenged, defended, and scored.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link to="/matchmaking">
            <Button className="bg-white text-primary-700 hover:bg-primary-50 font-bold">
              Quick Match
            </Button>
          </Link>
          <Link to="/challenges">
            <Button className="border-2 border-white/40 bg-transparent text-white hover:bg-white/10">
              Challenge Someone
            </Button>
          </Link>
        </div>
      </div>

      {/* Format filter chips */}
      <div className="flex flex-wrap gap-2">
        {(['all', 'duel', 'team', 'openFloor', 'devilsAdvocate', 'video'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFormatFilter(f)}
            className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
              formatFilter === f
                ? 'bg-primary-500 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700'
            }`}
          >
            {f === 'all'
              ? 'All Formats'
              : f === 'duel'
              ? '1v1 Duel'
              : f === 'team'
              ? 'Team'
              : f === 'openFloor'
              ? 'Open Floor'
              : f === 'video'
              ? '📹 Video'
              : "Devil's Advocate"}
          </button>
        ))}
      </div>

      {/* Category filter chips */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setCategoryFilter(null)}
          className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
            !categoryFilter
              ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400'
          }`}
        >
          All Topics
        </button>
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => setCategoryFilter(categoryFilter === cat ? null : cat)}
            className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
              categoryFilter === cat
                ? categoryBadgeColors[cat]
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Status tabs */}
      <Tabs
        tabs={statusTabs}
        activeTab={statusFilter}
        onChange={(id) => setStatusFilter(id as FeedFilter)}
      />

      {/* Debate feed */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loading size="lg" />
        </div>
      ) : error ? (
        <Card className="py-8 text-center">
          <p className="text-red-600 dark:text-red-400">Failed to load debates. Please try again.</p>
        </Card>
      ) : filteredDebates.length > 0 ? (
        <div className="space-y-4">
          {filteredDebates.map((debate) => (
            <DebateCard key={debate.id} debate={debate} />
          ))}
        </div>
      ) : (
        <Card className="py-12 text-center">
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
            No debates found
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            {formatFilter !== 'all' || categoryFilter
              ? 'Try adjusting your filters.'
              : 'Be the first to start a debate or join the matchmaking queue!'}
          </p>
          <Link to="/matchmaking">
            <Button>Find a Match</Button>
          </Link>
        </Card>
      )}
    </div>
  )
}
