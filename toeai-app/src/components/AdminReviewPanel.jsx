/**
 * v4.21: 관리자 후기 승인/거절 패널
 * v4.22: adminId를 props 또는 useOutletContext에서 사용
 */
import { useState, useEffect } from 'react'
import { useOutletContext } from 'react-router-dom'
import { approveReview, rejectReview, getAdminPendingReviews } from '../services/reviewService'
import { getAdminPendingProofReviews, approveProofReview } from '../services/proofReviewService'

export default function AdminReviewPanel({ adminId: adminIdProp }) {
  const ctx = useOutletContext()
  const adminId = adminIdProp ?? ctx?.adminId
  const [reviews, setReviews] = useState([])
  const [proofQueue, setProofQueue] = useState([])
  const [rejectReason, setRejectReason] = useState('')
  const [loading, setLoading] = useState(true)

  const load = () => {
    setLoading(true)
    Promise.all([
      getAdminPendingReviews().catch(() => []),
      getAdminPendingProofReviews().catch(() => []),
    ])
      .then(([r, p]) => {
        setReviews(r)
        setProofQueue(p)
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
  }, [])

  const handleApprove = async (reviewId) => {
    try {
      await approveReview(reviewId, adminId)
      setReviews((prev) => prev.filter((r) => r.id !== reviewId))
    } catch (e) {
      alert(e.message || '승인 처리 실패')
    }
  }

  const handleApproveProof = async (assetId) => {
    try {
      await approveProofReview(assetId)
      setProofQueue((prev) => prev.filter((x) => x.id !== assetId))
    } catch (e) {
      alert(e.message || '승인 처리 실패')
    }
  }

  const handleReject = async (reviewId) => {
    if (!rejectReason.trim()) {
      alert('거절 사유를 입력해주세요.')
      return
    }
    try {
      await rejectReview(reviewId, adminId, rejectReason.trim())
      setReviews((prev) => prev.filter((r) => r.id !== reviewId))
      setRejectReason('')
    } catch (e) {
      alert(e.message || '거절 처리 실패')
    }
  }

  if (loading) {
    return (
      <div className="p-4 flex justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-primary-200 border-t-primary-600 rounded-full" />
      </div>
    )
  }

  if (!adminId) {
    return <div className="p-4 text-gray-500">관리자 정보를 불러올 수 없습니다.</div>
  }

  return (
    <div className="p-4 max-w-3xl mx-auto space-y-10">
      <section>
        <h2 className="text-lg font-bold text-gray-900 mb-2">
          공개 후기 (proof_assets) 승인 — {proofQueue.length}건 대기
        </h2>
        <p className="text-xs text-gray-500 mb-4">
          동의한 건만 승인 가능. 욕설·개인정보·10자 미만은 거절하세요. 승인 시 is_public=true 로 노출됩니다.
        </p>
        {proofQueue.length === 0 ? (
          <p className="text-gray-500 text-sm">대기 중인 공개 후기가 없습니다.</p>
        ) : (
          <div className="space-y-4">
            {proofQueue.map((p) => (
              <div key={p.id} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                <div className="text-xs text-gray-500 mb-1">
                  {p.start_score ?? '-'} → {p.current_score ?? '-'} · 목표 {p.target_score ?? '-'} · {p.usage_days ?? '-'}일
                </div>
                {p.headline && <p className="font-semibold text-gray-900 text-sm mb-1">{p.headline}</p>}
                <p className="text-gray-800 text-sm whitespace-pre-wrap">{p.content}</p>
                {p.best_feature && (
                  <p className="text-xs text-gray-500 mt-1">기능: {p.best_feature}</p>
                )}
                <button
                  type="button"
                  onClick={() => handleApproveProof(p.id)}
                  className="mt-3 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white"
                >
                  공개 승인 (랜딩/앱 노출)
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="text-lg font-bold text-gray-900 mb-4">별점 후기 (reviews) — {reviews.length}건 대기</h2>
      {reviews.length === 0 ? (
        <p className="text-gray-500">대기 중인 후기가 없습니다.</p>
      ) : (
        <div className="space-y-6">
          {reviews.map((review) => (
            <div key={review.id} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
              <div className="flex flex-wrap gap-2 text-sm text-gray-600 mb-2">
                <span>{review.nickname}</span>
                <span>{review.score_before ?? '-'} → {review.score_after ?? '-'}점</span>
                <span>별점: {'⭐'.repeat(review.rating)}</span>
                <span>{new Date(review.created_at).toLocaleDateString('ko-KR')}</span>
              </div>
              <p className="text-gray-800 text-sm whitespace-pre-wrap">{review.content}</p>
              {review.helpful_feature && (
                <p className="text-xs text-gray-500 mt-1">👍 {review.helpful_feature}</p>
              )}
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleApprove(review.id)}
                  className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white"
                >
                  ✅ 승인 (+5일 지급)
                </button>
                <input
                  type="text"
                  placeholder="거절 사유 입력"
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  className="flex-1 min-w-[120px] border border-gray-300 rounded-lg px-3 py-2 text-sm"
                />
                <button
                  type="button"
                  onClick={() => handleReject(review.id)}
                  className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white"
                >
                  ❌ 거절
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
      </section>
    </div>
  )
}
