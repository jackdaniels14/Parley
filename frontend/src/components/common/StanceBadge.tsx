import clsx from 'clsx'

interface StanceBadgeProps {
  stance: string
  size?: 'sm' | 'md'
}

const stanceLabels: Record<string, string> = {
  support: 'Support',
  oppose: 'Oppose',
  mixed: 'Mixed',
  agree: 'Agree',
  disagree: 'Disagree',
  partial_agree: 'Partial',
  changed_mind: 'Changed Mind',
  love: 'Love',
  hate: 'Hate',
  neutral: 'Neutral',
}

const stanceColors: Record<string, string> = {
  support: 'bg-green-100 text-green-800',
  oppose: 'bg-red-100 text-red-800',
  mixed: 'bg-amber-100 text-amber-800',
  agree: 'bg-green-100 text-green-800',
  disagree: 'bg-red-100 text-red-800',
  partial_agree: 'bg-amber-100 text-amber-800',
  changed_mind: 'bg-purple-100 text-purple-800',
  love: 'bg-green-100 text-green-800',
  hate: 'bg-red-100 text-red-800',
  neutral: 'bg-gray-100 text-gray-800',
}

export default function StanceBadge({ stance, size = 'sm' }: StanceBadgeProps) {
  const sizes = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-1 text-sm',
  }

  return (
    <span
      className={clsx(
        'inline-flex items-center rounded-full font-medium',
        sizes[size],
        stanceColors[stance] || 'bg-gray-100 text-gray-800'
      )}
    >
      {stanceLabels[stance] || stance}
    </span>
  )
}
