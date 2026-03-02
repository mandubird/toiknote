/**
 * v4.25: 오답노트 이미지 입력 — 카메라 촬영 / 갤러리 선택 바텀시트
 */
import { useRef } from 'react'

const ACCEPT_TYPES = ['image/jpeg', 'image/png', 'image/heic', 'image/webp']
const MAX_SIZE = 10 * 1024 * 1024 // 10MB
const GALLERY_MAX = 3

export default function ImageSourceBottomSheet({ isOpen, onClose, onImagesSelected }) {
  const cameraInputRef = useRef(null)
  const galleryInputRef = useRef(null)

  const handleFiles = (e) => {
    const files = Array.from(e.target?.files ?? [])
    e.target.value = ''
    if (files.length === 0) return

    const validFiles = files.filter((file) => {
      const okType = ACCEPT_TYPES.includes(file.type) || file.type === 'image/heic'
      const okSize = file.size <= MAX_SIZE
      return okType && okSize
    })

    const rejected = files.length - validFiles.length
    if (validFiles.length === 0) {
      alert('jpg, png, heic, webp 형식의 10MB 이하 이미지만 가능해요.')
      return
    }
    if (rejected > 0) {
      alert(`${rejected}장은 형식/용량 조건에 맞지 않아 제외됐어요.`)
    }

    const toSend = validFiles.slice(0, GALLERY_MAX)
    if (validFiles.length > GALLERY_MAX) {
      alert(`최대 ${GALLERY_MAX}장까지 선택 가능해요. 앞쪽 ${GALLERY_MAX}장만 사용해요.`)
    }
    onImagesSelected?.(toSend)
    onClose()
  }

  const handleGalleryChange = (e) => {
    const files = Array.from(e.target?.files ?? [])
    if (files.length > GALLERY_MAX) {
      alert(`최대 ${GALLERY_MAX}장까지 선택 가능해요.`)
      e.target.value = ''
      return
    }
    handleFiles(e)
  }

  if (!isOpen) return null

  return (
    <>
      <div
        className="fixed inset-0 bg-black/50 z-[100]"
        onClick={onClose}
        onKeyDown={(e) => e.key === 'Escape' && onClose()}
        role="button"
        tabIndex={0}
        aria-label="닫기"
      />
      <div
        className="fixed bottom-0 left-0 right-0 bg-white rounded-t-[20px] px-5 pt-4 pb-10 z-[101] animate-slideUp"
        style={{ paddingBottom: 'max(16px, env(safe-area-inset-bottom))' }}
      >
        <div className="w-9 h-1 bg-gray-300 rounded-full mx-auto mb-5" />
        <p className="text-center text-base font-semibold text-gray-900 mb-4">문제 사진 추가</p>

        <button
          type="button"
          className="flex items-center w-full p-4 rounded-xl bg-gray-50 mb-2.5 border-none cursor-pointer text-left active:bg-gray-100"
          onClick={() => cameraInputRef.current?.click()}
        >
          <span className="text-[22px] mr-3.5">📷</span>
          <span className="text-base font-medium flex-1">카메라로 촬영</span>
        </button>

        <button
          type="button"
          className="flex items-center w-full p-4 rounded-xl bg-gray-50 mb-2.5 border-none cursor-pointer text-left active:bg-gray-100"
          onClick={() => galleryInputRef.current?.click()}
        >
          <span className="text-[22px] mr-3.5">🖼️</span>
          <span className="text-base font-medium flex-1">갤러리에서 선택</span>
          <span className="text-xs text-gray-400">최대 3장</span>
        </button>

        <button
          type="button"
          className="w-full py-3.5 mt-1.5 rounded-xl bg-white border border-gray-200 text-[15px] text-gray-500 cursor-pointer"
          onClick={onClose}
        >
          취소
        </button>
      </div>

      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleFiles}
      />
      <input
        ref={galleryInputRef}
        type="file"
        accept="image/jpeg,image/png,image/heic,image/webp"
        multiple
        className="hidden"
        onChange={handleGalleryChange}
      />
    </>
  )
}
