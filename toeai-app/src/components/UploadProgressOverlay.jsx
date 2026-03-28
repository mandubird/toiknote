import { useEffect, useState } from 'react'

const ROTATING_MESSAGES = [
  '토익은 반복이 전부예요. 오늘도 한 걸음 더.',
  '틀린 문제가 가장 좋은 선생님이에요.',
  '꾸준함이 실력이 됩니다. 잘 하고 있어요!',
  '오답을 기록하는 습관이 점수를 바꿔요.',
  '"Success is the sum of small efforts." — Robert Collier',
  '토답이 오답을 분석 중이에요. 잠깐만요!',
  '매일 1문제씩만 줄여도 한 달이면 30점이에요.',
  '"The secret of getting ahead is getting started." — Mark Twain',
  '지금 이 순간이 실력이 쌓이는 순간이에요.',
  '틀렸던 문제, 다음엔 반드시 맞힌다!',
]

const UploadProgressOverlay = ({ message = '이미지를 업로드하고 있어요...', progress, hideProgress }) => {
  const percent = progress == null ? 0 : Math.round(progress)
  const isComplete = !hideProgress && percent >= 100

  const [tipIndex, setTipIndex] = useState(() => Math.floor(Math.random() * ROTATING_MESSAGES.length))

  useEffect(() => {
    if (!hideProgress) return
    const id = setInterval(() => {
      setTipIndex((prev) => (prev + 1) % ROTATING_MESSAGES.length)
    }, 3500)
    return () => clearInterval(id)
  }, [hideProgress])

  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl p-6 mx-4 max-w-sm w-full text-center">
        {isComplete ? (
          <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
            <svg className="w-7 h-7 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
        ) : (
          <div className="animate-spin w-12 h-12 border-4 border-primary-200 border-t-primary-600 rounded-full mx-auto mb-4" />
        )}
        <p className="text-gray-800 font-medium mb-3">{message}</p>
        {hideProgress && (
          <p className="text-xs text-primary-600 italic min-h-[2.5rem] transition-all duration-500">
            {ROTATING_MESSAGES[tipIndex]}
          </p>
        )}
        {!hideProgress && (
          <>
            <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
              <div
                className="h-full bg-primary-600 transition-all duration-300 ease-out"
                style={{ width: `${percent}%` }}
              />
            </div>
            <p className="text-sm text-gray-500 mt-2">{percent}%</p>
          </>
        )}
      </div>
    </div>
  )
}

export default UploadProgressOverlay
