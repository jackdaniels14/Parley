import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { listTopics, createPreference } from '../services/firestore'
import { useAuthStore } from '../store/auth'
import { Card, Button, Loading } from '../components/common'
import type { Topic, Stance } from '../types'
import clsx from 'clsx'

export default function Onboarding() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { firebaseUser } = useAuthStore()
  const [selectedTopics, setSelectedTopics] = useState<
    Map<string, { topic: Topic; stance: Stance }>
  >(new Map())

  const { data: topics, isLoading } = useQuery({
    queryKey: ['topics'],
    queryFn: () => listTopics(),
  })

  const savePreferences = useMutation({
    mutationFn: async () => {
      if (!firebaseUser) throw new Error('Not authenticated')
      const promises = Array.from(selectedTopics.values()).map(({ topic, stance }) =>
        createPreference(firebaseUser.uid, topic.id, stance)
      )
      await Promise.all(promises)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['preferences'] })
      navigate('/')
    },
  })

  const handleToggle = (topic: Topic, stance: Stance) => {
    const newSelected = new Map(selectedTopics)
    const existing = newSelected.get(topic.id)

    if (existing?.stance === stance) {
      newSelected.delete(topic.id)
    } else {
      newSelected.set(topic.id, { topic, stance })
    }

    setSelectedTopics(newSelected)
  }

  const handleFinish = () => {
    if (selectedTopics.size >= 3) {
      savePreferences.mutate()
    }
  }

  const groupedTopics = topics?.reduce((acc, topic) => {
    const category = topic.category || 'Other'
    if (!acc[category]) acc[category] = []
    acc[category].push(topic)
    return acc
  }, {} as Record<string, Topic[]>)

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loading size="lg" />
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
          Welcome to Parley
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Tell us what you love and hate. We'll show you debates where your
          opinion matters.
        </p>
      </div>

      <Card padding="lg">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Select at least 3 topics
          </h2>
          <span className={clsx(
            'text-sm font-medium px-3 py-1 rounded-full',
            selectedTopics.size >= 3
              ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
              : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'
          )}>
            {selectedTopics.size}/3 minimum
          </span>
        </div>

        <div className="space-y-6">
          {groupedTopics &&
            Object.entries(groupedTopics).map(([category, categoryTopics]) => (
              <div key={category}>
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
                  {category}
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {categoryTopics.map((topic) => {
                    const selected = selectedTopics.get(topic.id)
                    return (
                      <div
                        key={topic.id}
                        className={clsx(
                          'p-4 rounded-xl border-2 transition-all',
                          selected
                            ? 'border-primary-400 bg-primary-50 dark:border-violet-400 dark:bg-violet-900/20 shadow-sm'
                            : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 hover:shadow-sm'
                        )}
                      >
                        <div className="flex items-center justify-between mb-3">
                          <span className="font-semibold text-gray-900 dark:text-gray-100">
                            {topic.name}
                          </span>
                          {selected && (
                            <span className={clsx(
                              'text-xs font-medium px-2 py-0.5 rounded-full',
                              selected.stance === 'love' && 'bg-green-100 text-green-700',
                              selected.stance === 'hate' && 'bg-red-100 text-red-700',
                              selected.stance === 'neutral' && 'bg-gray-100 text-gray-700'
                            )}>
                              {selected.stance === 'love' ? 'Love' : selected.stance === 'hate' ? 'Hate' : 'Meh'}
                            </span>
                          )}
                        </div>
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleToggle(topic, 'love')}
                            className={clsx(
                              'flex-1 py-1.5 px-2 rounded-lg text-sm font-medium transition-all',
                              selected?.stance === 'love'
                                ? 'bg-green-500 text-white scale-105'
                                : 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300 hover:bg-green-100'
                            )}
                          >
                            Love
                          </button>
                          <button
                            onClick={() => handleToggle(topic, 'hate')}
                            className={clsx(
                              'flex-1 py-1.5 px-2 rounded-lg text-sm font-medium transition-all',
                              selected?.stance === 'hate'
                                ? 'bg-red-500 text-white scale-105'
                                : 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300 hover:bg-red-100'
                            )}
                          >
                            Hate
                          </button>
                          <button
                            onClick={() => handleToggle(topic, 'neutral')}
                            className={clsx(
                              'flex-1 py-1.5 px-2 rounded-lg text-sm font-medium transition-all',
                              selected?.stance === 'neutral'
                                ? 'bg-gray-500 text-white scale-105'
                                : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 hover:bg-gray-200'
                            )}
                          >
                            Meh
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
        </div>
      </Card>

      <div className="flex justify-between items-center">
        <Button variant="ghost" onClick={() => navigate('/')}>
          Skip for now
        </Button>
        <Button
          onClick={handleFinish}
          disabled={selectedTopics.size < 3}
          loading={savePreferences.isPending}
          size="lg"
        >
          Continue ({selectedTopics.size}/3 minimum)
        </Button>
      </div>
    </div>
  )
}
