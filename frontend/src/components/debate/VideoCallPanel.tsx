import { useEffect, useRef, useState } from 'react'
import { useAuthStore } from '../../store/auth'
import { useWebRTC } from '../../hooks/useWebRTC'
import { uploadClipVideo } from '../../lib/storage'
import { createClip } from '../../services/firestore'
import type { Debate } from '../../types'

interface VideoCallPanelProps {
  debateId: string
  side: 'for' | 'against'
  debate: Debate
}

export default function VideoCallPanel({ debateId, side, debate }: VideoCallPanelProps) {
  const user = useAuthStore((s) => s.user)
  const { localStream, remoteStream, startRecording, stopRecording, getRecordingBlob, connectionState } =
    useWebRTC(debateId, side)

  const localRef = useRef<HTMLVideoElement>(null)
  const remoteRef = useRef<HTMLVideoElement>(null)

  const [isMuted, setIsMuted] = useState(false)
  const [isCameraOff, setIsCameraOff] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [seconds, setSeconds] = useState(0)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploadDone, setUploadDone] = useState(false)

  useEffect(() => {
    if (localRef.current && localStream) {
      localRef.current.srcObject = localStream
    }
  }, [localStream])

  useEffect(() => {
    if (remoteRef.current && remoteStream) {
      remoteRef.current.srcObject = remoteStream
    }
  }, [remoteStream])

  // Auto-start recording once peer is connected
  useEffect(() => {
    if (connectionState === 'connected' && !isRecording) {
      startRecording()
      setIsRecording(true)
    }
  }, [connectionState, isRecording, startRecording])

  // Recording timer
  useEffect(() => {
    if (!isRecording) return
    const interval = setInterval(() => setSeconds((s) => s + 1), 1000)
    return () => clearInterval(interval)
  }, [isRecording])

  function formatTime(s: number) {
    const m = Math.floor(s / 60)
    const sec = s % 60
    return `${m}:${sec.toString().padStart(2, '0')}`
  }

  function toggleMute() {
    if (!localStream) return
    const track = localStream.getAudioTracks()[0]
    if (track) track.enabled = !track.enabled
    setIsMuted((v) => !v)
  }

  function toggleCamera() {
    if (!localStream) return
    const track = localStream.getVideoTracks()[0]
    if (track) track.enabled = !track.enabled
    setIsCameraOff((v) => !v)
  }

  async function handleEnd() {
    if (!user || isUploading) return
    stopRecording()
    setIsRecording(false)
    setIsUploading(true)
    try {
      // Give the recorder a moment to flush its last chunk
      await new Promise((res) => setTimeout(res, 600))
      const blob = getRecordingBlob()
      if (blob.size === 0) return
      const file = new File([blob], 'debate-recording.webm', { type: 'video/webm' })
      const videoUrl = await uploadClipVideo(user.id, file, setUploadProgress)
      await createClip(user.id, {
        debateId,
        type: 'highlight',
        title: debate.title,
        hookText: debate.title.slice(0, 80),
        claimText: debate.forSide.position,
        counterText: debate.againstSide.position,
        resultText: '',
        argumentIds: [],
        crowdVoteResult: '',
        cardImageUrl: null,
        cardTemplate: 'dark',
        debateTitle: debate.title,
        topicCategory: debate.topicCategory,
        forUsername: debate.forSide.teamMembers[0]?.username ?? '',
        againstUsername: debate.againstSide.teamMembers[0]?.username ?? '',
        videoUrl,
        sourcePlatform: 'upload',
        sourceUrl: null,
        embedHtml: null,
      })
      setUploadDone(true)
    } catch (err) {
      console.error('Failed to upload recording:', err)
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <div className="relative rounded-2xl overflow-hidden bg-black aspect-video max-h-[60dvh] w-full">
      {/* Remote video (full frame) */}
      <video
        ref={remoteRef}
        autoPlay
        playsInline
        className="w-full h-full object-cover"
      />

      {/* Connecting / waiting overlay */}
      {connectionState !== 'connected' && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/75">
          <div className="text-center text-white">
            <div className="text-3xl mb-2">📡</div>
            <p className="text-sm font-semibold">
              {connectionState === 'failed'
                ? 'Connection failed'
                : 'Connecting to opponent...'}
            </p>
          </div>
        </div>
      )}

      {/* Upload-done banner */}
      {uploadDone && (
        <div className="absolute top-4 left-0 right-0 flex justify-center">
          <span className="bg-green-600 text-white text-xs font-semibold px-4 py-1.5 rounded-full">
            Recording saved to your clips!
          </span>
        </div>
      )}

      {/* Local PiP */}
      <video
        ref={localRef}
        autoPlay
        playsInline
        muted
        className="absolute bottom-16 right-4 w-28 h-20 rounded-xl object-cover border-2 border-white/30 shadow-lg"
      />

      {/* Controls bar */}
      <div className="absolute bottom-0 left-0 right-0 flex items-center justify-between px-4 py-3 bg-gradient-to-t from-black/80 to-transparent">
        <div className="flex items-center gap-2">
          {isRecording && (
            <span className="flex items-center gap-1.5 text-xs text-white/90">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              {formatTime(seconds)}
            </span>
          )}
          {isUploading && (
            <span className="text-xs text-white/80">
              Uploading {uploadProgress}%...
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={toggleMute}
            title={isMuted ? 'Unmute' : 'Mute'}
            className={`w-9 h-9 rounded-full flex items-center justify-center text-sm transition-colors ${
              isMuted
                ? 'bg-red-500 text-white'
                : 'bg-white/20 hover:bg-white/30 text-white'
            }`}
          >
            {isMuted ? '🔇' : '🎙️'}
          </button>
          <button
            onClick={toggleCamera}
            title={isCameraOff ? 'Turn on camera' : 'Turn off camera'}
            className={`w-9 h-9 rounded-full flex items-center justify-center text-sm transition-colors ${
              isCameraOff
                ? 'bg-red-500 text-white'
                : 'bg-white/20 hover:bg-white/30 text-white'
            }`}
          >
            {isCameraOff ? '🚫' : '📷'}
          </button>
          <button
            onClick={handleEnd}
            disabled={isUploading}
            className="px-4 py-1.5 rounded-full bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-xs font-semibold transition-colors"
          >
            End & Save
          </button>
        </div>
      </div>
    </div>
  )
}
