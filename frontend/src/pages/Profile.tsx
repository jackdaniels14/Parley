import { useState, useMemo, useRef, useCallback, useEffect } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { useCurrentUser, useProfileStats } from '../hooks'
import { updateUserProfile, listPreferences, listTopics, listDebates } from '../services/firestore'
import { Card, Button, Input, TextArea, Loading } from '../components/common'
import Avatar from '../components/common/Avatar'
import RankBadge from '../components/common/RankBadge'
import { MapPinIcon, GlobeIcon, EyeIcon, EyeOffIcon, FireIcon, ChatBubbleIcon, LightbulbIcon } from '../components/icons'

interface FormState {
  displayName: string
  bio: string
  location: string
  website: string
  pronouns: string
  profileVisibility: 'public' | 'private'
}

const emptyForm: FormState = {
  displayName: '',
  bio: '',
  location: '',
  website: '',
  pronouns: '',
  profileVisibility: 'public',
}

function formFromUser(user: { displayName: string | null; bio: string | null; location: string | null; website: string | null; pronouns: string | null; profileVisibility: 'public' | 'private' }): FormState {
  return {
    displayName: user.displayName || '',
    bio: user.bio || '',
    location: user.location || '',
    website: user.website || '',
    pronouns: user.pronouns || '',
    profileVisibility: user.profileVisibility || 'public',
  }
}

export default function Profile() {
  const queryClient = useQueryClient()
  const { user, isLoading, isError, uid, firebaseUser } = useCurrentUser()

  const stats = useProfileStats(user)
  const [isEditing, setIsEditing] = useState(false)
  const [formState, setFormState] = useState<FormState>(emptyForm)
  const [saveError, setSaveError] = useState('')
  const hasPopulatedForm = useRef(false)

  // Populate form from user data when user loads or uid changes
  useEffect(() => {
    if (user && !isEditing) {
      setFormState(formFromUser(user))
      hasPopulatedForm.current = true
    }
  }, [user, uid]) // eslint-disable-line react-hooks/exhaustive-deps

  const updateField = useCallback(<K extends keyof FormState>(key: K, value: FormState[K]) => {
    setFormState((prev) => ({ ...prev, [key]: value }))
  }, [])

  const { data: preferences, isLoading: prefsLoading } = useQuery({
    queryKey: ['preferences', uid],
    queryFn: () => listPreferences(uid!),
    enabled: !!uid,
    staleTime: 1000 * 60 * 10,
  })

  const { data: topics } = useQuery({
    queryKey: ['topics'],
    queryFn: () => listTopics(),
    staleTime: 1000 * 60 * 30,
  })

  const topicMap = useMemo(() => {
    if (!topics) return new Map<string, string>()
    return new Map(topics.map((t) => [t.id, t.name]))
  }, [topics])

  const { data: recentDebates, isLoading: debatesLoading } = useQuery({
    queryKey: ['debateHistory', uid],
    queryFn: () => listDebates({ limit: 10 }),
    enabled: !!uid,
    staleTime: 1000 * 60 * 5,
    select: (debates) => debates.filter((d) =>
      d.forSide.teamMembers.some((m) => m.uid === uid) ||
      d.againstSide.teamMembers.some((m) => m.uid === uid)
    ).slice(0, 5),
  })

  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!firebaseUser) throw new Error('Not authenticated')
      await updateUserProfile(firebaseUser.uid, {
        displayName: formState.displayName || undefined,
        bio: formState.bio || undefined,
        location: formState.location || undefined,
        website: formState.website || undefined,
        pronouns: formState.pronouns || undefined,
        profileVisibility: formState.profileVisibility,
      })
    },
    onSuccess: () => {
      setSaveError('')
      setIsEditing(false)
      hasPopulatedForm.current = false
      queryClient.invalidateQueries({ queryKey: ['currentUser', uid] })
    },
    onError: () => {
      setSaveError('Failed to save changes. Please try again.')
    },
  })

  const handleSave = () => {
    updateMutation.mutate()
  }

  const handleCancel = () => {
    if (user) {
      setFormState(formFromUser(user))
    }
    setSaveError('')
    setIsEditing(false)
  }

  // Three-state guard
  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Loading size="lg" />
      </div>
    )
  }

  if (isError) {
    return (
      <Card className="text-center py-8">
        <p className="text-red-600 dark:text-red-400">Something went wrong. Please try again later.</p>
      </Card>
    )
  }

  if (!user) {
    return (
      <Card className="text-center py-8">
        <p className="text-gray-600 dark:text-gray-400">Please sign in to view your profile.</p>
      </Card>
    )
  }

  const name = user.displayName || user.username
  const winRate = stats && stats.totalDebates > 0
    ? Math.round((stats.wins / stats.totalDebates) * 100)
    : 0

  return (
    <div className="space-y-6">
      {/* Banner + Avatar */}
      <Card padding="none" className="overflow-hidden">
        <div className="h-32 bg-gradient-to-r from-primary-400 via-primary-500 to-primary-600 dark:from-violet-500 dark:via-violet-600 dark:to-violet-700" />
        <div className="px-6 pb-6">
          <div className="flex items-end justify-between -mt-10">
            <Avatar name={name} size="xl" showGradientRing />
            {!isEditing && (
              <div className="mt-12 flex items-center gap-2">
                <Button variant="outline" onClick={() => setIsEditing(true)}>
                  Edit Profile
                </Button>
                <Link
                  to="/settings"
                  className="flex items-center justify-center w-9 h-9 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                  title="Settings"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </Link>
              </div>
            )}
          </div>

          <div className="mt-3 flex items-center gap-3">
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">{name}</h2>
              <p className="text-gray-500 dark:text-gray-400">@{user.username}</p>
            </div>
            <RankBadge rank={user.rank} size="md" />
          </div>

          {/* Extra info row */}
          {(user.pronouns || user.location) && (
            <div className="flex items-center gap-4 mt-2 text-sm text-gray-500 dark:text-gray-400">
              {user.pronouns && <span>{user.pronouns}</span>}
              {user.location && (
                <span className="flex items-center gap-1">
                  <MapPinIcon className="w-4 h-4" />
                  {user.location}
                </span>
              )}
            </div>
          )}

          {/* Competitive Stats */}
          <div className="grid grid-cols-4 gap-4 mt-4 pt-4 border-t border-gray-100 dark:border-gray-800">
            <div className="text-center">
              <div className="text-lg font-bold text-gray-900 dark:text-gray-100">
                {stats?.totalDebates ?? 0}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">Debates</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-green-600 dark:text-green-400">
                {stats?.wins ?? 0}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">Wins</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-red-600 dark:text-red-400">
                {stats?.losses ?? 0}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">Losses</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-primary-600 dark:text-primary-400">
                {winRate}%
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">Win Rate</div>
            </div>
          </div>

          {/* Score Averages */}
          {stats && stats.totalDebates > 0 && (
            <div className="grid grid-cols-4 gap-4 mt-3">
              <div className="text-center">
                <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                  {stats.avgLogicScore.toFixed(0)}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">Logic</div>
              </div>
              <div className="text-center">
                <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                  {stats.avgEvidenceScore.toFixed(0)}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">Evidence</div>
              </div>
              <div className="text-center">
                <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                  {stats.avgOnTopicScore.toFixed(0)}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">On Topic</div>
              </div>
              <div className="text-center">
                <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                  {stats.avgCrowdScore.toFixed(0)}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">Crowd</div>
              </div>
            </div>
          )}

          {/* Streaks & Judge Score */}
          <div className="flex items-center gap-6 mt-3 text-sm text-gray-600 dark:text-gray-400">
            {(stats?.winStreak ?? 0) > 0 && (
              <span className="flex items-center gap-1">
                <FireIcon className="w-4 h-4 text-orange-500" />
                {stats!.winStreak} streak
              </span>
            )}
            {(stats?.bestWinStreak ?? 0) > 0 && (
              <span>Best streak: {stats!.bestWinStreak}</span>
            )}
            {(stats?.upsetWins ?? 0) > 0 && (
              <span>Upsets: {stats!.upsetWins}</span>
            )}
            <span>Judge score: {stats?.judgeScore ?? 50}</span>
          </div>
        </div>
      </Card>

      {/* Profile details */}
      <Card padding="lg">
        {isEditing ? (
          <div className="space-y-4">
            <Input
              label="Display Name"
              value={formState.displayName}
              onChange={(e) => updateField('displayName', e.target.value)}
              placeholder="Your display name"
            />

            <Input
              label="Pronouns"
              value={formState.pronouns}
              onChange={(e) => updateField('pronouns', e.target.value)}
              placeholder="e.g. they/them, she/her, he/him"
            />

            <TextArea
              label="Bio"
              value={formState.bio}
              onChange={(e) => updateField('bio', e.target.value)}
              placeholder="Tell us about yourself..."
              rows={4}
            />

            <Input
              label="Location"
              value={formState.location}
              onChange={(e) => updateField('location', e.target.value)}
              placeholder="City, Country"
            />

            <Input
              label="Website"
              value={formState.website}
              onChange={(e) => updateField('website', e.target.value)}
              placeholder="https://example.com"
            />

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Profile Visibility
              </label>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => updateField('profileVisibility', 'public')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg border-2 text-sm font-medium transition-colors ${
                    formState.profileVisibility === 'public'
                      ? 'border-primary-500 bg-primary-50 dark:border-violet-500 dark:bg-violet-900/20 text-primary-700 dark:text-violet-300'
                      : 'border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:border-gray-300'
                  }`}
                >
                  <EyeIcon className="w-4 h-4" />
                  Public
                </button>
                <button
                  type="button"
                  onClick={() => updateField('profileVisibility', 'private')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg border-2 text-sm font-medium transition-colors ${
                    formState.profileVisibility === 'private'
                      ? 'border-primary-500 bg-primary-50 dark:border-violet-500 dark:bg-violet-900/20 text-primary-700 dark:text-violet-300'
                      : 'border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:border-gray-300'
                  }`}
                >
                  <EyeOffIcon className="w-4 h-4" />
                  Private
                </button>
              </div>
            </div>

            {saveError && (
              <p className="text-sm text-red-600 dark:text-red-400">{saveError}</p>
            )}

            <div className="flex justify-end space-x-2">
              <Button variant="ghost" onClick={handleCancel}>
                Cancel
              </Button>
              <Button onClick={handleSave} loading={updateMutation.isPending}>
                Save Changes
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {user.bio && (
              <div>
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Bio</h3>
                <p className="text-gray-900 dark:text-gray-100">{user.bio}</p>
              </div>
            )}

            <div>
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Email</h3>
              <p className="text-gray-900 dark:text-gray-100">{user.email}</p>
            </div>

            {user.website && (
              <div>
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Website</h3>
                <p>
                  <a
                    href={user.website.startsWith('http') ? user.website : `https://${user.website}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary-600 dark:text-violet-400 hover:underline flex items-center gap-1"
                  >
                    <GlobeIcon className="w-4 h-4" />
                    {user.website}
                  </a>
                </p>
              </div>
            )}

            <div className="flex items-center gap-4">
              <div>
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Member since</h3>
                <p className="text-gray-900 dark:text-gray-100">
                  {new Date(user.createdAt).toLocaleDateString()}
                </p>
              </div>

              <div>
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Profile</h3>
                <p className="text-gray-900 dark:text-gray-100 flex items-center gap-1 text-sm">
                  {user.profileVisibility === 'private' ? (
                    <><EyeOffIcon className="w-4 h-4" /> Private</>
                  ) : (
                    <><EyeIcon className="w-4 h-4" /> Public</>
                  )}
                </p>
              </div>
            </div>
          </div>
        )}
      </Card>

      {/* Topic Preferences */}
      <Card padding="lg">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
          <LightbulbIcon className="w-5 h-5 text-primary-500 dark:text-violet-400" />
          Topic Preferences
        </h3>
        {prefsLoading ? (
          <div className="flex justify-center py-6"><Loading size="sm" /></div>
        ) : !preferences || preferences.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">No topic preferences set yet.</p>
        ) : (
          <div className="space-y-3">
            {(['love', 'hate', 'neutral'] as const).map((stance) => {
              const items = preferences.filter((p) => p.stance === stance)
              if (items.length === 0) return null
              return (
                <div key={stance}>
                  <div className="flex items-center gap-1.5 mb-1.5">
                    {stance === 'love' && <FireIcon className="w-4 h-4 text-green-600 dark:text-green-400" />}
                    <span className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                      {stance === 'love' ? 'Loves' : stance === 'hate' ? 'Hates' : 'Neutral'}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {items.map((pref) => (
                      <span
                        key={pref.id}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-sm font-medium ${
                          stance === 'love'
                            ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                            : stance === 'hate'
                              ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
                              : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
                        }`}
                      >
                        {topicMap.get(pref.topicId) ?? pref.topicId}
                      </span>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </Card>

      {/* Recent Debates */}
      <Card padding="lg">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
          <ChatBubbleIcon className="w-5 h-5 text-primary-500 dark:text-violet-400" />
          Recent Debates
        </h3>
        {debatesLoading ? (
          <div className="flex justify-center py-6"><Loading size="sm" /></div>
        ) : !recentDebates || recentDebates.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">No debates yet. Join the arena to get started!</p>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {recentDebates.map((debate) => (
              <Link
                key={debate.id}
                to={`/debate/${debate.id}`}
                className="block py-3 first:pt-0 last:pb-0 hover:bg-gray-50 dark:hover:bg-gray-800/50 -mx-2 px-2 rounded transition-colors"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate mr-2">
                    {debate.title}
                  </span>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                    debate.status === 'completed' ? 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400' :
                    debate.status === 'active' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                    'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                  }`}>
                    {debate.status}
                  </span>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {debate.topicName} — {debate.topicCategory}
                </p>
              </Link>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}
