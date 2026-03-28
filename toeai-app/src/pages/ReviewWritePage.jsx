import { useEffect, useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import {
  REVIEW_V1_HELPFUL_FEATURES,
  REVIEW_V1_BEFORE_OPTIONS,
  REVIEW_V1_AFTER_OPTIONS,
  submitReviewCollectionV1,
} from '../services/proofReviewService'

const VIS_OPTIONS = [
  { key: 'anonymous', label: '익명 공개 가능', desc: '닉네임 없이 인용될 수 있어요' },
  { key: 'with_score', label: '점수 포함 공개 가능', desc: '현재·목표 점수가 함께 노출될 수 있어요' },
  { key: 'private', label: '내부 참고만 사용', desc: '서비스 개선용으로만 활용돼요' },
]

export default function ReviewWritePage() {
  const { user, loading: authLoading } = useAuth()
  const navigate = useNavigate()
  const [scores, setScores] = useState({ current_score: null, target_score: null })
  const [scoresLoading, setScoresLoading] = useState(true)
  const [step, setStep] = useState(1)
  const [helpful, setHelpful] = useState([])
  const [beforeState, setBeforeState] = useState('')
  const [afterChange, setAfterChange] = useState('')
  const [oneLine, setOneLine] = useState('')
  const [visibility, setVisibility] = useState('private')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!user?.id) {
      setScoresLoading(false)
      return
    }
    let cancelled = false
    ;(async () => {
      try {
        const { data } = await supabase
          .from('users')
          .select('current_score, target_score')
          .eq('id', user.id)
          .maybeSingle()
        if (!cancelled && data) {
          setScores({
            current_score: data.current_score ?? null,
            target_score: data.target_score ?? null,
          })
        }
      } finally {
        if (!cancelled) setScoresLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [user?.id])

  const canNext1 = helpful.length >= 1 && helpful.length <= 3
  const canNext2 = Boolean(beforeState && afterChange)
  const canNext3 = oneLine.trim().length >= 1 && oneLine.trim().length <= 80

  const toggleHelpful = (label) => {
    setHelpful((prev) => {
      if (prev.includes(label)) return prev.filter((x) => x !== label)
      if (prev.length >= 3) return prev
      return [...prev, label]
    })
  }

  const handleSubmit = async () => {
    if (!user?.id) return
    setError(null)
    setSubmitting(true)
    try {
      await submitReviewCollectionV1(user.id, {
        helpful_features: helpful,
        before_state: beforeState,
        after_change: afterChange,
        one_line_review: oneLine.trim(),
        review_visibility: visibility,
        current_score: scores.current_score,
        target_score: scores.target_score,
      })
      navigate(-1)
    } catch (e) {
      setError(e?.message || '저장에 실패했습니다.')
    } finally {
      setSubmitting(false)
    }
  }

  const progress = useMemo(() => ({ 1: 25, 2: 50, 3: 75, 4: 100 }[step] ?? 0), [step])

  if (authLoading || scoresLoading) {
    return (
      <div className="p-4 flex justify-center py-16">
        <div className="animate-spin w-8 h-8 border-2 border-primary-200 border-t-primary-600 rounded-full" />
      </div>
    )
  }

  if (!user) {
    return (
      <div className="p-4">
        <p className="text-surface-700">로그인이 필요합니다.</p>
        <button type="button" onClick={() => navigate('/landing')} className="mt-3 text-primary-600 font-medium">
          랜딩으로 이동
        </button>
      </div>
    )
  }

  return (
    <div className="p-4 pb-10 max-w-lg mx-auto space-y-4">
      <div className="flex items-center gap-3 mb-2">
        <button
          type="button"
          onClick={() => (step > 1 ? setStep((s) => s - 1) : navigate(-1))}
          className="text-sm text-surface-500 hover:text-surface-800"
        >
          ← {step > 1 ? '이전' : '닫기'}
        </button>
        <span className="text-xs font-semibold text-surface-400 ml-auto">{step}/4</span>
      </div>
      <div className="h-1.5 rounded-full bg-surface-200 overflow-hidden">
        <div className="h-full bg-primary-500 transition-all duration-300" style={{ width: `${progress}%` }} />
      </div>

      {error && (
        <div className="rounded-xl bg-red-50 border border-red-200 text-red-800 text-sm px-3 py-2">{error}</div>
      )}

      {step === 1 && (
        <section className="space-y-4">
          <h1 className="text-xl font-bold text-surface-900">토답에서 가장 도움이 된 기능은 무엇이었나요?</h1>
          <p className="text-sm text-surface-500">최대 3개까지 선택할 수 있어요</p>
          <div className="flex flex-wrap gap-2">
            {REVIEW_V1_HELPFUL_FEATURES.map((label) => {
              const on = helpful.includes(label)
              return (
                <button
                  key={label}
                  type="button"
                  onClick={() => toggleHelpful(label)}
                  className={`px-3 py-2 rounded-full text-sm font-medium border transition-colors ${
                    on
                      ? 'bg-primary-600 text-white border-primary-600'
                      : 'bg-white text-surface-700 border-surface-200 hover:border-primary-300'
                  }`}
                >
                  {label}
                </button>
              )
            })}
          </div>
          <button
            type="button"
            disabled={!canNext1}
            onClick={() => setStep(2)}
            className="w-full py-3 rounded-xl bg-primary-600 text-white text-sm font-bold disabled:opacity-40"
          >
            다음
          </button>
        </section>
      )}

      {step === 2 && (
        <section className="space-y-6">
          <div>
            <h1 className="text-xl font-bold text-surface-900 mb-1">사용 전 어떤 문제가 있었나요?</h1>
            <p className="text-sm text-surface-500 mb-3">하나만 선택</p>
            <div className="flex flex-wrap gap-2">
              {REVIEW_V1_BEFORE_OPTIONS.map((label) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => setBeforeState(label)}
                  className={`px-3 py-2 rounded-full text-sm font-medium border text-left ${
                    beforeState === label
                      ? 'bg-primary-600 text-white border-primary-600'
                      : 'bg-white text-surface-700 border-surface-200'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <h2 className="text-lg font-bold text-surface-900 mb-1">사용 후 가장 달라진 점은 무엇인가요?</h2>
            <p className="text-sm text-surface-500 mb-3">하나만 선택</p>
            <div className="flex flex-wrap gap-2">
              {REVIEW_V1_AFTER_OPTIONS.map((label) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => setAfterChange(label)}
                  className={`px-3 py-2 rounded-full text-sm font-medium border text-left ${
                    afterChange === label
                      ? 'bg-primary-600 text-white border-primary-600'
                      : 'bg-white text-surface-700 border-surface-200'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          <button
            type="button"
            disabled={!canNext2}
            onClick={() => setStep(3)}
            className="w-full py-3 rounded-xl bg-primary-600 text-white text-sm font-bold disabled:opacity-40"
          >
            다음
          </button>
        </section>
      )}

      {step === 3 && (
        <section className="space-y-4">
          <h1 className="text-xl font-bold text-surface-900">한 줄 후기</h1>
          <p className="text-sm text-surface-500">최대 80자 · 필수</p>
          <textarea
            value={oneLine}
            onChange={(e) => setOneLine(e.target.value.slice(0, 80))}
            rows={3}
            placeholder="토답을 한 문장으로 표현하면?"
            className="w-full border border-surface-200 rounded-xl px-3 py-2.5 text-sm resize-none focus:ring-2 focus:ring-primary-400 focus:border-primary-400"
          />
          <p className="text-xs text-surface-400 text-right">{oneLine.length}/80</p>
          <button
            type="button"
            disabled={!canNext3}
            onClick={() => setStep(4)}
            className="w-full py-3 rounded-xl bg-primary-600 text-white text-sm font-bold disabled:opacity-40"
          >
            다음
          </button>
        </section>
      )}

      {step === 4 && (
        <section className="space-y-5">
          <h1 className="text-xl font-bold text-surface-900">공개 동의</h1>
          <p className="text-sm text-surface-600">후기 활용 방식을 선택해 주세요</p>

          <div className="rounded-xl border border-surface-200 bg-surface-50 p-4 space-y-1">
            <p className="text-xs font-semibold text-surface-500 uppercase tracking-wide">점수 정보 (확인)</p>
            <p className="text-sm text-surface-800">
              현재 <strong>{scores.current_score != null ? `${scores.current_score}점` : '—'}</strong>
              {' · '}
              목표 <strong>{scores.target_score != null ? `${scores.target_score}점` : '—'}</strong>
            </p>
            <p className="text-xs text-surface-500 mt-1">설정에 저장된 값이에요. 여기서는 수정하지 않아요.</p>
          </div>

          <div className="space-y-2">
            {VIS_OPTIONS.map((o) => (
              <button
                key={o.key}
                type="button"
                onClick={() => setVisibility(o.key)}
                className={`w-full text-left rounded-xl border px-4 py-3 transition-colors ${
                  visibility === o.key
                    ? 'border-primary-500 bg-primary-50 ring-1 ring-primary-400'
                    : 'border-surface-200 bg-white hover:border-surface-300'
                }`}
              >
                <p className="font-semibold text-surface-900 text-sm">{o.label}</p>
                <p className="text-xs text-surface-500 mt-0.5">{o.desc}</p>
              </button>
            ))}
          </div>

          <button
            type="button"
            disabled={submitting}
            onClick={handleSubmit}
            className="w-full py-3 rounded-xl bg-accent-500 text-white text-sm font-black disabled:opacity-50"
          >
            {submitting ? '저장 중…' : '제출하기'}
          </button>
        </section>
      )}
    </div>
  )
}
