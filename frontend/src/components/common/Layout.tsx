import { useState } from 'react'
import { Outlet, Link, useNavigate } from 'react-router-dom'
import { signOut } from 'firebase/auth'
import { useQueryClient } from '@tanstack/react-query'
import { auth } from '../../lib/firebase'
import { useAuthStore } from '../../store/auth'
import { Sidebar, BottomNav } from '../navigation'
import { MenuIcon, XIcon } from '../icons'
import Avatar from './Avatar'
import clsx from 'clsx'

export default function Layout() {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [showUserMenu, setShowUserMenu] = useState(false)

  const handleLogout = async () => {
    await signOut(auth)
    queryClient.clear()
    logout()
    navigate('/login')
  }

  const displayName = user?.displayName || user?.username || 'User'

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Top Nav */}
      <header className="sticky top-0 z-40 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 h-14">
        <div className="flex items-center justify-between h-full px-4">
          {/* Left: hamburger + logo */}
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400"
            >
              <MenuIcon className="w-5 h-5" />
            </button>
            <Link to="/" className="flex items-center space-x-2">
              <span className="text-xl font-bold text-primary-600">Parley</span>
              <span className="hidden sm:inline text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                Opinion over engagement
              </span>
            </Link>
          </div>

          {/* Right: user avatar dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center space-x-2 p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              <Avatar name={displayName} size="sm" />
              <span className="hidden sm:block text-sm font-medium text-gray-700 dark:text-gray-300 max-w-[120px] truncate">
                {displayName}
              </span>
            </button>

            {showUserMenu && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setShowUserMenu(false)}
                />
                <div className="absolute right-0 mt-1 w-48 bg-white dark:bg-gray-900 rounded-lg shadow-lg border border-gray-200 dark:border-gray-800 py-1 z-20 animate-fade-in">
                  <div className="px-4 py-2 border-b border-gray-100 dark:border-gray-800">
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{displayName}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">@{user?.username}</p>
                  </div>
                  <Link
                    to="/profile"
                    className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
                    onClick={() => setShowUserMenu(false)}
                  >
                    Profile
                  </Link>
                  <Link
                    to="/settings"
                    className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
                    onClick={() => setShowUserMenu(false)}
                  >
                    Settings
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="w-full text-left px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                  >
                    Logout
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Mobile sidebar overlay */}
      {mobileMenuOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/50 z-40 md:hidden"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="fixed left-0 top-0 bottom-0 w-64 bg-white dark:bg-gray-900 z-50 md:hidden animate-slide-in-left shadow-xl">
            <div className="flex items-center justify-between h-14 px-4 border-b border-gray-200 dark:border-gray-800">
              <span className="text-xl font-bold text-primary-600">Parley</span>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400"
              >
                <XIcon className="w-5 h-5" />
              </button>
            </div>
            <div onClick={() => setMobileMenuOpen(false)}>
              <Sidebar />
            </div>
          </div>
        </>
      )}

      {/* Main layout */}
      <div className="flex">
        {/* Desktop sidebar - full on lg+, icon-only on md */}
        <div className="hidden lg:block">
          <Sidebar />
        </div>
        <div className="hidden md:block lg:hidden">
          <Sidebar collapsed />
        </div>

        {/* Main content */}
        <main className={clsx(
          'flex-1 min-w-0 pb-20 md:pb-0',
          'px-4 sm:px-6 py-6'
        )}>
          <div className="max-w-3xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>

      {/* Mobile bottom nav */}
      <BottomNav />
    </div>
  )
}
