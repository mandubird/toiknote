/**
 * v4.21: 후기 전용 페이지 (/reviews)
 */
import { useState, useEffect } from 'react'
import { getApprovedReviews, getReviewStats } from '../services/reviewService'
import ReviewCard from '../components/ReviewCard'

const SORT_OPTIONS = [
  { key: 'latest', label: '최신순' },
  { key: 'score_gain', label: '점수 상승순' },
  { key: 'rating', label: '별점 높은순' },
]

export default function ReviewsPage() {
  const [reviews, setReviews] = useState([])
  const [stats, setStats] = useState({ avgRating: 0, totalCount: 0 })
  const [sort, setSort] = useState('latest')
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const limit = 12

  useEffect(() => {
    getReviewStats().then(setStats).catch(() => {})
  }, [])

  useEffect(() => {
    setLoading(true)
    getApprovedReviews(sort, page, limit)
      .then(({ data }) => setReviews(data ?? []))
      .catch(() => setReviews([]))
      .finally(() => setLoading(false))
  }, [sort, page])

  return (
    <div className="p-4 pb-8 max-w-4xl mx-auto">
      <h1 className="text-xl font-bold text-gray-900 mb-2">실제 사용자 후기</h1>
      <div className="flex flex-wrap gap-4 text-sm text-gray-600 mb-6">
        <span>⭐ 평균 {stats.avgRating}점</span>
        <span>총 {stats.totalCount}개 후기</span>
      </div>

      <div className="flex gap-2 mb-6">
        {SORT_OPTIONS.map(({ key, label }) => (
          <button
            key={key}
            type="button"
            onClick={() => { setSort(key); setPage(1) }}
            className={`px-4 py-2 rounded-lg text-sm font-medium ${
              sort === key ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-700'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin w-8 h-8 border-2 border-primary-200 border-t-primary-600 rounded-full" />
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {reviews.map((review) => (
            <ReviewCard key={review.id} review={review} />
          ))}
        </div>
      )}

      {!loading && reviews.length === 0 && (
        <p className="text-center text-gray-500 py-8">등록된 후기가 없습니다.</p>
      )}

      <div className="flex items-center justify-center gap-4 mt-8">
        {page > 1 && (
          <button
            type="button"
            onClick={() => setPage((p) => p - 1)}
            className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700"
          >
            이전
          </button>
        )}
        <span className="text-sm text-gray-600">{page} 페이지</span>
        {reviews.length === limit && (
          <button
            type="button"
            onClick={() => setPage((p) => p + 1)}
            className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700"
          >
            다음
          </button>
        )}
      </div>
    </div>
  )
}
