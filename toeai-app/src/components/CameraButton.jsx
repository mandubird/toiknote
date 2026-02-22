import { useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { resizeAndCompressImage } from '../utils/imageUtils'
import UploadProgressOverlay from './UploadProgressOverlay'

const BUCKET = 'images'

const CameraButton = ({ user, onUploadComplete, onLoginRequired }) => {
  const inputRef = useRef(null)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploadMessage, setUploadMessage] = useState('이미지를 업로드하고 있어요...')

  const handleCameraClick = () => {
    if (!user) {
      onLoginRequired?.()
      return
    }
    inputRef.current?.click()
  }

  const handleFileChange = async (e) => {
    const file = e.target?.files?.[0]
    e.target.value = ''
    if (!file || !file.type.startsWith('image/')) return
    if (!user) return

    setUploading(true)
    setUploadProgress(0)
    setUploadMessage('이미지를 업로드하고 있어요...')

    try {
      const blob = await resizeAndCompressImage(file)
      setUploadMessage('업로드 중...')
      const path = `users/${user.id}/images/${Date.now()}_${file.name.replace(/\s/g, '_')}`

      const { error } = await supabase.storage.from(BUCKET).upload(path, blob, {
        contentType: 'image/jpeg',
        upsert: false,
      })

      if (error) throw error

      const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(path)
      const url = urlData?.publicUrl ?? ''
      setUploadMessage('업로드 완료!')
      setUploadProgress(100)
      onUploadComplete?.(url)
      await new Promise((r) => setTimeout(r, 2000))
    } catch (err) {
      console.error('업로드 실패:', err)
      alert(err?.message || '업로드에 실패했어요. 다시 시도해 주세요.')
    } finally {
      setUploading(false)
      setUploadProgress(0)
    }
  }

  return (
    <>
      <div className="fixed bottom-20 left-1/2 transform -translate-x-1/2 z-50">
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={handleFileChange}
        />
        <button
          onClick={handleCameraClick}
          className="bg-primary-600 hover:bg-primary-700 text-white rounded-full p-5 shadow-lg transition-all duration-200 active:scale-95 flex items-center justify-center"
          aria-label="사진 촬영"
        >
          <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </button>
        <div className="absolute inset-0 rounded-full bg-primary-500 opacity-20 animate-ping pointer-events-none" />
      </div>

      {uploading && (
        <UploadProgressOverlay message={uploadMessage} progress={uploadProgress} />
      )}
    </>
  )
}

export default CameraButton
