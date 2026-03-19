/**
 * OnboardingModal — 첫 방문 수험생 서비스 소개
 * - 4단계 슬라이드 (dot indicator)
 * - localStorage 'toeodap_v1_onboarded' 로 재노출 방지
 * - 로그인 없이도 바로 앱 둘러볼 수 있도록 '둘러보기' 제공
 */
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

const STORAGE_KEY = 'toeodap_v1_onboarded'

const STEPS = [
  {
    emoji: '📸',
    badge: '오답노트',
    title: '틀린 문제, 사진 한 장으로 끝',
    desc: '시험지·교재 어디서든 틀린 문제를\n카메라 버튼 하나로 찍으면\nAI가 유형·파트·태그를 자동으로 분류해요.',
    tip: null,
  },
  {
    emoji: '🤖',
    badge: '약점 분석',
    title: '내 약점 패턴을 자동으로 찾아내요',
    desc: '문제를 쌓을수록\n자주 틀리는 유형(태그)과\n점수에 영향 큰 약점을 순위로 보여줘요.',
    tip: '오답 3개만 쌓여도 분석이 시작돼요',
  },
  {
    emoji: '📊',
    badge: '전략·통계',
    title: '점수대별 맞춤 전략을 받아요',
    desc: '600·700·800점대별로 다른 전략,\n파트 7 시간 분석, 고빈출 약점 로드맵까지\n대시보드 한 화면에서 확인할 수 있어요.',
    tip: '설정 → 현재/목표 점수 입력 후 활성화',
  },
  {
    emoji: '🎯',
    badge: 'D-day 압축 전략',
    title: '시험일까지 AI가 전략을 압축해요',
    desc: '시험 날짜를 입력하면\n약점 진단 → 핵심 약점 교정 → D-day까지\nAI가 압축 모드로 자동 전환해요.',
    tip: '설정 → 시험일 입력 후 전략 탭에서 확인',
  },
]

export default function OnboardingModal() {
  const [open, setOpen]   = useState(false)
  const [step, setStep]   = useState(0)
  const navigate          = useNavigate()

  // 처음 방문 여부 확인
  useEffect(() => {
    const done = localStorage.getItem(STORAGE_KEY)
    if (!done) setOpen(true)
  }, [])

  const dismiss = () => {
    localStorage.setItem(STORAGE_KEY, '1')
    setOpen(false)
  }

  const handleStart = () => {
    dismiss()
    navigate('/settings')   // 로그인·목표 점수 입력 유도
  }

  const handleSkip = () => dismiss()

  const isLast = step === STEPS.length - 1
  const cur    = STEPS[step]

  if (!open) return null

  return (
    /* 배경 오버레이 */
    <div
      className="fixed inset-0 z-50 flex items-end justify-center"
      style={{ background: 'rgba(0,0,0,0.55)' }}
      onClick={handleSkip}
    >
      {/* 모달 패널 (클릭 버블 방지) */}
      <div
        className="w-full max-w-md bg-white rounded-t-3xl px-6 pt-5 pb-8 safe-area-bottom"
        style={{ maxHeight: '88vh', overflowY: 'auto' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 상단 핸들 */}
        <div className="flex justify-center mb-4">
          <div className="w-10 h-1 rounded-full bg-gray-300" />
        </div>

        {/* 건너뛰기 */}
        <div className="flex justify-end mb-2">
          <button
            type="button"
            onClick={handleSkip}
            className="text-xs text-gray-400 hover:text-gray-600"
          >
            건너뛰기
          </button>
        </div>

        {/* 슬라이드 본문 */}
        <div className="text-center py-4 px-2">
          {/* 큰 이모지 */}
          <div className="text-6xl mb-4 select-none">{cur.emoji}</div>

          {/* 뱃지 */}
          <span className="inline-block text-xs font-semibold px-3 py-1 rounded-full bg-primary-100 text-primary-700 mb-3">
            {cur.badge}
          </span>

          {/* 타이틀 */}
          <h2 className="text-xl font-bold text-gray-900 mb-3 leading-snug">
            {cur.title}
          </h2>

          {/* 설명 (줄바꿈 유지) */}
          <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-line mb-4">
            {cur.desc}
          </p>

          {/* 팁 칩 */}
          {cur.tip && (
            <div className="inline-flex items-center gap-1.5 bg-amber-50 border border-amber-200 rounded-full px-3 py-1.5 text-xs text-amber-700">
              <span>💡</span>
              <span>{cur.tip}</span>
            </div>
          )}
        </div>

        {/* Dot indicator */}
        <div className="flex justify-center gap-2 my-5">
          {STEPS.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setStep(i)}
              className={`rounded-full transition-all ${
                i === step
                  ? 'w-5 h-2 bg-primary-600'
                  : 'w-2 h-2 bg-gray-300'
              }`}
              aria-label={`${i + 1}단계`}
            />
          ))}
        </div>

        {/* 하단 버튼 */}
        <div className="space-y-2">
          {isLast ? (
            /* 마지막 단계: 시작하기 */
            <button
              type="button"
              onClick={handleStart}
              className="w-full py-3.5 rounded-xl bg-primary-600 text-white font-semibold text-base hover:bg-primary-700 active:scale-[0.98] transition"
            >
              지금 시작하기 🚀
            </button>
          ) : (
            /* 중간 단계: 다음 */
            <button
              type="button"
              onClick={() => setStep((s) => s + 1)}
              className="w-full py-3.5 rounded-xl bg-primary-600 text-white font-semibold text-base hover:bg-primary-700 active:scale-[0.98] transition"
            >
              다음
            </button>
          )}

          {/* 이전 / 둘러보기 */}
          {step > 0 ? (
            <button
              type="button"
              onClick={() => setStep((s) => s - 1)}
              className="w-full py-2.5 rounded-xl border border-gray-200 text-gray-600 text-sm font-medium hover:bg-gray-50"
            >
              이전
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSkip}
              className="w-full py-2.5 rounded-xl border border-gray-200 text-gray-500 text-sm font-medium hover:bg-gray-50"
            >
              일단 둘러볼게요
            </button>
          )}
        </div>

        {/* 하단 안내 */}
        {isLast && (
          <p className="text-center text-xs text-gray-400 mt-3">
            로그인하면 오답 저장·약점 분석이 활성화돼요
          </p>
        )}
      </div>
    </div>
  )
}
