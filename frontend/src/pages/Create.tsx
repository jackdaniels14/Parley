import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import UploadClipModal from '../components/clips/UploadClipModal'
import ImportClipModal from '../components/clips/ImportClipModal'
import VideoEditorModal from '../components/clips/VideoEditorModal'
import { useQueryClient } from '@tanstack/react-query'

type ActiveModal = 'upload' | 'import' | 'editor' | null

const OPTIONS = [
  {
    id: 'upload' as const,
    icon: '📤',
    label: 'Upload Video',
    description: 'Share a video clip from your device',
    gradient: 'from-violet-600 to-purple-700',
    border: 'border-violet-500/30',
  },
  {
    id: 'import' as const,
    icon: '🔗',
    label: 'Import from URL',
    description: 'Pull in a clip from YouTube, TikTok or Twitter',
    gradient: 'from-sky-600 to-blue-700',
    border: 'border-sky-500/30',
  },
  {
    id: 'editor' as const,
    icon: '✂️',
    label: 'Edit Video',
    description: 'Trim, annotate and export a clip in-browser',
    gradient: 'from-pink-600 to-rose-700',
    border: 'border-pink-500/30',
  },
]

export default function Create() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [active, setActive] = useState<ActiveModal>(null)

  function handleCreated() {
    queryClient.invalidateQueries({ queryKey: ['clips', 'feed'] })
    navigate('/')
  }

  return (
    <div className="min-h-[calc(100dvh-3.5rem)] bg-black flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-5 border-b border-white/10">
        <h1 className="text-white text-xl font-bold">Create</h1>
        <button
          onClick={() => navigate(-1)}
          className="text-gray-400 hover:text-white transition-colors text-sm"
        >
          Cancel
        </button>
      </div>

      {/* Options */}
      <div className="flex-1 flex flex-col justify-center gap-4 px-5 py-8 max-w-lg mx-auto w-full">
        {OPTIONS.map((opt) => (
          <button
            key={opt.id}
            onClick={() => setActive(opt.id)}
            className={`
              relative flex items-center gap-5 rounded-2xl border p-5 text-left
              bg-gradient-to-r ${opt.gradient} bg-opacity-10
              ${opt.border} border
              active:scale-[0.98] transition-transform
              hover:brightness-110
            `}
          >
            <span className="text-4xl w-12 text-center shrink-0">{opt.icon}</span>
            <div>
              <p className="text-white font-bold text-base leading-snug">{opt.label}</p>
              <p className="text-white/60 text-sm mt-0.5 leading-snug">{opt.description}</p>
            </div>
            <svg
              className="ml-auto shrink-0 text-white/40 w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
            </svg>
          </button>
        ))}
      </div>

      {/* Modals */}
      <UploadClipModal
        isOpen={active === 'upload'}
        onClose={() => setActive(null)}
        onCreated={handleCreated}
      />
      <ImportClipModal
        isOpen={active === 'import'}
        onClose={() => setActive(null)}
        onCreated={handleCreated}
      />
      <VideoEditorModal
        isOpen={active === 'editor'}
        onClose={() => setActive(null)}
        onCreated={handleCreated}
      />
    </div>
  )
}
