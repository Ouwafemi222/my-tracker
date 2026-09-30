const MAX_EDGE = 1400

export function profilePhotoKey(userId: string) {
  return `gratitude-profile-photo:${userId}`
}

export function readProfilePhoto(userId: string | undefined): string | null {
  if (!userId) return null
  return localStorage.getItem(profilePhotoKey(userId))
}

export function saveProfilePhoto(userId: string, dataUrl: string) {
  localStorage.setItem(profilePhotoKey(userId), dataUrl)
}

export function clearProfilePhoto(userId: string) {
  localStorage.removeItem(profilePhotoKey(userId))
}

export function compressProfilePhoto(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      const scale = Math.min(1, MAX_EDGE / Math.max(img.width, img.height))
      const canvas = document.createElement('canvas')
      canvas.width = Math.max(1, Math.round(img.width * scale))
      canvas.height = Math.max(1, Math.round(img.height * scale))
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        URL.revokeObjectURL(url)
        reject(new Error('Could not read that image'))
        return
      }
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
      URL.revokeObjectURL(url)
      resolve(canvas.toDataURL('image/jpeg', 0.72))
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Could not read that image'))
    }
    img.src = url
  })
}
