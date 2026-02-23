import { useState, useRef, useCallback, useEffect } from 'react'
import { useAuthStore } from '../../store/auth'
import { uploadClipVideo } from '../../lib/storage'
import { createClip } from '../../services/firestore'
import { processVideoClipsFn } from '../../services/functions'
import { CATEGORIES } from '../../constants/categories'
import type { TopicCategory } from '../../types'
import clsx from 'clsx'

interface VideoEditorModalProps {
  isOpen: boolean
  onClose: () => void
  onCreated: () => void
  debateId?: string
}

type Step = 'pick' | 'edit' | 'export' | 'upload'

interface TextOverlay {
  text: string
  position: 'top' | 'center' | 'bottom'
  fontSize: number
}

interface AiSuggestion {
  startTime: number
  endTime: number
  hookText: string
  reason: string
}

const MAX_SIZE_MB = 500

export default function VideoEditorModal({
  isOpen,
  onClose,
  onCreated,
  debateId,
}: VideoEditorModalProps) {
  const user = useAuthStore((s) => s.user)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animFrameRef = useRef<number>(0)

  const [step, setStep] = useState<Step>('pick')
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Editor state
  const [duration, setDuration] = useState(0)
  const [startTime, setStartTime] = useState(0)
  const [endTime, setEndTime] = useState(0)
  const [overlay, setOverlay] = useState<TextOverlay>({
    text: '',
    position: 'bottom',
    fontSize: 24,
  })
  const [speed, setSpeed] = useState(1)

  // Export state
  const [exportProgress, setExportProgress] = useState(0)
  const [isExporting, setIsExporting] = useState(false)
  const [exportedBlob, setExportedBlob] = useState<Blob | null>(null)

  // Upload state
  const [hookText, setHookText] = useState('')
  const [category, setCategory] = useState<TopicCategory>('Culture & Trends')
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)

  // AI suggestions
  const [aiSuggestions, setAiSuggestions] = useState<AiSuggestion[]>([])
  const [isLoadingAi, setIsLoadingAi] = useState(false)
  const [aiError, setAiError] = useState<string | null>(null)
  // clipId is stored after a clip is created for AI suggestion context
  const [clipId, setClipId] = useState<string | null>(null)

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
    const url = URL.createObjectURL(f)
    setPreviewUrl(url)
    setStep('edit')
  }

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const f = e.dataTransfer.files[0]
    if (f) handleFile(f)
  }, [])

  function handleVideoLoaded() {
    const v = videoRef.current
    if (!v) return
    const d = v.duration
    setDuration(d)
    setStartTime(0)
    setEndTime(d)
  }

  // Keep playback rate in sync
  useEffect(() => {
    if (videoRef.current) videoRef.current.playbackRate = speed
  }, [speed])

  async function handleExport() {
    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas) return

    setIsExporting(true)
    setStep('export')
    setExportProgress(0)

    canvas.width = video.videoWidth || 640
    canvas.height = video.videoHeight || 360
    const ctx = canvas.getContext('2d')!

    const trimDuration = endTime - startTime
    const realDuration = trimDuration / speed
    const startMs = Date.now()

    const chunks: Blob[] = []
    const stream = canvas.captureStream(30)
    const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
      ? 'video/webm;codecs=vp9'
      : 'video/webm'
    const recorder = new MediaRecorder(stream, { mimeType })
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunks.push(e.data)
    }

    function drawFrame() {
      if (!video || !canvas) return
      if (video.currentTime >= endTime || video.ended || video.paused) {
        recorder.stop()
        return
      }
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height)

      if (overlay.text) {
        ctx.font = `bold ${overlay.fontSize}px sans-serif`
        const textWidth = ctx.measureText(overlay.text).width
        const x = (canvas.width - textWidth) / 2
        let y = canvas.height / 2
        if (overlay.position === 'top') y = overlay.fontSize + 16
        if (overlay.position === 'bottom') y = canvas.height - 24

        ctx.fillStyle = 'rgba(0,0,0,0.55)'
        ctx.fillRect(x - 10, y - overlay.fontSize, textWidth + 20, overlay.fontSize + 14)
        ctx.fillStyle = 'white'
        ctx.fillText(overlay.text, x, y)
      }

      const elapsed = (Date.now() - startMs) / 1000
      setExportProgress(Math.min(99, Math.round((elapsed / realDuration) * 100)))
      animFrameRef.current = requestAnimationFrame(drawFrame)
    }

    recorder.onstop = () => {
      cancelAnimationFrame(animFrameRef.current)
      const blob = new Blob(chunks, { type: 'video/webm' })
      setExportedBlob(blob)
      setExportProgress(100)
      setIsExporting(false)
    }

    // Seek to start then play
    video.currentTime = startTime
    video.playbackRate = speed
    await new Promise<void>((resolve) => {
      video.onseeked = () => resolve()
    })

    recorder.start(100)
    video.play()
    drawFrame()
  }

  async function handleLoadAiSuggestions() {
    // Need a clip to pass to the function; use clipId if already uploaded,
    // otherwise debateId can be used as a fallback via a draft approach.
    // The callable expects a clipId, so if we don't have one yet we skip.
    const id = clipId
    if (!id) {
      setAiError('Upload the clip first, then use AI suggestions on it from the feed.')
      return
    }
    setAiError(null)
    setIsLoadingAi(true)
    try {
      const result = await processVideoClipsFn(id)
      setAiSuggestions(result.suggestions)
    } catch (err) {
      console.error('AI suggestions failed:', err)
      setAiError('Could not load suggestions. Try again.')
    } finally {
      setIsLoadingAi(false)
    }
  }

  function applySuggestion(s: AiSuggestion) {
    setStartTime(Math.max(0, Math.min(s.startTime, duration - 1)))
    setEndTime(Math.min(duration, Math.max(s.endTime, s.startTime + 1)))
    setHookText(s.hookText)
  }

  async function handleUpload() {
    if (!user || !exportedBlob || !hookText.trim()) return
    setIsUploading(true)
    setError(null)
    try {
      const f = new File([exportedBlob], 'edited-clip.webm', { type: 'video/webm' })
      const videoUrl = await uploadClipVideo(user.id, f, setUploadProgress)
      const id = await createClip(user.id, {
        debateId: debateId ?? '',
        type: 'highlight',
        title: hookText.trim().slice(0, 60),
        hookText: hookText.trim(),
        claimText: '',
        counterText: '',
        resultText: '',
        argumentIds: [],
        crowdVoteResult: '',
        cardImageUrl: null,
        cardTemplate: 'dark',
        debateTitle: hookText.trim().slice(0, 60),
        topicCategory: category,
        forUsername: user.username,
        againstUsername: '',
        videoUrl,
        sourcePlatform: 'upload',
        sourceUrl: null,
        embedHtml: null,
      })
      setClipId(id)
      onCreated()
      handleClose()
    } catch (err) {
      setError('Upload failed. Please try again.')
      console.error(err)
    } finally {
      setIsUploading(false)
    }
  }

  function handleClose() {
    if (isExporting || isUploading) return
    cancelAnimationFrame(animFrameRef.current)
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setPreviewUrl(null)
    setStep('pick')
    setStartTime(0)
    setEndTime(0)
    setDuration(0)
    setOverlay({ text: '', position: 'bottom', fontSize: 24 })
    setSpeed(1)
    setExportedBlob(null)
    setExportProgress(0)
    setHookText('')
    setCategory('Culture & Trends')
    setError(null)
    setAiSuggestions([])
    setAiError(null)
    setClipId(null)
    onClose()
  }

  if (!isOpen) return null

  const stepLabel =
    step === 'pick'
      ? 'Step 1 — Pick a file'
      : step === 'edit'
      ? 'Step 2 — Edit'
      : step === 'export'
      ? 'Step 3 — Export'
      : 'Step 4 — Upload'

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="fixed inset-0 bg-black/60" onClick={handleClose} />
      <div className="relative w-full sm:max-w-2xl bg-white dark:bg-gray-900 rounded-t-2xl sm:rounded-2xl shadow-2xl flex flex-col max-h-[95dvh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-800 sticky top-0 bg-white dark:bg-gray-900 z-10">
          <div>
            <h2 className="font-bold text-gray-900 dark:text-white">Video Editor</h2>
            <p className="text-xs text-gray-400 mt-0.5">{stepLabel}</p>
          </div>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-2xl leading-none"
          >
            &times;
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* ── Step 1: Pick file ── */}
          {step === 'pick' && (
            <div
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={clsx(
                'border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-colors',
                isDragging
                  ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/10'
                  : 'border-gray-300 dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-600'
              )}
            >
              <div className="text-4xl mb-3">🎬</div>
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Drop a video here or click to browse
              </p>
              <p className="text-xs text-gray-400 mt-1">MP4, MOV, WebM — up to 500MB</p>
              <input
                ref={fileInputRef}
                type="file"
                accept="video/*"
                className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f) }}
              />
            </div>
          )}

          {/* ── Step 2: Edit ── */}
          {step === 'edit' && (
            <>
              {/* Video preview */}
              <div className="rounded-xl overflow-hidden bg-black aspect-video">
                <video
                  ref={videoRef}
                  src={previewUrl ?? undefined}
                  onLoadedMetadata={handleVideoLoaded}
                  controls
                  className="w-full h-full object-contain"
                />
              </div>

              {/* Hidden export canvas */}
              <canvas ref={canvasRef} className="hidden" />

              {/* Trim controls */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Trim
                </label>
                <div className="space-y-2">
                  <div className="flex items-center gap-3 text-xs text-gray-500">
                    <span className="w-20 shrink-0">Start: {startTime.toFixed(1)}s</span>
                    <input
                      type="range"
                      min={0}
                      max={Math.max(0, endTime - 0.5)}
                      step={0.1}
                      value={startTime}
                      onChange={(e) => setStartTime(parseFloat(e.target.value))}
                      className="flex-1 accent-violet-600"
                    />
                  </div>
                  <div className="flex items-center gap-3 text-xs text-gray-500">
                    <span className="w-20 shrink-0">End: {endTime.toFixed(1)}s</span>
                    <input
                      type="range"
                      min={startTime + 0.5}
                      max={duration}
                      step={0.1}
                      value={endTime}
                      onChange={(e) => setEndTime(parseFloat(e.target.value))}
                      className="flex-1 accent-violet-600"
                    />
                  </div>
                </div>
                <p className="text-xs text-gray-400 mt-1">
                  Clip duration: {(endTime - startTime).toFixed(1)}s
                </p>
              </div>

              {/* Text overlay */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Text Overlay
                </label>
                <input
                  type="text"
                  value={overlay.text}
                  onChange={(e) => setOverlay({ ...overlay, text: e.target.value })}
                  placeholder="Overlay text (optional)"
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white placeholder-gray-400 mb-2"
                />
                <div className="flex items-center gap-2 flex-wrap">
                  {(['top', 'center', 'bottom'] as const).map((pos) => (
                    <button
                      key={pos}
                      onClick={() => setOverlay({ ...overlay, position: pos })}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-colors ${
                        overlay.position === pos
                          ? 'bg-primary-500 text-white'
                          : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                      }`}
                    >
                      {pos}
                    </button>
                  ))}
                  <div className="flex items-center gap-1 ml-auto">
                    <input
                      type="number"
                      value={overlay.fontSize}
                      onChange={(e) =>
                        setOverlay({ ...overlay, fontSize: Math.max(12, parseInt(e.target.value) || 24) })
                      }
                      min={12}
                      max={72}
                      className="w-14 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-2 py-1.5 text-xs text-center text-gray-900 dark:text-white"
                    />
                    <span className="text-xs text-gray-400">px</span>
                  </div>
                </div>
              </div>

              {/* Speed */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Playback Speed
                </label>
                <div className="flex items-center gap-2">
                  {[0.5, 0.75, 1, 1.5, 2].map((s) => (
                    <button
                      key={s}
                      onClick={() => setSpeed(s)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                        speed === s
                          ? 'bg-primary-500 text-white'
                          : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                      }`}
                    >
                      {s}×
                    </button>
                  ))}
                </div>
              </div>

              {/* AI Clip Suggestions (only shown when debateId provided) */}
              {debateId && (
                <div className="border border-gray-200 dark:border-gray-700 rounded-xl p-4 space-y-3">
                  <button
                    onClick={handleLoadAiSuggestions}
                    disabled={isLoadingAi}
                    className="flex items-center gap-2 text-sm font-medium text-primary-600 dark:text-violet-400 hover:underline disabled:opacity-50"
                  >
                    ✨ {isLoadingAi ? 'Loading AI suggestions...' : 'AI Clip Suggestions'}
                  </button>
                  {aiError && (
                    <p className="text-xs text-red-500">{aiError}</p>
                  )}
                  {aiSuggestions.length > 0 && (
                    <div className="space-y-2">
                      {aiSuggestions.map((s, i) => (
                        <button
                          key={i}
                          onClick={() => applySuggestion(s)}
                          className="w-full text-left rounded-xl border border-gray-200 dark:border-gray-700 p-3 hover:border-primary-400 dark:hover:border-violet-500 transition-colors"
                        >
                          <p className="text-sm font-semibold text-gray-900 dark:text-white">
                            {s.hookText}
                          </p>
                          <p className="text-xs text-gray-500 mt-0.5">
                            {s.startTime.toFixed(0)}s–{s.endTime.toFixed(0)}s · {s.reason}
                          </p>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <button
                onClick={handleExport}
                className="w-full py-3 rounded-xl bg-primary-600 hover:bg-primary-700 text-white font-semibold text-sm transition-colors"
              >
                Export Clip
              </button>
            </>
          )}

          {/* ── Step 3: Export ── */}
          {step === 'export' && (
            <div className="space-y-5">
              <div className="text-center py-6">
                <div className="text-4xl mb-3">{isExporting ? '⚙️' : '✅'}</div>
                <p className="font-semibold text-gray-900 dark:text-white">
                  {isExporting ? 'Exporting clip...' : 'Export complete!'}
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  {isExporting ? 'Rendering frames via canvas...' : 'Ready to upload.'}
                </p>
              </div>

              <div>
                <div className="flex justify-between text-xs text-gray-500 mb-1">
                  <span>Processing</span>
                  <span>{exportProgress}%</span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div
                    className="bg-primary-600 h-2 rounded-full transition-all duration-200"
                    style={{ width: `${exportProgress}%` }}
                  />
                </div>
              </div>

              {!isExporting && exportedBlob && (
                <button
                  onClick={() => setStep('upload')}
                  className="w-full py-3 rounded-xl bg-primary-600 hover:bg-primary-700 text-white font-semibold text-sm transition-colors"
                >
                  Continue to Upload
                </button>
              )}
            </div>
          )}

          {/* ── Step 4: Upload ── */}
          {step === 'upload' && (
            <div className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Hook text <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={hookText}
                  onChange={(e) => setHookText(e.target.value)}
                  placeholder="What's this clip about? (shown as headline)"
                  rows={2}
                  maxLength={120}
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white placeholder-gray-400 resize-none"
                />
                <p className="text-xs text-gray-400 mt-1 text-right">{hookText.length}/120</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Category
                </label>
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

              {isUploading && (
                <div>
                  <div className="flex justify-between text-xs text-gray-500 mb-1">
                    <span>Uploading...</span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div
                      className="bg-primary-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                </div>
              )}

              {error && (
                <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-lg px-3 py-2">
                  {error}
                </p>
              )}

              <button
                onClick={handleUpload}
                disabled={!hookText.trim() || isUploading}
                className="w-full py-3 rounded-xl bg-primary-600 hover:bg-primary-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold text-sm transition-colors"
              >
                {isUploading ? `Uploading ${uploadProgress}%...` : 'Upload Clip'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
