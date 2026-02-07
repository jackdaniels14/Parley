import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getDoc, doc } from 'firebase/firestore'
import { db } from '../lib/firebase'
import {
  listPreferences,
  listTopics,
  listSocialAccounts,
  createPreference,
  deletePreference,
  getNotificationPreferences,
  updateNotificationPreferences,
  getBlockedUsers,
  updateBlockedUsers,
} from '../services/firestore'
import { syncSocialAccountFn } from '../services/functions'
import { useCurrentUser } from '../hooks'
import { useBlockedUsernames } from '../hooks'
import { useThemeStore } from '../store/theme'
import { Card, Button, Loading, StanceBadge, Toggle, Input } from '../components/common'
import { SettingsIcon, UserIcon, BellIcon, ShieldIcon, PaletteIcon, SunIcon, MoonIcon, MonitorIcon } from '../components/icons'
import type { Topic, Stance, ThemeMode, NotificationPreferences as NotifPrefs } from '../types'

export default function Settings() {
  const queryClient = useQueryClient()
  const { user, isLoading: userLoading, isError, uid } = useCurrentUser()
  const { mode: themeMode, setMode: setThemeMode } = useThemeStore()

  const [blockUsername, setBlockUsername] = useState('')
  const [blockError, setBlockError] = useState('')
  const [syncError, setSyncError] = useState('')

  const { data: preferences, isLoading: prefsLoading } = useQuery({
    queryKey: ['preferences', uid],
    queryFn: () => listPreferences(uid!),
    enabled: !!uid,
  })

  const { data: topics, isLoading: topicsLoading } = useQuery({
    queryKey: ['topics'],
    queryFn: () => listTopics(),
  })

  const { data: socialAccounts } = useQuery({
    queryKey: ['socialAccounts', uid],
    queryFn: () => listSocialAccounts(uid!),
    enabled: !!uid,
  })

  const { data: notifPrefs, isLoading: notifLoading } = useQuery({
    queryKey: ['notificationPreferences', uid],
    queryFn: () => getNotificationPreferences(uid!),
    enabled: !!uid,
  })

  const { data: blockedUsers = [], isLoading: blockedLoading } = useQuery({
    queryKey: ['blockedUsers', uid],
    queryFn: () => getBlockedUsers(uid!),
    enabled: !!uid,
  })

  const { data: blockedUsernameMap } = useBlockedUsernames(blockedUsers)

  const createPrefMutation = useMutation({
    mutationFn: ({ topicId, stance }: { topicId: string; stance: Stance }) =>
      createPreference(uid!, topicId, stance),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['preferences', uid] })
    },
  })

  const deletePrefMutation = useMutation({
    mutationFn: (topicId: string) => deletePreference(uid!, topicId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['preferences', uid] })
    },
  })

  const syncSocial = useMutation({
    mutationFn: (provider: string) => syncSocialAccountFn(provider),
    onSuccess: () => {
      setSyncError('')
      queryClient.invalidateQueries({ queryKey: ['socialAccounts', uid] })
    },
    onError: () => {
      setSyncError('Failed to sync account. Please try again.')
    },
  })

  const updateNotifMutation = useMutation({
    mutationFn: (prefs: Partial<NotifPrefs>) =>
      updateNotificationPreferences(uid!, prefs),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notificationPreferences', uid] })
    },
  })

  const updateBlockedMutation = useMutation({
    mutationFn: (ids: string[]) => updateBlockedUsers(uid!, ids),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['blockedUsers', uid] })
    },
  })

  const preferencesMap = new Map(preferences?.map((p) => [p.topicId, p]))

  const handleStanceSelect = (topic: Topic, stance: Stance) => {
    createPrefMutation.mutate({ topicId: topic.id, stance })
  }

  const handleRemovePreference = (topicId: string) => {
    deletePrefMutation.mutate(topicId)
  }

  const handleNotifToggle = (key: keyof NotifPrefs, value: boolean) => {
    updateNotifMutation.mutate({ [key]: value })
  }

  const handleBlockUser = async () => {
    const username = blockUsername.trim().toLowerCase()
    if (!username) return
    setBlockError('')

    try {
      const snap = await getDoc(doc(db, 'usernames', username))
      if (!snap.exists()) {
        setBlockError('User not found')
        return
      }
      const targetUid = snap.data().uid as string
      if (targetUid === uid) {
        setBlockError("You can't block yourself")
        return
      }
      if (blockedUsers.includes(targetUid)) {
        setBlockError('User is already blocked')
        return
      }
      updateBlockedMutation.mutate([...blockedUsers, targetUid])
      setBlockUsername('')
    } catch {
      setBlockError('Failed to look up user')
    }
  }

  const handleUnblockUser = (targetUid: string) => {
    updateBlockedMutation.mutate(blockedUsers.filter((id) => id !== targetUid))
  }

  // Auth guard
  if (userLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loading size="lg" />
      </div>
    )
  }

  if (isError || !user) {
    return (
      <Card className="text-center py-8">
        <p className="text-red-600 dark:text-red-400">
          {isError ? 'Something went wrong loading your settings.' : 'Please sign in to access settings.'}
        </p>
      </Card>
    )
  }

  const isLoading = prefsLoading || topicsLoading

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Settings</h1>

      {/* Topic Preferences */}
      <Card padding="lg">
        <div className="flex items-center gap-2 mb-1">
          <SettingsIcon className="w-5 h-5 text-primary-600 dark:text-violet-400" />
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Topic Preferences</h2>
        </div>
        <p className="text-gray-600 dark:text-gray-400 mb-6 text-sm">
          Tell us how you feel about these topics. We'll show you debates on
          topics you have strong opinions about.
        </p>

        {isLoading ? (
          <Loading />
        ) : (
          <div className="space-y-3">
            {topics?.map((topic) => {
              const pref = preferencesMap.get(topic.id)
              return (
                <div
                  key={topic.id}
                  className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
                >
                  <div>
                    <span className="font-medium text-gray-900 dark:text-gray-100">{topic.name}</span>
                    {topic.category && (
                      <span className="text-sm text-gray-500 dark:text-gray-400 ml-2">
                        ({topic.category})
                      </span>
                    )}
                  </div>

                  <div className="flex items-center space-x-2">
                    {pref ? (
                      <>
                        <StanceBadge stance={pref.stance} />
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemovePreference(topic.id)}
                        >
                          Remove
                        </Button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => handleStanceSelect(topic, 'love')}
                          className="px-3 py-1 rounded-full text-sm font-medium bg-green-50 text-green-700 hover:bg-green-100 dark:bg-green-900/30 dark:text-green-300 dark:hover:bg-green-900/50 transition-colors"
                        >
                          Love
                        </button>
                        <button
                          onClick={() => handleStanceSelect(topic, 'hate')}
                          className="px-3 py-1 rounded-full text-sm font-medium bg-red-50 text-red-700 hover:bg-red-100 dark:bg-red-900/30 dark:text-red-300 dark:hover:bg-red-900/50 transition-colors"
                        >
                          Hate
                        </button>
                        <button
                          onClick={() => handleStanceSelect(topic, 'neutral')}
                          className="px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700 transition-colors"
                        >
                          Neutral
                        </button>
                      </>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </Card>

      {/* Connected Accounts */}
      <Card padding="lg">
        <div className="flex items-center gap-2 mb-1">
          <UserIcon className="w-5 h-5 text-primary-600 dark:text-violet-400" />
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Connected Accounts</h2>
        </div>
        <p className="text-gray-600 dark:text-gray-400 mb-6 text-sm">
          Connect your social accounts to help us suggest topics based on your
          interests. We only read public data and never post on your behalf.
        </p>

        {syncError && (
          <p className="text-sm text-red-600 dark:text-red-400 mb-4">{syncError}</p>
        )}

        <div className="space-y-3">
          {['twitter', 'reddit', 'youtube'].map((provider) => {
            const account = socialAccounts?.find((a) => a.provider === provider)
            return (
              <div
                key={provider}
                className="flex items-center justify-between p-3 border border-gray-200 dark:border-gray-700 rounded-lg"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center">
                    {provider === 'twitter' && (
                      <svg className="w-5 h-5 text-gray-900 dark:text-gray-100" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                      </svg>
                    )}
                    {provider === 'reddit' && (
                      <svg className="w-5 h-5 text-orange-500" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 0A12 12 0 000 12a12 12 0 0012 12 12 12 0 0012-12A12 12 0 0012 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 01-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 01.042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 014.028 12c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 01.14-.197.35.35 0 01.238-.042l2.906.617a1.214 1.214 0 011.108-.701zM9.25 12C8.561 12 8 12.562 8 13.25c0 .687.561 1.248 1.25 1.248.687 0 1.248-.561 1.248-1.249 0-.688-.561-1.249-1.249-1.249zm5.5 0c-.687 0-1.248.561-1.248 1.25 0 .687.561 1.248 1.249 1.248.688 0 1.249-.561 1.249-1.249 0-.687-.562-1.249-1.25-1.249zm-5.466 3.99a.327.327 0 00-.231.094.33.33 0 000 .463c.842.842 2.484.913 2.961.913.477 0 2.105-.056 2.961-.913a.361.361 0 000-.462.342.342 0 00-.478 0c-.53.53-1.645.73-2.468.73-.823 0-1.939-.2-2.468-.73a.327.327 0 00-.277-.094z" />
                      </svg>
                    )}
                    {provider === 'youtube' && (
                      <svg className="w-5 h-5 text-red-600" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
                      </svg>
                    )}
                  </div>
                  <div>
                    <span className="font-medium text-gray-900 dark:text-gray-100 capitalize">{provider}</span>
                    {account && (
                      <span className="text-sm text-green-600 dark:text-green-400 ml-2">
                        Connected
                      </span>
                    )}
                  </div>
                </div>

                {account ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => syncSocial.mutate(provider)}
                    loading={syncSocial.isPending}
                  >
                    Sync
                  </Button>
                ) : (
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled
                  >
                    Connect
                  </Button>
                )}
              </div>
            )
          })}
        </div>
      </Card>

      {/* Notification Preferences */}
      <Card padding="lg">
        <div className="flex items-center gap-2 mb-1">
          <BellIcon className="w-5 h-5 text-primary-600 dark:text-violet-400" />
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Notifications</h2>
        </div>
        <p className="text-gray-600 dark:text-gray-400 mb-4 text-sm">
          Choose which notifications you'd like to receive.
        </p>

        {notifLoading ? (
          <Loading />
        ) : notifPrefs ? (
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            <Toggle
              label="Reply notifications"
              description="Get notified when someone replies to your post"
              enabled={notifPrefs.replyNotifications}
              onChange={(v) => handleNotifToggle('replyNotifications', v)}
              disabled={updateNotifMutation.isPending}
            />
            <Toggle
              label="Reaction notifications"
              description="Get notified when someone reacts to your post"
              enabled={notifPrefs.reactionNotifications}
              onChange={(v) => handleNotifToggle('reactionNotifications', v)}
              disabled={updateNotifMutation.isPending}
            />
            <Toggle
              label="New debate notifications"
              description="Get notified about new debates on topics you love or hate"
              enabled={notifPrefs.newDebateNotifications}
              onChange={(v) => handleNotifToggle('newDebateNotifications', v)}
              disabled={updateNotifMutation.isPending}
            />
            <Toggle
              label="Weekly digest"
              description="Receive a weekly email summary of debates and activity"
              enabled={notifPrefs.weeklyDigest}
              onChange={(v) => handleNotifToggle('weeklyDigest', v)}
              disabled={updateNotifMutation.isPending}
            />
          </div>
        ) : null}
      </Card>

      {/* Theme / Appearance */}
      <Card padding="lg">
        <div className="flex items-center gap-2 mb-1">
          <PaletteIcon className="w-5 h-5 text-primary-600 dark:text-violet-400" />
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Appearance</h2>
        </div>
        <p className="text-gray-600 dark:text-gray-400 mb-4 text-sm">
          Choose how Parley looks for you.
        </p>

        <div className="grid grid-cols-3 gap-3">
          {([
            { mode: 'light' as ThemeMode, label: 'Light', Icon: SunIcon },
            { mode: 'dark' as ThemeMode, label: 'Dark', Icon: MoonIcon },
            { mode: 'system' as ThemeMode, label: 'System', Icon: MonitorIcon },
          ]).map(({ mode, label, Icon }) => (
            <button
              key={mode}
              onClick={() => setThemeMode(mode)}
              className={`flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-colors ${
                themeMode === mode
                  ? 'border-primary-500 bg-primary-50 dark:border-violet-500 dark:bg-violet-900/20'
                  : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
              }`}
            >
              <Icon className="w-6 h-6 text-gray-700 dark:text-gray-200" />
              <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{label}</span>
            </button>
          ))}
        </div>
      </Card>

      {/* Privacy / Blocked Users */}
      <Card padding="lg">
        <div className="flex items-center gap-2 mb-1">
          <ShieldIcon className="w-5 h-5 text-primary-600 dark:text-violet-400" />
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Privacy</h2>
        </div>
        <p className="text-gray-600 dark:text-gray-400 mb-4 text-sm">
          Manage blocked users. Blocked users can't see your posts or interact with you.
        </p>

        {blockedLoading ? (
          <Loading />
        ) : (
          <>
            <div className="flex gap-2 mb-4">
              <Input
                placeholder="Enter username to block"
                value={blockUsername}
                onChange={(e) => {
                  setBlockUsername(e.target.value)
                  setBlockError('')
                }}
                error={blockError}
              />
              <Button
                variant="secondary"
                onClick={handleBlockUser}
                loading={updateBlockedMutation.isPending}
                className="shrink-0"
              >
                Block
              </Button>
            </div>

            {blockedUsers.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400">
                You haven't blocked anyone.
              </p>
            ) : (
              <div className="space-y-2">
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Blocked users ({blockedUsers.length})
                </p>
                {blockedUsers.map((blockedUid) => (
                  <div
                    key={blockedUid}
                    className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900 rounded-lg"
                  >
                    <span className="text-sm text-gray-900 dark:text-gray-100">
                      @{blockedUsernameMap?.get(blockedUid) ?? blockedUid}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleUnblockUser(blockedUid)}
                      loading={updateBlockedMutation.isPending}
                    >
                      Unblock
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </Card>
    </div>
  )
}
