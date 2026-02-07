import { Link, useLocation } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { getCategories } from '../../services/firestore'
import { HomeIcon, UserIcon, SettingsIcon } from '../icons'
import { categorySidebarColors } from '../../constants/categories'
import clsx from 'clsx'

interface SidebarProps {
  collapsed?: boolean
}

const navLinks = [
  { to: '/', label: 'Home', icon: HomeIcon },
  { to: '/profile', label: 'Profile', icon: UserIcon },
  { to: '/settings', label: 'Settings', icon: SettingsIcon },
]

export default function Sidebar({ collapsed = false }: SidebarProps) {
  const location = useLocation()
  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: getCategories,
  })

  return (
    <aside
      className={clsx(
        'hidden md:flex flex-col h-[calc(100vh-3.5rem)] sticky top-14 border-r border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 overflow-y-auto',
        collapsed ? 'w-16' : 'w-64'
      )}
    >
      <nav className="flex-1 py-4 px-2 space-y-1">
        {navLinks.map(({ to, label, icon: Icon }) => {
          const isActive = to === '/' ? location.pathname === '/' : location.pathname.startsWith(to)
          return (
            <Link
              key={to}
              to={to}
              className={clsx(
                'sidebar-link',
                isActive && 'sidebar-link-active'
              )}
              title={collapsed ? label : undefined}
            >
              <Icon className="w-5 h-5 flex-shrink-0" />
              {!collapsed && <span>{label}</span>}
            </Link>
          )
        })}
      </nav>

      {categories && categories.length > 0 && (
        <div className="border-t border-gray-200 dark:border-gray-800 py-4 px-2">
          {!collapsed && (
            <h3 className="px-3 mb-2 text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
              Topics
            </h3>
          )}
          <div className="space-y-1">
            {categories.map((cat) => (
              <div
                key={cat.name}
                className="sidebar-link cursor-default"
                title={collapsed ? cat.name : undefined}
              >
                <span
                  className={clsx(
                    'w-2.5 h-2.5 rounded-full flex-shrink-0',
                    categorySidebarColors[cat.name] || 'bg-gray-400'
                  )}
                />
                {!collapsed && (
                  <span className="text-sm truncate">{cat.name}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </aside>
  )
}
