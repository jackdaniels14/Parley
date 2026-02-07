import clsx from 'clsx'
import { FireIcon, ClockIcon, UsersIcon, SortIcon } from '../icons'

export type SortOption = 'hot' | 'new' | 'active' | 'expiring'

interface FeedSortBarProps {
  selected: SortOption
  onSelect: (option: SortOption) => void
}

const options: { value: SortOption; label: string; icon: typeof FireIcon }[] = [
  { value: 'hot', label: 'Hot', icon: FireIcon },
  { value: 'new', label: 'New', icon: ClockIcon },
  { value: 'active', label: 'Most Active', icon: UsersIcon },
  { value: 'expiring', label: 'Expiring Soon', icon: SortIcon },
]

export default function FeedSortBar({ selected, onSelect }: FeedSortBarProps) {
  return (
    <div className="flex items-center gap-1">
      {options.map(({ value, label, icon: Icon }) => (
        <button
          key={value}
          onClick={() => onSelect(value)}
          className={clsx(
            'flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
            selected === value
              ? 'bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-gray-100'
              : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:bg-gray-800/50'
          )}
        >
          <Icon className="w-4 h-4" />
          <span className="hidden sm:inline">{label}</span>
        </button>
      ))}
    </div>
  )
}
