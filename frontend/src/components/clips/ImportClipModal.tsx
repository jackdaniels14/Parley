import { useState } from 'react'
import { useAuthStore } from '../../store/auth'
import { fetchOEmbedFn } from '../../services/functions'
import { createClip } from '../../services/firestore'
import { CATEGORIES } from '../../constants/categories'
import type { TopicCategory } from '../../types'
import clsx from 'clsx'

interface ImportClipModalProps {
  isOpen: boolean
  onClose: () => void
  onCreated: () => void
}

type Step = 'url' | 'preview' | 'details'

const PLATFORM_LABELS: Record<string, string> = {
  youtube: '▶ YouTube',
  tiktok: '♪ TikTok',
  twitter: '✕ Twitter/X',
  instagram: '📷 Instagram',
}

const PLATFORM_COLORS: Record<string, string> = {
  youtube: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
  tiktok: 'bg-black/10 text-gray-800 dark:bg-white/10 dark:text-gray-200',
  twitter: 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300',
  instagram: 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300',
}

export default function ImportClipModal({ isOpen, onClose, onCreated }: ImportClipModalProps) {
  const user = useAuthStore((s) => s.user)

  const [step, setStep] = useState<Step>('url')
  const [url, setUrl] = useState('')
  const [isFetching, setIsFetching] = useState(false)
  const [fetchError, setFetchError] = useState<string | null>(null)

  const [platform, setPlatform] = useState('')
  const [embedTitle, setEmbedTitle] = useState('')
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null)
  const [embedHtml, setEmbedHtml] = useState<string | null>(null)

  const [hookText, setHookText] = useState('')
  const [category, setCategory] = useState<TopicCategory>('Culture & Trends')
  const [isSaving, setIsSaving] = useState(false)

  async function handleFetchPreview() {
    if (!url.trim()) return
    setIsFetching(true)
    setFetchError(null)
    try {
      const data = await fetchOEmbedFn(url.trim())
      setPlatform(data.platform)
      setEmbedTitle(data.title)
      setThumbnailUrl(data.thumbnailUrl)
      setEmbedHtml(data.embedHtml)
      setHookText(data.title.slice(0, 120))
      setStep('preview')
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to fetch preview. Check the URL and try again.'
      setFetchError(msg)
    } finally {
      setIsFetching(false)
    }
  }

  async function handleSave() {
    if (!user || !hookText.trim()) return
    setIsSaving(true)
    try {
      await createClip(user.id, {
        debateId: '',
        type: 'highlight',
        title: embedTitle || hookText.trim().slice(0, 60),
        hookText: hookText.trim(),
        claimText: '',
        counterText: '',
        resultText: '',
        argumentIds: [],
        crowdVoteResult: '',
        cardImageUrl: thumbnailUrl,
        cardTemplate: 'dark',
        debateTitle: embedTitle || '',
        topicCategory: category,
        forUsername: user.username,
        againstUsername: '',
        videoUrl: null,
        sourcePlatform: platform as 'youtube' | 'tiktok' | 'twitter' | 'instagram',
        sourceUrl: url.trim(),
        embedHtml,
      })
      onCreated()
      handleClose()
    } catch (err) {
      console.error(err)
    } finally {
      setIsSaving(false)
    }
  }

  function handleClose() {
    if (isFetching || isSaving) return
    setStep('url')
    setUrl('')
    setFetchError(null)
    setPlatform('')
    setEmbedTitle('')
    setThumbnailUrl(null)
    setEmbedHtml(null)
    setHookText('')
    setCategory('Culture & Trends')
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="fixed inset-0 bg-black/60" onClick={handleClose} />
      <div className="relative w-full sm:max-w-lg bg-white dark:bg-gray-900 rounded-t-2xl sm:rounded-2xl shadow-2xl flex flex-col max-h-[90dvh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-800 sticky top-0 bg-white dark:bg-gray-900 z-10">
          <h2 className="font-bold text-gray-900 dark:text-white">Import Clip from URL</h2>
          <button onClick={handleClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-2xl leading-none">&times;</button>
        </div>

        <div className="p-5 space-y-5">
          {/* Step 1: URL input */}
          {step === 'url' && (
            <>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Paste a link from YouTube, TikTok, Twitter/X, or Instagram.
              </p>
              <div className="flex gap-2">
                <input
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleFetchPreview() }}
                  placeholder="https://www.youtube.com/watch?v=..."
                  className="flex-1 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white placeholder-gray-400"
                />
                <button
                  onClick={handleFetchPreview}
                  disabled={!url.trim() || isFetching}
                  className="px-4 py-2 rounded-lg bg-primary-600 hover:bg-primary-700 disabled:opacity-40 text-white text-sm font-semibold transition-colors whitespace-nowrap"
                >
                  {isFetching ? 'Fetching...' : 'Fetch Preview'}
                </button>
              </div>
              {fetchError && (
                <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-lg px-3 py-2">
                  {fetchError}
                </p>
              )}
              <div className="flex gap-2 flex-wrap">
                {['youtube.com/watch?v=...', 'tiktok.com/@user/video/...', 'x.com/user/status/...', 'instagram.com/reel/...'].map((ex) => (
                  <span key={ex} className="text-[10px] bg-gray-100 dark:bg-gray-800 text-gray-500 rounded px-2 py-0.5">
                    {ex}
                  </span>
                ))}
              </div>
            </>
          )}

          {/* Step 2: Preview */}
          {step === 'preview' && (
            <>
              {/* Platform badge */}
              <div className="flex items-center gap-2">
                <span className={clsx('text-xs font-semibold px-2 py-0.5 rounded-full', PLATFORM_COLORS[platform] ?? 'bg-gray-100 text-gray-700')}>
                  {PLATFORM_LABELS[platform] ?? platform}
                </span>
                <span className="text-xs text-gray-400 truncate flex-1">{url}</span>
                <button onClick={() => setStep('url')} className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 shrink-0">
                  Change
                </button>
              </div>

              {/* Instagram notice */}
              {platform === 'instagram' && (
                <div className="rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 px-4 py-3 text-sm text-amber-800 dark:text-amber-300">
                  Instagram doesn't allow embedding. This will be saved as a link-out — viewers will be sent to Instagram to watch it.
                </div>
              )}

              {/* Thumbnail */}
              {thumbnailUrl && (
                <div className="rounded-xl overflow-hidden bg-black aspect-video">
                  <img src={thumbnailUrl} alt="Preview" className="w-full h-full object-cover" />
                </div>
              )}

              {/* Embed title */}
              {embedTitle && (
                <p className="text-sm font-medium text-gray-800 dark:text-gray-200 line-clamp-2">{embedTitle}</p>
              )}

              {/* Hook text */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Hook text <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={hookText}
                  onChange={(e) => setHookText(e.target.value)}
                  placeholder="What's the debate about?"
                  rows={2}
                  maxLength={120}
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white placeholder-gray-400 resize-none"
                />
                <p className="text-xs text-gray-400 mt-1 text-right">{hookText.length}/120</p>
              </div>

              {/* Category */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as TopicCategory)}
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <button
                onClick={handleSave}
                disabled={!hookText.trim() || isSaving}
                className="w-full py-3 rounded-xl bg-primary-600 hover:bg-primary-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold text-sm transition-colors"
              >
                {isSaving ? 'Saving...' : 'Add to Feed'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
