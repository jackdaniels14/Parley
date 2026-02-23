import { useEffect, useRef, useState, useCallback } from 'react'
import {
  writeOffer,
  writeAnswer,
  addIceCandidate,
  onOffer,
  onAnswer,
  onIceCandidates,
} from '../services/rtc'

const ICE_SERVERS = [{ urls: 'stun:stun.l.google.com:19302' }]

export function useWebRTC(debateId: string, side: 'for' | 'against') {
  const [localStream, setLocalStream] = useState<MediaStream | null>(null)
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null)
  const [connectionState, setConnectionState] =
    useState<RTCPeerConnectionState>('new')

  const pcRef = useRef<RTCPeerConnection | null>(null)
  const recorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const processedCandidatesRef = useRef<Set<string>>(new Set())

  useEffect(() => {
    let unsubOffer: (() => void) | null = null
    let unsubAnswer: (() => void) | null = null
    let unsubIce: (() => void) | null = null
    let capturedStream: MediaStream | null = null

    async function init() {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      })
      capturedStream = stream
      setLocalStream(stream)

      const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS })
      pcRef.current = pc

      stream.getTracks().forEach((track) => pc.addTrack(track, stream))

      const remote = new MediaStream()
      setRemoteStream(remote)

      pc.ontrack = (e) => {
        e.streams[0]?.getTracks().forEach((t) => remote.addTrack(t))
      }

      pc.onconnectionstatechange = () => setConnectionState(pc.connectionState)

      pc.onicecandidate = (e) => {
        if (e.candidate) {
          addIceCandidate(debateId, side, e.candidate.toJSON())
        }
      }

      const opponentSide: 'for' | 'against' = side === 'for' ? 'against' : 'for'

      unsubIce = onIceCandidates(debateId, opponentSide, (candidates) => {
        candidates.forEach((c) => {
          const key = JSON.stringify(c)
          if (!processedCandidatesRef.current.has(key)) {
            processedCandidatesRef.current.add(key)
            pc.addIceCandidate(new RTCIceCandidate(c)).catch(() => {})
          }
        })
      })

      if (side === 'for') {
        const offer = await pc.createOffer()
        await pc.setLocalDescription(offer)
        await writeOffer(debateId, offer.sdp!)

        unsubAnswer = onAnswer(debateId, async (sdp) => {
          if (pc.signalingState !== 'have-local-offer') return
          await pc.setRemoteDescription({ type: 'answer', sdp })
        })
      } else {
        unsubOffer = onOffer(debateId, async (sdp) => {
          if (pc.signalingState !== 'stable') return
          await pc.setRemoteDescription({ type: 'offer', sdp })
          const answer = await pc.createAnswer()
          await pc.setLocalDescription(answer)
          await writeAnswer(debateId, answer.sdp!)
        })
      }
    }

    init().catch(console.error)

    return () => {
      unsubOffer?.()
      unsubAnswer?.()
      unsubIce?.()
      pcRef.current?.close()
      capturedStream?.getTracks().forEach((t) => t.stop())
    }
  }, [debateId, side])

  const startRecording = useCallback(() => {
    if (!localStream) return
    chunksRef.current = []
    const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
      ? 'video/webm;codecs=vp9'
      : 'video/webm'
    const recorder = new MediaRecorder(localStream, { mimeType })
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data)
    }
    recorder.start(1000)
    recorderRef.current = recorder
  }, [localStream])

  const stopRecording = useCallback(() => {
    recorderRef.current?.stop()
  }, [])

  const getRecordingBlob = useCallback((): Blob => {
    return new Blob(chunksRef.current, { type: 'video/webm' })
  }, [])

  return {
    localStream,
    remoteStream,
    startRecording,
    stopRecording,
    getRecordingBlob,
    connectionState,
  }
}
