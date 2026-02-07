import clsx from 'clsx'

interface AvatarProps {
  name: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
  showGradientRing?: boolean
  className?: string
}

const sizes = {
  sm: 'w-8 h-8 text-sm',
  md: 'w-10 h-10 text-base',
  lg: 'w-14 h-14 text-xl',
  xl: 'w-20 h-20 text-3xl',
}

const ringPadding = {
  sm: 'p-0.5',
  md: 'p-0.5',
  lg: 'p-[3px]',
  xl: 'p-1',
}

const colors = [
  'bg-primary-100 text-primary-700',
  'bg-green-100 text-green-700',
  'bg-amber-100 text-amber-700',
  'bg-purple-100 text-purple-700',
  'bg-red-100 text-red-700',
  'bg-cyan-100 text-cyan-700',
]

function getColorIndex(name: string): number {
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }
  return Math.abs(hash) % colors.length
}

export default function Avatar({ name, size = 'md', showGradientRing = false, className }: AvatarProps) {
  const letter = name[0]?.toUpperCase() || '?'
  const colorClass = colors[getColorIndex(name)]

  const avatar = (
    <div
      className={clsx(
        'rounded-full flex items-center justify-center font-semibold select-none',
        sizes[size],
        colorClass,
        !showGradientRing && className
      )}
    >
      {letter}
    </div>
  )

  if (showGradientRing) {
    return (
      <div className={clsx('gradient-ring', ringPadding[size], className)}>
        {avatar}
      </div>
    )
  }

  return avatar
}
