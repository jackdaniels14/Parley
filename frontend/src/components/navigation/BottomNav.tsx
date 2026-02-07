import { Link, useLocation } from 'react-router-dom'
import { HomeIcon, UserIcon, SettingsIcon } from '../icons'
import clsx from 'clsx'

const tabs = [
  { to: '/', label: 'Home', icon: HomeIcon },
  { to: '/profile', label: 'Profile', icon: UserIcon },
  { to: '/settings', label: 'Settings', icon: SettingsIcon },
]

export default function BottomNav() {
  const location = useLocation()

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 md:hidden z-50 pb-safe">
      <div className="flex items-center justify-around h-14">
        {tabs.map(({ to, label, icon: Icon }) => {
          const isActive = to === '/' ? location.pathname === '/' : location.pathname.startsWith(to)
          return (
            <Link
              key={to}
              to={to}
              className={clsx(
                'flex flex-col items-center justify-center flex-1 h-full transition-colors',
                isActive ? 'text-primary-600 dark:text-violet-400' : 'text-gray-400 dark:text-gray-500'
              )}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[10px] mt-0.5">{label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
