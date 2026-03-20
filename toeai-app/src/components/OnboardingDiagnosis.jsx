import { useMemo, useState } from 'react'

const STORAGE_KEY = 'todap_onboarding_inputs'

const CURRENT_SCORE_OPTIONS = [700, 750, 800, 850, 900]
const TARGET_SCORE_OPTIONS = [750, 850, 900]
const DAYS_LEFT_OPTIONS = [7, 14, 30, 60]
const WEAK_PART_OPTIONS = [
  { key: 'LC', label: 'LC' },
  { key: 'RC', label: 'RC' },
  { key: 'Part5', label: 'Part5' },
  { key: 'Part7', label: 'Part7' },
]

export default function OnboardingDiagnosis({
  onSubmit,
  onExample,
  disabled = false,
}) {
  const [currentScore, setCurrentScore] = useState(String(CURRENT_SCORE_OPTIONS[1]))
  const [targetScore, setTargetScore] = useState(String(TARGET_SCORE_OPTIONS[1]))
  const [daysLeft, setDaysLeft] = useState(String(DAYS_LEFT_OPTIONS[1]))
  const [weakPart, setWeakPart] = useState('Part7')
  const [error, setError] = useState(null)

  const canSubmit = useMemo(() => {
    const c = Number(currentScore)
    const t = Number(targetScore)
    const d = Number(daysLeft)
    return (
      Number.isFinite(c) &&
      Number.isFinite(t) &&
      Number.isFinite(d) &&
      weakPart &&
      !disabled
    )
  }, [currentScore, targetScore, daysLeft, weakPart, disabled])

  const handleSaveAndShow = () => {
    setError(null)
    if (!canSubmit) {
      setError('4문항을 모두 선택해 주세요.')
      return
    }

    const inputs = {
      current_score: Number(currentScore),
      target_score: Number(targetScore),
      days_left: Number(daysLeft),
      weak_part: weakPart,
      saved_at: Date.now(),
    }

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(inputs))
    } catch {
      // localStorage가 막힌 환경이면 결과만 보여주고 저장은 생략
    }

    onSubmit?.(inputs)
  }

  const handleExample = () => {
    // 예시 모드는 localStorage 저장 금지 (스펙)
    const exampleInputs = {
      current_score: 750,
      target_score: 850,
      days_left: 14,
      weak_part: 'Part7',
      saved_at: Date.now(),
    }
    try {
      // 혹시 남아있을 수 있는 예시 저장 방지: 예시 mode에서는 저장 자체를 하지 않음
    } catch {
      /* ignore */
    }
    onExample?.(exampleInputs)
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl bg-white border border-surface-200 p-4">
        <h2 className="text-lg font-bold text-surface-900 mb-1">
          초간단 진단(4문항)
        </h2>
        <p className="text-xs text-surface-500 leading-relaxed">
          10~20초만에 약점 TOP3와 오늘 할 것 3개를 보여드려요.
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-surface-200 p-4 space-y-4">
        <label className="block">
          <span className="text-xs font-semibold text-surface-700">현재 점수</span>
          <select
            className="w-full mt-1 border border-surface-200 rounded-xl px-3 py-2 text-sm bg-white"
            value={currentScore}
            onChange={(e) => setCurrentScore(e.target.value)}
            disabled={disabled}
          >
            {CURRENT_SCORE_OPTIONS.map((v) => (
              <option key={v} value={String(v)}>
                {v}점
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="text-xs font-semibold text-surface-700">목표 점수</span>
          <select
            className="w-full mt-1 border border-surface-200 rounded-xl px-3 py-2 text-sm bg-white"
            value={targetScore}
            onChange={(e) => setTargetScore(e.target.value)}
            disabled={disabled}
          >
            {TARGET_SCORE_OPTIONS.map((v) => (
              <option key={v} value={String(v)}>
                {v}점
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="text-xs font-semibold text-surface-700">시험일까지 남은 기간</span>
          <select
            className="w-full mt-1 border border-surface-200 rounded-xl px-3 py-2 text-sm bg-white"
            value={daysLeft}
            onChange={(e) => setDaysLeft(e.target.value)}
            disabled={disabled}
          >
            {DAYS_LEFT_OPTIONS.map((v) => (
              <option key={v} value={String(v)}>
                {v}일
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="text-xs font-semibold text-surface-700">가장 막히는 파트</span>
          <select
            className="w-full mt-1 border border-surface-200 rounded-xl px-3 py-2 text-sm bg-white"
            value={weakPart}
            onChange={(e) => setWeakPart(e.target.value)}
            disabled={disabled}
          >
            {WEAK_PART_OPTIONS.map((x) => (
              <option key={x.key} value={x.key}>
                {x.label}
              </option>
            ))}
          </select>
        </label>

        {error && <p className="text-xs text-red-600">{error}</p>}

        <div className="space-y-2 pt-2">
          <button
            type="button"
            onClick={handleSaveAndShow}
            disabled={!canSubmit}
            className="w-full py-3 rounded-xl bg-primary-600 text-white font-bold text-sm disabled:opacity-50"
          >
            결과 보기
          </button>
          <button
            type="button"
            onClick={handleExample}
            className="w-full py-2 rounded-xl border border-surface-200 bg-white text-sm font-semibold text-surface-700 hover:bg-surface-50"
            disabled={disabled}
          >
            예시 사용자 결과 보기
          </button>
        </div>
      </div>
    </div>
  )
}

