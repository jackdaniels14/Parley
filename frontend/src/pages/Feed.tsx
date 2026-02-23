import { useState, useEffect, useRef, useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'
import { listClips, listDebates } from '../services/firestore'
import { MOCK_CLIPS } from '../constants/mockClips'
import ClipCard from '../components/feed/ClipCard'
import LiveEventCard from '../components/feed/LiveEventCard'
import { Loading } from '../components/common'

type FeedTab = 'forYou' | 'live'

export default function Feed() {
  const [activeTab, setActiveTab] = useState<FeedTab>('forYou')
  const [activeClipIndex, setActiveClipIndex] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)

  // For You: clips
  const { data: firestoreClips, isLoading: clipsLoading } = useQuery({
    queryKey: ['clips', 'feed'],
    queryFn: () => listClips(20),
  })

  const clips = (firestoreClips && firestoreClips.length > 0) ? firestoreClips : MOCK_CLIPS

  // Live: active + setup debates
  const { data: activeDebates, isLoading: activeLoading } = useQuery({
    queryKey: ['debates', 'active'],
    queryFn: () => listDebates({ status: 'active', limit: 10 }),
    enabled: activeTab === 'live',
  })
  const { data: setupDebates, isLoading: setupLoading } = useQuery({
    queryKey: ['debates', 'setup'],
    queryFn: () => listDebates({ status: 'setup', limit: 10 }),
    enabled: activeTab === 'live',
  })

  const liveDebates = [
    ...(activeDebates ?? []),
    ...(setupDebates ?? []),
  ].sort((a, b) => {
    // active before setup
    if (a.status === 'active' && b.status !== 'active') return -1
    if (a.status !== 'active' && b.status === 'active') return 1
    return 0
  })
  const liveLoading = activeLoading || setupLoading

  // IntersectionObserver to track active clip
  const observerRef = useRef<IntersectionObserver | null>(null)

  const setupObserver = useCallback(() => {
    if (observerRef.current) observerRef.current.disconnect()

    observerRef.current = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const index = Number(entry.target.getAttribute('data-index'))
            if (!isNaN(index)) setActiveClipIndex(index)
          }
        }
      },
      { threshold: 0.6 }
    )

    const container = containerRef.current
    if (!container) return
    container.querySelectorAll('[data-index]').forEach((el) => {
      observerRef.current?.observe(el)
    })
  }, [])

  useEffect(() => {
    if (activeTab === 'forYou') {
      // Small delay to let DOM render
      const t = setTimeout(setupObserver, 100)
      return () => clearTimeout(t)
    }
  }, [activeTab, clips, setupObserver])

  useEffect(() => {
    return () => observerRef.current?.disconnect()
  }, [])

  return (
    <div className="flex flex-col h-[calc(100dvh-3.5rem)] relative">
      {/* Tab bar */}
      <div className="flex items-center justify-center gap-6 h-10 bg-black/80 backdrop-blur-sm border-b border-white/10 shrink-0 sticky top-0 z-20">
        <button
          onClick={() => setActiveTab('forYou')}
          className={`text-sm font-semibold pb-0.5 transition-colors ${
            activeTab === 'forYou'
              ? 'text-white border-b-2 border-white'
              : 'text-gray-400 hover:text-gray-200'
          }`}
        >
          For You
        </button>
        <button
          onClick={() => setActiveTab('live')}
          className={`text-sm font-semibold pb-0.5 transition-colors flex items-center gap-1.5 ${
            activeTab === 'live'
              ? 'text-white border-b-2 border-white'
              : 'text-gray-400 hover:text-gray-200'
          }`}
        >
          Live
          {(activeDebates?.length ?? 0) > 0 && (
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
          )}
        </button>
      </div>

      {/* For You tab */}
      {activeTab === 'forYou' && (
        <div
          ref={containerRef}
          className="flex-1 overflow-y-scroll snap-y snap-mandatory"
          style={{ scrollbarWidth: 'none' }}
        >
          {clipsLoading ? (
            <div className="h-full flex items-center justify-center bg-black">
              <Loading size="lg" />
            </div>
          ) : (
            clips.map((clip, i) => (
              <div
                key={clip.id}
                data-index={i}
                className="snap-start w-full"
                style={{ height: 'calc(100dvh - 3.5rem - 2.5rem)' }}
              >
                <ClipCard clip={clip} isActive={activeClipIndex === i} />
              </div>
            ))
          )}
        </div>
      )}

      {/* Live tab */}
      {activeTab === 'live' && (
        <div className="flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-950">
          {liveLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loading size="lg" />
            </div>
          ) : liveDebates.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 gap-3 text-center px-6">
              <span className="text-4xl">📡</span>
              <p className="text-gray-700 dark:text-gray-300 font-semibold">No live debates right now</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Check back soon — debates start every day.
              </p>
            </div>
          ) : (
            <div className="max-w-lg mx-auto px-4 py-4 pb-20 md:pb-4 flex flex-col gap-3">
              {liveDebates.map((debate) => (
                <LiveEventCard key={debate.id} debate={debate} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
