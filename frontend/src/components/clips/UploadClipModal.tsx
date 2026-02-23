import { useState, useRef, useCallback } from 'react'
import { useAuthStore } from '../../store/auth'
import { uploadClipVideo } from '../../lib/storage'
import { createClip } from '../../services/firestore'
import { CATEGORIES } from '../../constants/categories'
import type { TopicCategory } from '../../types'
import clsx from 'clsx'

interface UploadClipModalProps {
  isOpen: boolean
  onClose: () => void
  onCreated: () => void
}

const MAX_SIZE_MB = 500

export default function UploadClipModal({ isOpen, onClose, onCreated }: UploadClipModalProps) {
  const user = useAuthStore((s) => s.user)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [file, setFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [hookText, setHookText] = useState('')
  const [title, setTitle] = useState('')
  const [category, setCategory] = useState<TopicCategory>('Culture & Trends')
  const [progress, setProgress] = useState(0)
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)

  function handleFile(f: File) {
    setError(null)
    if (!f.type.startsWith('video/')) {
      setError('Please select a video file.')
      return
    }
    if (f.size > MAX_SIZE_MB * 1024 * 1024) {
      setError(`File must be under ${MAX_SIZE_MB}MB.`)
      return
    }
    setFile(f)
    const url = URL.createObjectURL(f)
    setPreviewUrl(url)
  }

  function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (f) handleFile(f)
  }

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const f = e.dataTransfer.files[0]
    if (f) handleFile(f)
  }, [])

  async function handleSubmit() {
    if (!user || !file || !hookText.trim()) return
    setIsUploading(true)
    setError(null)
    try {
      const videoUrl = await uploadClipVideo(user.id, file, setProgress)
      await createClip(user.id, {
        debateId: '',
        type: 'highlight',
        title: title.trim() || hookText.trim().slice(0, 60),
        hookText: hookText.trim(),
        claimText: '',
        counterText: '',
        resultText: '',
        argumentIds: [],
        crowdVoteResult: '',
        cardImageUrl: null,
        cardTemplate: 'dark',
        debateTitle: title.trim() || '',
        topicCategory: category,
        forUsername: user.username,
        againstUsername: '',
        videoUrl,
        sourcePlatform: 'upload',
        sourceUrl: null,
        embedHtml: null,
      })
      onCreated()
      handleClose()
    } catch (err) {
      setError('Upload failed. Please try again.')
      console.error(err)
    } finally {
      setIsUploading(false)
      setProgress(0)
    }
  }

  function handleClose() {
    if (isUploading) return
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setFile(null)
    setPreviewUrl(null)
    setHookText('')
    setTitle('')
    setCategory('Culture & Trends')
    setError(null)
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="fixed inset-0 bg-black/60" onClick={handleClose} />
      <div className="relative w-full sm:max-w-lg bg-white dark:bg-gray-900 rounded-t-2xl sm:rounded-2xl shadow-2xl flex flex-col max-h-[90dvh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-800 sticky top-0 bg-white dark:bg-gray-900 z-10">
          <h2 className="font-bold text-gray-900 dark:text-white">Upload Highlight Clip</h2>
          <button onClick={handleClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-2xl leading-none">&times;</button>
        </div>

        <div className="p-5 space-y-5">
          {/* Drop zone / preview */}
          {!file ? (
            <div
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={clsx(
                'border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors',
                isDragging
                  ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/10'
                  : 'border-gray-300 dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-600'
              )}
            >
              <div className="text-4xl mb-3">🎬</div>
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Drop a video here or click to browse</p>
              <p className="text-xs text-gray-400 mt-1">MP4, MOV, WebM — up to 500MB</p>
              <input ref={fileInputRef} type="file" accept="video/*" onChange={handleFileInput} className="hidden" />
            </div>
          ) : (
            <div className="rounded-xl overflow-hidden bg-black aspect-video relative">
              <video
                src={previewUrl ?? undefined}
                controls
                className="w-full h-full object-contain"
              />
              <button
                onClick={() => { setFile(null); if (previewUrl) URL.revokeObjectURL(previewUrl); setPreviewUrl(null) }}
                className="absolute top-2 right-2 bg-black/60 text-white rounded-full w-7 h-7 flex items-center justify-center text-sm hover:bg-black/80"
              >
                ✕
              </button>
            </div>
          )}

          {error && (
            <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          {/* Hook text */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              Hook text <span className="text-red-500">*</span>
            </label>
            <textarea
              value={hookText}
              onChange={(e) => setHookText(e.target.value)}
              placeholder="What's the debate? (shown as the headline)"
              rows={2}
              maxLength={120}
              className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white placeholder-gray-400 resize-none"
            />
            <p className="text-xs text-gray-400 mt-1 text-right">{hookText.length}/120</p>
          </div>

          {/* Title (optional) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              Title <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Full debate title"
              className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white placeholder-gray-400"
            />
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

          {/* Upload progress */}
          {isUploading && (
            <div>
              <div className="flex justify-between text-xs text-gray-500 mb-1">
                <span>Uploading...</span>
                <span>{progress}%</span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div
                  className="bg-primary-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}

          {/* Submit */}
          <button
            onClick={handleSubmit}
            disabled={!file || !hookText.trim() || isUploading}
            className="w-full py-3 rounded-xl bg-primary-600 hover:bg-primary-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold text-sm transition-colors"
          >
            {isUploading ? `Uploading ${progress}%...` : 'Upload Clip'}
          </button>
        </div>
      </div>
    </div>
  )
}
