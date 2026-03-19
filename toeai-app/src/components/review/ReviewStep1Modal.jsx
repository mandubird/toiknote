import { useState } from 'react'
import { HELPFUL_OPTIONS, submitProofReviewStep1 } from '../../services/proofReviewService'

/**
 * 1단계 후기 모달 (스펙 4.2)
 */
export default function ReviewStep1Modal({
  open,
  userId,
  onClose,
  onComplete,
}) {
  const [selected, setSelected] = useState([])
  const [note, setNote] = useState('')
  const [submitting, setSubmitting] = useState(false)

  if (!open) return null

  const toggle = (label) => {
    setSelected((prev) =>
      prev.includes(label) ? prev.filter((x) => x !== label) : [...prev, label]
    )
  }

  const handleSubmit = async () => {
    if (!userId || submitting) return
    setSubmitting(true)
    try {
      const { assetId, reward } = await submitProofReviewStep1(userId, { selected, note })
      if (reward?.success) {
        alert(`이용 기간이 ${reward.days_added}일 연장되었습니다!`)
      } else if (reward?.reason === 'no_paid_subscription') {
        alert('후기 감사합니다! 유료 구독 중일 때는 이용 기간 연장 혜택이 적용돼요.')
      } else if (reward?.reason === 'already_rewarded') {
        alert('이미 보상을 받은 단계예요.')
      } else {
        alert('후기가 저장되었습니다.')
      }
      onComplete?.(assetId)
      onClose?.()
      setSelected([])
      setNote('')
    } catch (e) {
      alert(e?.message || '제출에 실패했습니다.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-[60]" onClick={() => !submitting && onClose?.()} />
      <div className="fixed left-4 right-4 bottom-24 top-[15%] z-[61] bg-white rounded-2xl shadow-xl flex flex-col max-w-md mx-auto max-h-[min(560px,85vh)]">
        <div className="p-4 border-b border-surface-100 flex justify-between items-center">
          <h2 className="text-lg font-bold text-surface-900">토답 쓰고 어떠셨어요?</h2>
          <button
            type="button"
            className="text-surface-400 p-1"
            disabled={submitting}
            onClick={() => onClose?.()}
          >
            ✕
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <p className="text-sm text-surface-600">해당하는 항목을 모두 골라 주세요 (복수 선택)</p>
          <div className="flex flex-wrap gap-2">
            {HELPFUL_OPTIONS.map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => toggle(opt)}
                className={`px-3 py-2 rounded-full text-xs font-medium border transition ${
                  selected.includes(opt)
                    ? 'bg-primary-600 text-white border-primary-600'
                    : 'bg-surface-50 text-surface-700 border-surface-200'
                }`}
              >
                {opt}
              </button>
            ))}
          </div>
          <div>
            <label className="text-xs font-semibold text-surface-600 block mb-1">
              한 줄로 표현하면? (선택)
            </label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="예: Part7 시간이 진짜 줄었어요"
              className="w-full border border-surface-200 rounded-xl px-3 py-2 text-sm"
              maxLength={120}
            />
          </div>
        </div>
        <div className="p-4 border-t border-surface-100">
          <button
            type="button"
            disabled={submitting}
            onClick={handleSubmit}
            className="w-full py-3 rounded-xl bg-accent-500 text-white font-black text-sm disabled:opacity-50"
          >
            {submitting ? '제출 중…' : '후기 남기기 (3일 연장)'}
          </button>
          <button
            type="button"
            className="w-full mt-2 text-xs text-surface-500"
            onClick={() => onClose?.()}
            disabled={submitting}
          >
            나중에
          </button>
        </div>
      </div>
    </>
  )
}
