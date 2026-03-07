/**
 * v4.21: 후기 작성 폼 (대시보드 내)
 */
import { useState, useEffect } from 'react'
import { canWriteReview, submitReview } from '../services/reviewService'

const HELPFUL_FEATURES = [
  '약점 TOP3 자동 분석',
  'Part7 시간 분석',
  '점수 예측 시스템',
  '주간 전략 리포트',
  '100일 루틴 자동 생성',
  'AI 코치 멘트',
]

export default function ReviewForm({ userId }) {
  const [form, setForm] = useState({
    nickname: '',
    scoreBefore: '',
    scoreAfter: '',
    helpfulFeature: '',
    content: '',
    rating: 5,
  })
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState(null)
  const [eligibility, setEligibility] = useState(null)

  useEffect(() => {
    if (!userId) return
    canWriteReview(userId).then(setEligibility)
  }, [userId])

  if (eligibility === null) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
        <p className="text-gray-500 text-sm">후기 작성 가능 여부 확인 중...</p>
      </div>
    )
  }

  if (eligibility && !eligibility.canWrite) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
        <h3 className="text-sm font-semibold text-gray-800 mb-2">📝 후기 작성하기</h3>
        <p className="text-gray-600 text-sm">⏳ {eligibility.reason}</p>
      </div>
    )
  }

  const handleSubmit = async () => {
    if (form.content.length < 200) {
      setMessage({ type: 'error', text: '후기는 200자 이상 작성해주세요.' })
      return
    }
    if (!form.nickname.trim()) {
      setMessage({ type: 'error', text: '닉네임을 입력해주세요.' })
      return
    }
    setSubmitting(true)
    setMessage(null)
    try {
      const result = await submitReview({
        userId,
        nickname: form.nickname.trim(),
        scoreBefore: form.scoreBefore ? Number(form.scoreBefore) : null,
        scoreAfter: form.scoreAfter ? Number(form.scoreAfter) : null,
        helpfulFeature: form.helpfulFeature || '',
        content: form.content.trim(),
        rating: form.rating,
      })
      setMessage({ type: 'success', text: result.message })
      setForm({ nickname: '', scoreBefore: '', scoreAfter: '', helpfulFeature: '', content: '', rating: 5 })
    } catch (e) {
      setMessage({ type: 'error', text: e.message || '제출에 실패했습니다.' })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
      <h3 className="text-sm font-semibold text-gray-800 mb-2">📝 후기 작성하기</h3>
      <p className="text-xs text-green-700 mb-3">✅ 승인 시 사용기간 <strong>+5일</strong> 지급</p>

      {message && (
        <p className={`text-sm mb-3 ${message.type === 'success' ? 'text-green-600' : 'text-red-600'}`}>
          {message.text}
        </p>
      )}

      <label className="block text-xs font-medium text-gray-700 mb-1">닉네임 (공개됨)</label>
      <input
        type="text"
        placeholder="예: 김O준"
        value={form.nickname}
        onChange={(e) => setForm({ ...form, nickname: e.target.value })}
        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mb-3"
      />

      <div className="grid grid-cols-2 gap-3 mb-3">
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">사용 전 점수</label>
          <input
            type="number"
            placeholder="예: 820"
            min={200}
            max={990}
            value={form.scoreBefore}
            onChange={(e) => setForm({ ...form, scoreBefore: e.target.value })}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">현재 점수</label>
          <input
            type="number"
            placeholder="예: 895"
            min={200}
            max={990}
            value={form.scoreAfter}
            onChange={(e) => setForm({ ...form, scoreAfter: e.target.value })}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
          />
        </div>
      </div>

      <label className="block text-xs font-medium text-gray-700 mb-1">가장 도움된 기능</label>
      <select
        value={form.helpfulFeature}
        onChange={(e) => setForm({ ...form, helpfulFeature: e.target.value })}
        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mb-3"
      >
        <option value="">선택해주세요</option>
        {HELPFUL_FEATURES.map((f) => (
          <option key={f} value={f}>{f}</option>
        ))}
      </select>

      <label className="block text-xs font-medium text-gray-700 mb-1">후기 내용 (200자 이상)</label>
      <textarea
        rows={4}
        placeholder="어떤 점이 도움이 되었나요? 점수 변화와 함께 구체적으로 작성해주세요."
        value={form.content}
        onChange={(e) => setForm({ ...form, content: e.target.value })}
        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mb-1"
      />
      <p className="text-xs text-gray-500 mb-3">{form.content.length}자</p>

      <label className="block text-xs font-medium text-gray-700 mb-1">별점</label>
      <div className="flex gap-1 mb-4">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => setForm({ ...form, rating: star })}
            className={`p-1 text-lg ${form.rating >= star ? 'opacity-100' : 'opacity-40'}`}
          >
            ⭐
          </button>
        ))}
      </div>

      <button
        type="button"
        onClick={handleSubmit}
        disabled={submitting}
        className="w-full py-3 bg-primary-600 text-white font-medium rounded-lg disabled:opacity-50"
      >
        {submitting ? '제출 중...' : '후기 제출하기'}
      </button>
    </div>
  )
}
