import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import {
  clearProfilePhoto,
  compressProfilePhoto,
  readProfilePhoto,
  saveProfilePhoto,
} from './profilePhoto'

export function useProfilePhoto() {
  const { user } = useAuth()
  const userId = user?.id
  const [photo, setPhoto] = useState<string | null>(null)

  useEffect(() => {
    setPhoto(readProfilePhoto(userId))
  }, [userId])

  const upload = useCallback(
    async (file: File) => {
      if (!userId) return
      const dataUrl = await compressProfilePhoto(file)
      saveProfilePhoto(userId, dataUrl)
      setPhoto(dataUrl)
    },
    [userId],
  )

  const remove = useCallback(() => {
    if (!userId) return
    clearProfilePhoto(userId)
    setPhoto(null)
  }, [userId])

  return { photo, upload, remove }
}
