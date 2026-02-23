import { getStorage, ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage'
import app from './firebase'

export const storage = getStorage(app)

export async function uploadClipVideo(
  userId: string,
  file: File,
  onProgress?: (pct: number) => void
): Promise<string> {
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
  const filename = `${Date.now()}-${safeName}`
  const storageRef = ref(storage, `clips/${userId}/${filename}`)
  const task = uploadBytesResumable(storageRef, file)

  return new Promise((resolve, reject) => {
    task.on(
      'state_changed',
      (snapshot) => {
        const pct = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100)
        onProgress?.(pct)
      },
      reject,
      async () => {
        try {
          const url = await getDownloadURL(task.snapshot.ref)
          resolve(url)
        } catch (err) {
          reject(err)
        }
      }
    )
  })
}
