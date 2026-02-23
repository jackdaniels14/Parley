import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import type { SocialClip, TopicCategory } from '../../types'
import { categoryIcons } from '../../constants/categories'
import clsx from 'clsx'

interface ClipCardProps {
  clip: SocialClip
  isActive: boolean
}

const categoryBg: Record<TopicCategory, string> = {
  'Culture & Trends': 'from-purple-950 via-purple-900/60 to-black',
  'Business & Money': 'from-amber-950 via-amber-900/60 to-black',
  'Fitness & Health': 'from-pink-950 via-pink-900/60 to-black',
  'Local Issues': 'from-red-950 via-red-900/60 to-black',
  'Hypotheticals & Moral Dilemmas': 'from-blue-950 via-blue-900/60 to-black',
}

const categoryAccent: Record<TopicCategory, string> = {
  'Culture & Trends': 'text-purple-400',
  'Business & Money': 'text-amber-400',
  'Fitness & Health': 'text-pink-400',
  'Local Issues': 'text-red-400',
  'Hypotheticals & Moral Dilemmas': 'text-blue-400',
}

const categoryBorder: Record<TopicCategory, string> = {
  'Culture & Trends': 'border-purple-500/30',
  'Business & Money': 'border-amber-500/30',
  'Fitness & Health': 'border-pink-500/30',
  'Local Issues': 'border-red-500/30',
  'Hypotheticals & Moral Dilemmas': 'border-blue-500/30',
}

const categoryAvatarBg: Record<TopicCategory, string> = {
  'Culture & Trends': 'bg-purple-600',
  'Business & Money': 'bg-amber-600',
  'Fitness & Health': 'bg-pink-600',
  'Local Issues': 'bg-red-600',
  'Hypotheticals & Moral Dilemmas': 'bg-blue-600',
}

function HeartIcon({ filled }: { filled: boolean }) {
  return (
    <svg viewBox="0 0 24 24" className="w-7 h-7 drop-shadow-md" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={filled ? 0 : 2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
    </svg>
  )
}

function CommentIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-7 h-7 drop-shadow-md" fill="none" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 9.75a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375m-13.5 3.01c0 1.6 1.123 2.994 2.707 3.227 1.087.16 2.185.283 3.293.369V21l4.184-4.183a1.14 1.14 0 01.778-.332 48.294 48.294 0 005.83-.498c1.585-.233 2.708-1.626 2.708-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
    </svg>
  )
}

function ShareIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-7 h-7 drop-shadow-md" fill="none" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
    </svg>
  )
}

function BookmarkIcon({ saved }: { saved: boolean }) {
  return (
    <svg viewBox="0 0 24 24" className="w-7 h-7 drop-shadow-md" fill={saved ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0z" />
    </svg>
  )
}

function MoreIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-6 h-6 drop-shadow-md" fill="currentColor">
      <path d="M12 6.75a.75.75 0 110-1.5.75.75 0 010 1.5zM12 12.75a.75.75 0 110-1.5.75.75 0 010 1.5zM12 18.75a.75.75 0 110-1.5.75.75 0 010 1.5z" />
    </svg>
  )
}

// Spinning vinyl disc for the "audio" bar
function SpinningDisc({ spinning, color }: { spinning: boolean; color: string }) {
  return (
    <div className={clsx(
      'w-8 h-8 rounded-full border-2 border-white/20 flex items-center justify-center shrink-0 overflow-hidden',
      color,
      spinning ? 'animate-spin' : ''
    )} style={spinning ? { animationDuration: '3s' } : {}}>
      <div className="w-2 h-2 rounded-full bg-black/70" />
    </div>
  )
}

export default function ClipCard({ clip, isActive }: ClipCardProps) {
  const navigate = useNavigate()
  const [liked, setLiked] = useState(false)
  const [likeCount, setLikeCount] = useState(clip.shareCount ?? 0)
  const [saved, setSaved] = useState(false)
  const [captionExpanded, setCaptionExpanded] = useState(false)
  const audioScrollRef = useRef<HTMLDivElement>(null)

  const bg = categoryBg[clip.topicCategory] ?? 'from-gray-900 to-black'
  const accent = categoryAccent[clip.topicCategory] ?? 'text-gray-400'
  const border = categoryBorder[clip.topicCategory] ?? 'border-gray-700/30'
  const avatarBg = categoryAvatarBg[clip.topicCategory] ?? 'bg-gray-600'
  const icon = categoryIcons[clip.topicCategory] ?? '💬'

  const hasVideo = !!clip.videoUrl
  const hasEmbed = !!clip.embedHtml
  const isInstagram = clip.sourcePlatform === 'instagram'

  // Reset expanded caption when clip changes
  useEffect(() => {
    setCaptionExpanded(false)
  }, [clip.id])

  function handleLike() {
    setLiked((v) => {
      setLikeCount((c) => v ? c - 1 : c + 1)
      return !v
    })
  }

  function handleWatch() {
    if (clip.debateId) navigate(`/debate/${clip.debateId}`)
    else if (clip.sourceUrl) window.open(clip.sourceUrl, '_blank', 'noopener')
  }

  const commentCount = Math.floor(likeCount * 0.3)

  const audioTitle = clip.debateTitle || clip.hookText || 'Parley Debate'

  return (
    <div
      className={clsx(
        'relative w-full h-full overflow-hidden select-none',
        !hasVideo && !hasEmbed ? `bg-gradient-to-b ${bg}` : 'bg-black'
      )}
    >
      {/* ── Full-screen video ── */}
      {hasVideo && (
        <video
          src={clip.videoUrl!}
          autoPlay={isActive}
          loop
          muted
          playsInline
          className="absolute inset-0 w-full h-full object-cover"
        />
      )}

      {/* ── Embed ── */}
      {hasEmbed && !isInstagram && (
        <div
          className="absolute inset-0 w-full h-full overflow-hidden pointer-events-none"
          dangerouslySetInnerHTML={{ __html: clip.embedHtml! }}
        />
      )}

      {/* ── Bottom gradient ── */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent pointer-events-none" />
      {/* ── Subtle top gradient for readability ── */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-transparent pointer-events-none" />

      {/* ══════════════════════════════════════
          RIGHT RAIL — action buttons (Instagram style)
      ══════════════════════════════════════ */}
      <div
        className="absolute right-3 flex flex-col items-center gap-5 z-20"
        style={{ bottom: 'calc(5rem + env(safe-area-inset-bottom))' }}
      >
        {/* Avatar with category icon */}
        <div className="flex flex-col items-center gap-1 mb-1">
          <div className={clsx(
            'w-11 h-11 rounded-full flex items-center justify-center text-xl border-2 border-white shadow-lg',
            avatarBg
          )}>
            {icon}
          </div>
          {/* Follow / + button */}
          <div className="-mt-3 w-5 h-5 rounded-full bg-rose-500 flex items-center justify-center text-white text-xs font-bold shadow">
            +
          </div>
        </div>

        {/* Like */}
        <button
          onClick={handleLike}
          className={clsx(
            'flex flex-col items-center gap-0.5 transition-all active:scale-90',
            liked ? 'text-rose-500' : 'text-white'
          )}
        >
          <HeartIcon filled={liked} />
          <span className="text-[11px] font-semibold drop-shadow">
            {likeCount > 999 ? `${(likeCount / 1000).toFixed(1)}K` : likeCount}
          </span>
        </button>

        {/* Comment */}
        <button
          onClick={handleWatch}
          className="flex flex-col items-center gap-0.5 text-white active:scale-90 transition-transform"
        >
          <CommentIcon />
          <span className="text-[11px] font-semibold drop-shadow">
            {commentCount > 999 ? `${(commentCount / 1000).toFixed(1)}K` : commentCount}
          </span>
        </button>

        {/* Share */}
        <button
          className="flex flex-col items-center gap-0.5 text-white active:scale-90 transition-transform"
        >
          <ShareIcon />
          <span className="text-[11px] font-semibold drop-shadow">Share</span>
        </button>

        {/* Save */}
        <button
          onClick={() => setSaved((v) => !v)}
          className={clsx(
            'flex flex-col items-center gap-0.5 active:scale-90 transition-all',
            saved ? 'text-yellow-400' : 'text-white'
          )}
        >
          <BookmarkIcon saved={saved} />
        </button>

        {/* More */}
        <button className="text-white active:scale-90 transition-transform">
          <MoreIcon />
        </button>
      </div>

      {/* ══════════════════════════════════════
          BOTTOM LEFT — caption + debate content
      ══════════════════════════════════════ */}
      <div
        className="absolute left-0 z-20 pr-16"
        style={{
          bottom: 'calc(5rem + env(safe-area-inset-bottom))',
          maxWidth: '78%',
        }}
      >
        <div className="px-4 flex flex-col gap-2.5">
          {/* Username row */}
          <div className="flex items-center gap-2">
            <span className="text-white font-bold text-[13px] drop-shadow">
              @{clip.forUsername}
            </span>
            {clip.againstUsername && (
              <>
                <span className="text-white/50 text-xs">vs</span>
                <span className="text-white/80 font-semibold text-[13px] drop-shadow">
                  @{clip.againstUsername}
                </span>
              </>
            )}
          </div>

          {/* Caption / hookText */}
          <div>
            <p
              className={clsx(
                'text-white text-[13px] leading-snug drop-shadow',
                !captionExpanded && 'line-clamp-2'
              )}
            >
              {clip.hookText}
            </p>
            {clip.hookText.length > 80 && !captionExpanded && (
              <button
                onClick={() => setCaptionExpanded(true)}
                className="text-white/60 text-[12px] mt-0.5"
              >
                ...more
              </button>
            )}
          </div>

          {/* FOR vs AGAINST cards */}
          {(clip.claimText || clip.counterText) && (
            <div className={clsx('grid grid-cols-2 gap-1.5 rounded-xl overflow-hidden border', border)}>
              {clip.claimText && (
                <div className="bg-black/40 backdrop-blur-sm p-2.5 flex flex-col gap-1">
                  <span className={clsx('text-[9px] font-bold uppercase tracking-widest', accent)}>
                    FOR
                  </span>
                  <p className="text-white/90 text-[11px] leading-relaxed line-clamp-3 drop-shadow">
                    "{clip.claimText}"
                  </p>
                </div>
              )}
              {clip.counterText && (
                <div className="bg-black/40 backdrop-blur-sm p-2.5 flex flex-col gap-1 border-l border-white/10">
                  <span className="text-[9px] font-bold uppercase tracking-widest text-gray-400">
                    AGAINST
                  </span>
                  <p className="text-white/90 text-[11px] leading-relaxed line-clamp-3 drop-shadow">
                    "{clip.counterText}"
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Crowd vote result */}
          {clip.crowdVoteResult && (
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-white/50">🗳️</span>
              <span className={clsx('text-[11px] font-semibold drop-shadow', accent)}>
                {clip.crowdVoteResult}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* ══════════════════════════════════════
          AUDIO BAR — scrolling debate title
      ══════════════════════════════════════ */}
      <div
        className="absolute left-0 right-0 z-20 px-4 flex items-center gap-3"
        style={{ bottom: 'calc(1.5rem + env(safe-area-inset-bottom))' }}
      >
        <SpinningDisc spinning={isActive} color={avatarBg} />
        <div className="flex-1 overflow-hidden">
          <div
            ref={audioScrollRef}
            className={clsx(
              'whitespace-nowrap text-white text-[12px] font-medium drop-shadow',
              isActive && 'animate-marquee'
            )}
          >
            ♫&nbsp;&nbsp;{audioTitle}&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;♫&nbsp;&nbsp;{audioTitle}
          </div>
        </div>
        {/* Watch / link-out button */}
        {(clip.debateId || clip.sourceUrl) && (
          <button
            onClick={handleWatch}
            className={clsx(
              'shrink-0 rounded-full px-3 py-1 text-[11px] font-bold border',
              accent.replace('text-', 'border-').replace('-400', '-500/50'),
              accent,
              'bg-black/30 backdrop-blur-sm active:scale-95 transition-transform'
            )}
          >
            {isInstagram ? 'Instagram ↗' : clip.debateId ? 'Watch ▶' : 'View ↗'}
          </button>
        )}
      </div>
    </div>
  )
}
