const MAX_WIDTH = 800
const MAX_SIZE_BYTES = 0.3 * 1024 * 1024 // 0.3MB
const INITIAL_QUALITY = 0.82
const MIN_QUALITY = 0.5

/**
 * 이미지를 가로 1024px로 리사이즈하고 0.5MB 이하로 압축한 Blob 반환
 * @param {File} file - 원본 이미지 파일
 * @returns {Promise<Blob>}
 */
export async function resizeAndCompressImage(file) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)

    img.onload = () => {
      URL.revokeObjectURL(url)
      const { width, height } = img
      let targetWidth = width
      let targetHeight = height

      if (width > MAX_WIDTH) {
        targetWidth = MAX_WIDTH
        targetHeight = Math.round((height * MAX_WIDTH) / width)
      }

      const canvas = document.createElement('canvas')
      canvas.width = targetWidth
      canvas.height = targetHeight
      const ctx = canvas.getContext('2d')
      ctx.drawImage(img, 0, 0, targetWidth, targetHeight)

      let quality = INITIAL_QUALITY
      const tryCompress = () => {
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('이미지 변환에 실패했어요'))
              return
            }
            if (blob.size <= MAX_SIZE_BYTES || quality <= MIN_QUALITY) {
              resolve(blob)
              return
            }
            quality -= 0.1
            tryCompress()
          },
          'image/jpeg',
          quality
        )
      }
      tryCompress()
    }

    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('이미지를 불러올 수 없어요'))
    }

    img.src = url
  })
}

/**
 * Blob → data URL (data:image/jpeg;base64,...)
 * @param {Blob} blob
 * @returns {Promise<string>}
 */
export function readBlobAsDataURL(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = () => resolve(String(reader.result || ''))
    reader.onerror = () => reject(reader.error || new Error('파일 읽기 실패'))
    reader.readAsDataURL(blob)
  })
}
