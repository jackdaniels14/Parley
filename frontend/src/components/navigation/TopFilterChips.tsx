import clsx from 'clsx'

interface TopFilterChipsProps {
  categories: string[]
  selected: string | null
  onSelect: (category: string | null) => void
}

export default function TopFilterChips({ categories, selected, onSelect }: TopFilterChipsProps) {
  return (
    <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
      <button
        onClick={() => onSelect(null)}
        className={clsx('filter-chip', selected === null && 'filter-chip-active')}
      >
        All
      </button>
      {categories.map((cat) => (
        <button
          key={cat}
          onClick={() => onSelect(cat)}
          className={clsx('filter-chip', selected === cat && 'filter-chip-active')}
        >
          {cat}
        </button>
      ))}
    </div>
  )
}
