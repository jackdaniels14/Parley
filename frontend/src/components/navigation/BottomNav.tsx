import { Link, useLocation } from 'react-router-dom'
import { HomeIcon, UserIcon, SearchIcon } from '../icons'
import clsx from 'clsx'

function PlusIcon({ className = 'w-6 h-6' }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
    </svg>
  )
}

const tabs = [
  { to: '/', label: 'Home', icon: HomeIcon },
  { to: '/arena', label: 'Browse', icon: SearchIcon },
  { to: '/create', label: 'Create', icon: PlusIcon },
  { to: '/profile', label: 'Profile', icon: UserIcon },
]

const noHighlight: React.CSSProperties = {
  WebkitTapHighlightColor: 'transparent',
  outline: 'none',
}

export default function BottomNav() {
  const location = useLocation()

  function isActive(to: string) {
    if (to === '/') return location.pathname === '/'
    // Profile tab also activates on /settings
    if (to === '/profile') return location.pathname.startsWith('/profile') || location.pathname.startsWith('/settings')
    return location.pathname.startsWith(to)
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 md:hidden z-50 pb-safe">
      <div className="flex items-center h-14">
        {tabs.map(({ to, label, icon: Icon }) => (
          <Link
            key={to}
            to={to}
            style={noHighlight}
            className={clsx(
              'flex flex-col items-center justify-center flex-1 h-full transition-colors',
              isActive(to)
                ? 'text-primary-600 dark:text-violet-400'
                : 'text-gray-400 dark:text-gray-500'
            )}
          >
            <Icon className={to === '/create' ? 'w-6 h-6' : 'w-5 h-5'} />
            <span className="text-[10px] mt-0.5">{label}</span>
          </Link>
        ))}
      </div>
    </nav>
  )
}
