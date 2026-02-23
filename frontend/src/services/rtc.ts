import { db } from '../lib/firebase'
import {
  doc,
  setDoc,
  updateDoc,
  getDoc,
  onSnapshot,
  arrayUnion,
} from 'firebase/firestore'

function signalingDoc(debateId: string, name: string) {
  return doc(db, 'debates', debateId, 'rtcSignaling', name)
}

export async function writeOffer(debateId: string, sdp: string): Promise<void> {
  await setDoc(signalingDoc(debateId, 'offer'), { sdp, createdAt: Date.now() })
}

export async function writeAnswer(debateId: string, sdp: string): Promise<void> {
  await setDoc(signalingDoc(debateId, 'answer'), { sdp, createdAt: Date.now() })
}

export async function addIceCandidate(
  debateId: string,
  side: 'for' | 'against',
  candidate: RTCIceCandidateInit
): Promise<void> {
  const ref = signalingDoc(debateId, `ice_${side}`)
  const snap = await getDoc(ref)
  if (snap.exists()) {
    await updateDoc(ref, { candidates: arrayUnion(candidate) })
  } else {
    await setDoc(ref, { candidates: [candidate] })
  }
}

export function onOffer(
  debateId: string,
  cb: (sdp: string) => void
): () => void {
  return onSnapshot(signalingDoc(debateId, 'offer'), (snap) => {
    if (snap.exists()) cb(snap.data()!.sdp as string)
  })
}

export function onAnswer(
  debateId: string,
  cb: (sdp: string) => void
): () => void {
  return onSnapshot(signalingDoc(debateId, 'answer'), (snap) => {
    if (snap.exists()) cb(snap.data()!.sdp as string)
  })
}

export function onIceCandidates(
  debateId: string,
  side: 'for' | 'against',
  cb: (candidates: RTCIceCandidateInit[]) => void
): () => void {
  return onSnapshot(signalingDoc(debateId, `ice_${side}`), (snap) => {
    if (snap.exists()) cb(snap.data()!.candidates as RTCIceCandidateInit[])
  })
}
