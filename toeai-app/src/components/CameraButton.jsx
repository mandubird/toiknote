import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { resizeAndCompressImage, readBlobAsDataURL } from '../utils/imageUtils'
import UploadProgressOverlay from './UploadProgressOverlay'
import ImageSourceBottomSheet from './ImageSourceBottomSheet'

const BUCKET = 'images'

const CameraButton = ({ user, onBase64Ready, onUrlReady, onLoginRequired }) => {
  const [bottomSheetOpen, setBottomSheetOpen] = useState(false)
  const [compressing, setCompressing] = useState(false)

  const handleCameraClick = () => {
    if (!user) {
      onLoginRequired?.()
      return
    }
    setBottomSheetOpen(true)
  }

  const processOneFile = async (file) => {
    if (!user || !file?.type?.startsWith('image/')) return
    setCompressing(true)
    try {
      const blob = await resizeAndCompressImage(file)
      const imageBase64 = await readBlobAsDataURL(blob)

      // base64 준비되는 즉시 분석 시작 — Supabase 업로드를 기다리지 않음
      setCompressing(false)
      onBase64Ready?.(imageBase64)

      // 업로드는 백그라운드에서 (저장 용도만)
      try {
        const path = `users/${user.id}/images/${Date.now()}_${file.name.replace(/\s/g, '_')}`
        const { error } = await supabase.storage.from(BUCKET).upload(path, blob, {
          contentType: 'image/jpeg',
          upsert: false,
        })
        if (!error) {
          const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(path)
          onUrlReady?.({ url: urlData?.publicUrl ?? '' })
        }
      } catch {
        // 업로드 실패 시 무시 — 분석은 base64로 이미 진행 중
      }
    } catch (err) {
      console.error('이미지 준비 실패:', err)
      alert(err?.message || '이미지 준비에 실패했어요. 다시 시도해 주세요.')
      setCompressing(false)
    }
  }

  const handleImagesSelected = async (files) => {
    if (!files?.length || !user) return
    setBottomSheetOpen(false)
    for (const file of files) {
      await processOneFile(file)
    }
  }

  return (
    <>
      <ImageSourceBottomSheet
        isOpen={bottomSheetOpen}
        onClose={() => setBottomSheetOpen(false)}
        onImagesSelected={handleImagesSelected}
      />
      <div className="fixed bottom-20 left-1/2 transform -translate-x-1/2 z-50">
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

      {compressing && (
        <UploadProgressOverlay message="이미지 준비 중..." hideProgress />
      )}
    </>
  )
}

export default CameraButton
