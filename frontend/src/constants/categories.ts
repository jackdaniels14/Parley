import type { TopicCategory } from '../types'

export const CATEGORIES: TopicCategory[] = [
  'Culture & Trends',
  'Business & Money',
  'Fitness & Health',
  'Local Issues',
  'Hypotheticals & Moral Dilemmas',
]

export const categoryColors: Record<TopicCategory, string> = {
  'Culture & Trends': '#8b5cf6',
  'Business & Money': '#f59e0b',
  'Fitness & Health': '#ec4899',
  'Local Issues': '#ef4444',
  'Hypotheticals & Moral Dilemmas': '#3b82f6',
}

export const categoryBadgeColors: Record<TopicCategory, string> = {
  'Culture & Trends': 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
  'Business & Money': 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  'Fitness & Health': 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300',
  'Local Issues': 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
  'Hypotheticals & Moral Dilemmas': 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
}

export const categoryGradients: Record<TopicCategory, string> = {
  'Culture & Trends': 'from-purple-500 to-purple-600',
  'Business & Money': 'from-amber-500 to-amber-600',
  'Fitness & Health': 'from-pink-500 to-pink-600',
  'Local Issues': 'from-red-500 to-red-600',
  'Hypotheticals & Moral Dilemmas': 'from-blue-500 to-blue-600',
}

export const categoryIcons: Record<TopicCategory, string> = {
  'Culture & Trends': '🎭',
  'Business & Money': '💰',
  'Fitness & Health': '💪',
  'Local Issues': '🔥',
  'Hypotheticals & Moral Dilemmas': '🧠',
}
