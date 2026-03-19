import { useState, useEffect } from 'react'
import { BEST_FEATURE_OPTIONS, submitProofReviewStep2 } from '../../services/proofReviewService'

const USAGE_CHOICES = [15, 30, 60]

/**
 * 2단계 공개 후기 모달 (스펙 4.3)
 */
export default function ReviewStep2Modal({ open, userId, assetId, onClose, onComplete }) {
  const [startScore, setStartScore] = useState('700')
  const [currentScore, setCurrentScore] = useState('750')
  const [targetScore, setTargetScore] = useState('900')
  const [usageDays, setUsageDays] = useState(30)
  const [bestFeature, setBestFeature] = useState(BEST_FEATURE_OPTIONS[0])
  const [body, setBody] = useState('')
  const [consent, setConsent] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!open) return
    setSubmitting(false)
  }, [open])

  if (!open || !assetId) return null

  const handleSubmit = async () => {
    if (!userId || submitting) return
    const s = parseInt(startScore, 10)
    const c = parseInt(currentScore, 10)
    const t = parseInt(targetScore, 10)
    if ([s, c, t].some((n) => Number.isNaN(n) || n < 200 || n > 990)) {
      alert('점수는 200~990 사이로 입력해 주세요.')
      return
    }
    setSubmitting(true)
    try {
      const { reward } = await submitProofReviewStep2(userId, assetId, {
        start_score: s,
        current_score: c,
        target_score: t,
        usage_days: usageDays,
        best_feature: bestFeature,
        body,
        consent_public: consent,
      })
      if (consent) {
        if (reward?.success) {
          alert(`이용 기간이 ${reward.days_added}일 더 연장되었습니다!`)
        } else if (reward?.reason === 'no_paid_subscription') {
          alert('후기가 접수되었습니다. 유료 구독 중일 때만 추가 연장이 적용돼요.')
        } else if (reward?.reason === 'already_rewarded') {
          alert('이미 이 단계 보상을 받으셨습니다.')
        } else if (reward?.reason === 'consent_required_for_stage2') {
          alert('공개 동의 시에만 보상이 적용돼요.')
        }
      } else {
        alert('후기가 저장되었습니다. (비공개 동의 — 운영 검토 후 별도 안내 없이 비공개로 유지됩니다)')
      }
      onComplete?.()
      onClose?.()
    } catch (e) {
      alert(e?.message || '제출에 실패했습니다.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-[60]" onClick={() => !submitting && onClose?.()} />
      <div className="fixed left-3 right-3 bottom-20 top-[8%] z-[61] bg-white rounded-2xl shadow-xl flex flex-col max-w-md mx-auto max-h-[min(640px,90vh)]">
        <div className="p-4 border-b border-surface-100 flex justify-between items-center shrink-0">
          <h2 className="text-base font-bold text-surface-900">공개 후기 작성 (선택)</h2>
          <button type="button" className="text-surface-400 p-1" disabled={submitting} onClick={() => onClose?.()}>
            ✕
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-3 text-sm">
          <p className="text-xs text-surface-500">
            승인 후 랜딩·앱에 익명 요약으로 노출될 수 있어요. 개인정보는 넣지 말아 주세요.
          </p>
          <div className="grid grid-cols-3 gap-2">
            <label className="text-xs text-surface-600 col-span-1">
              시작 점수
              <input
                type="number"
                className="w-full border rounded-lg px-2 py-1 mt-0.5"
                value={startScore}
                onChange={(e) => setStartScore(e.target.value)}
              />
            </label>
            <label className="text-xs text-surface-600 col-span-1">
              현재 점수
              <input
                type="number"
                className="w-full border rounded-lg px-2 py-1 mt-0.5"
                value={currentScore}
                onChange={(e) => setCurrentScore(e.target.value)}
              />
            </label>
            <label className="text-xs text-surface-600 col-span-1">
              목표 점수
              <input
                type="number"
                className="w-full border rounded-lg px-2 py-1 mt-0.5"
                value={targetScore}
                onChange={(e) => setTargetScore(e.target.value)}
              />
            </label>
          </div>
          <div>
            <p className="text-xs font-semibold text-surface-700 mb-1">사용 기간</p>
            <div className="flex gap-2">
              {USAGE_CHOICES.map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setUsageDays(d)}
                  className={`flex-1 py-2 rounded-lg text-xs font-bold border ${
                    usageDays === d ? 'bg-primary-600 text-white border-primary-600' : 'border-surface-200'
                  }`}
                >
                  {d}일
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-surface-700">가장 도움된 기능</label>
            <select
              className="w-full border border-surface-200 rounded-lg px-2 py-2 mt-1"
              value={bestFeature}
              onChange={(e) => setBestFeature(e.target.value)}
            >
              {BEST_FEATURE_OPTIONS.map((f) => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-surface-700">공개용 후기 본문 (10자 이상)</label>
            <textarea
              className="w-full border border-surface-200 rounded-xl px-3 py-2 mt-1 min-h-[100px]"
              placeholder="예: 무의식적으로 풀기만 하던 게 줄고, 뭘 해야 할지 정리됐어요."
              value={body}
              onChange={(e) => setBody(e.target.value)}
              maxLength={800}
            />
          </div>
          <label className="flex items-start gap-2 cursor-pointer">
            <input
              type="checkbox"
              className="mt-1"
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
            />
            <span className="text-xs text-surface-700">
              익명 요약으로 공개·마케팅에 활용되는 것에 동의합니다. (동의 시 +5일 연장)
            </span>
          </label>
        </div>
        <div className="p-4 border-t border-surface-100 shrink-0">
          <button
            type="button"
            disabled={submitting}
            onClick={handleSubmit}
            className="w-full py-3 rounded-xl bg-primary-600 text-white font-bold text-sm disabled:opacity-50"
          >
            {submitting ? '제출 중…' : consent ? '제출하기 (+5일 연장)' : '비공개로 제출'}
          </button>
        </div>
      </div>
    </>
  )
}
