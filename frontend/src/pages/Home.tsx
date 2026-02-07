import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getDailyDebates } from '../services/functions'
import { DebateCard } from '../components/debate'
import { Loading, Card } from '../components/common'
import { TrendingTopics, TopFilterChips } from '../components/navigation'
import { FeedSortBar, RightSidebar } from '../components/feed'
import type { SortOption } from '../components/feed/FeedSortBar'

export default function Home() {
  const { data: debates, isLoading, error } = useQuery({
    queryKey: ['debates', 'today'],
    queryFn: getDailyDebates,
    refetchInterval: 60000,
  })
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [sort, setSort] = useState<SortOption>('hot')

  // Extract unique categories
  const categories = useMemo(() => {
    if (!debates) return []
    const cats = new Set<string>()
    debates.forEach((d) => {
      if (d.topic?.category) cats.add(d.topic.category)
    })
    return Array.from(cats).sort()
  }, [debates])

  // Filter and sort debates
  const filteredDebates = useMemo(() => {
    if (!debates) return []
    let result = [...debates]

    // Filter by category
    if (selectedCategory) {
      result = result.filter((d) => d.topic?.category === selectedCategory)
    }

    const now = Date.now()

    // Sort
    switch (sort) {
      case 'hot':
        // Decay-weighted: participants / (age_hours + 2)^1.5
        result.sort((a, b) => {
          const ageA = (now - new Date(a.createdAt).getTime()) / 3600000
          const ageB = (now - new Date(b.createdAt).getTime()) / 3600000
          const scoreA = a.participantCount / Math.pow(ageA + 2, 1.5)
          const scoreB = b.participantCount / Math.pow(ageB + 2, 1.5)
          return scoreB - scoreA
        })
        break
      case 'new':
        result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        break
      case 'active':
        result.sort((a, b) => b.participantCount - a.participantCount)
        break
      case 'expiring':
        result.sort((a, b) => new Date(a.expiresAt).getTime() - new Date(b.expiresAt).getTime())
        break
    }

    return result
  }, [debates, selectedCategory, sort])

  const totalParticipants = useMemo(() => {
    if (!debates) return 0
    return debates.reduce((sum, d) => sum + d.participantCount, 0)
  }, [debates])

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loading size="lg" />
      </div>
    )
  }

  if (error) {
    return (
      <Card className="text-center py-8">
        <p className="text-red-600 dark:text-red-400">Failed to load debates. Please try again.</p>
      </Card>
    )
  }

  return (
    <div className="flex gap-6">
      {/* Main feed */}
      <div className="flex-1 min-w-0 space-y-5">
        {/* Trending Topics */}
        {debates && debates.length > 0 && (
          <TrendingTopics debates={debates} />
        )}

        {/* Filter Chips */}
        {categories.length > 0 && (
          <TopFilterChips
            categories={categories}
            selected={selectedCategory}
            onSelect={setSelectedCategory}
          />
        )}

        {/* Sort Bar */}
        <FeedSortBar selected={sort} onSelect={setSort} />

        {/* Debate list */}
        {filteredDebates.length > 0 ? (
          <div className="space-y-4">
            {filteredDebates.map((debate) => (
              <DebateCard key={debate.id} debate={debate} />
            ))}
          </div>
        ) : (
          <Card className="text-center py-12">
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
              {selectedCategory ? 'No debates in this category' : 'No debates available'}
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              {selectedCategory
                ? 'Try selecting a different category or clear your filter.'
                : 'Set up your topic preferences to see personalized debates.'}
            </p>
          </Card>
        )}
      </div>

      {/* Right sidebar (xl+ only) */}
      <RightSidebar
        debateCount={debates?.length || 0}
        totalParticipants={totalParticipants}
      />
    </div>
  )
}
