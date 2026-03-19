/**
 * 후기 페이지 — proof_assets 공개 후기(필터) + 기존 reviews 테이블
 * 스펙: 8. 필터/정렬
 */
import { useState, useEffect, useMemo } from 'react'
import { getApprovedReviews, getReviewStats } from '../services/reviewService'
import { fetchPublicProofReviews, BEST_FEATURE_OPTIONS } from '../services/proofReviewService'
import ReviewCard from '../components/ReviewCard'
import ProofReviewCard from '../components/review/ProofReviewCard'

const SCORE_BANDS = [
  { key: '700', label: '700→800대', min: 700, max: 799 },
  { key: '800', label: '800→900대', min: 800, max: 899 },
  { key: '850', label: '850 돌파', min: 850, max: 999 },
]

const USAGE_FILTER = [
  { key: 'all', label: '전체', days: null },
  { key: '15', label: '15일', days: 15 },
  { key: '30', label: '30일', days: 30 },
  { key: '60', label: '60일', days: 60 },
]

const SORT_OPTIONS = [
  { key: 'latest', label: '최신순' },
  { key: 'score_gain', label: '점수 상승순' },
  { key: 'rating', label: '별점 높은순' },
]

export default function ReviewsPage() {
  const [proofList, setProofList] = useState([])
  const [proofLoading, setProofLoading] = useState(true)
  const [scoreBand, setScoreBand] = useState('all') // 'all' | SCORE_BANDS.key
  const [usageKey, setUsageKey] = useState('all')
  const [featureKey, setFeatureKey] = useState('all')

  const [legacyReviews, setLegacyReviews] = useState([])
  const [stats, setStats] = useState({ avgRating: 0, totalCount: 0 })
  const [sort, setSort] = useState('latest')
  const [page, setPage] = useState(1)
  const [legacyLoading, setLegacyLoading] = useState(true)
  const limit = 12

  const proofQueryOpts = useMemo(() => {
    const opts = { reviewStage2Only: true }
    if (scoreBand !== 'all') {
      const band = SCORE_BANDS.find((b) => b.key === scoreBand)
      if (band) {
        opts.minStartScore = band.min
        opts.maxStartScore = band.max
      }
    }
    const uf = USAGE_FILTER.find((u) => u.key === usageKey)
    if (uf?.days != null) opts.usageDays = uf.days
    if (featureKey !== 'all') opts.featureLike = featureKey
    return opts
  }, [scoreBand, usageKey, featureKey])

  useEffect(() => {
    setProofLoading(true)
    fetchPublicProofReviews(48, proofQueryOpts)
      .then(setProofList)
      .catch(() => setProofList([]))
      .finally(() => setProofLoading(false))
  }, [proofQueryOpts])

  useEffect(() => {
    getReviewStats().then(setStats).catch(() => {})
  }, [])

  useEffect(() => {
    setLegacyLoading(true)
    getApprovedReviews(sort, page, limit)
      .then(({ data }) => setLegacyReviews(data ?? []))
      .catch(() => setLegacyReviews([]))
      .finally(() => setLegacyLoading(false))
  }, [sort, page])

  const [proofSort, setProofSort] = useState('latest')

  const sortedProof = useMemo(() => {
    const list = [...proofList]
    if (proofSort === 'score_gain') {
      list.sort((a, b) => {
        const ga = (a.current_score ?? 0) - (a.start_score ?? 0)
        const gb = (b.current_score ?? 0) - (b.start_score ?? 0)
        return gb - ga
      })
    } else {
      list.sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )
    }
    return list
  }, [proofList, proofSort])

  return (
    <div className="p-4 pb-8 max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-xl font-bold text-gray-900 mb-2">실제 사용자 후기</h1>
        <p className="text-sm text-gray-600">
          목표·기간이 비슷한 사례를 골라 보세요. 아래에는 별점 후기(기존)도 함께 보여 드려요.
        </p>
      </div>

      {/* proof_assets 필터 */}
      <section className="space-y-3">
        <h2 className="text-sm font-black text-surface-800">점수·기간·기능 필터</h2>
        <div className="flex gap-2">
          {[
            { key: 'latest', label: '최신순' },
            { key: 'score_gain', label: '점수 상승순' },
          ].map(({ key, label }) => (
            <button
              key={key}
              type="button"
              onClick={() => setProofSort(key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium ${
                proofSort === key ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-700'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setScoreBand('all')}
            className={`px-3 py-1.5 rounded-full text-xs font-medium ${
              scoreBand === 'all' ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-700'
            }`}
          >
            점수 전체
          </button>
          {SCORE_BANDS.map((b) => (
            <button
              key={b.key}
              type="button"
              onClick={() => setScoreBand(b.key)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium ${
                scoreBand === b.key ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-700'
              }`}
            >
              {b.label}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          {USAGE_FILTER.map((u) => (
            <button
              key={u.key}
              type="button"
              onClick={() => setUsageKey(u.key)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium ${
                usageKey === u.key ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-700'
              }`}
            >
              {u.label}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          <span className="text-xs text-gray-500 w-full sm:w-auto">도움된 기능</span>
          <select
            value={featureKey}
            onChange={(e) => setFeatureKey(e.target.value)}
            className="border border-gray-200 rounded-lg px-2 py-1.5 text-xs flex-1 min-w-[140px]"
          >
            <option value="all">전체</option>
            {BEST_FEATURE_OPTIONS.map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </select>
        </div>

        {proofLoading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin w-8 h-8 border-2 border-primary-200 border-t-primary-600 rounded-full" />
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {sortedProof.map((r) => (
              <ProofReviewCard key={r.id} review={r} />
            ))}
          </div>
        )}
        {!proofLoading && sortedProof.length === 0 && (
          <p className="text-center text-gray-500 py-4 text-sm">조건에 맞는 공개 후기가 아직 없어요.</p>
        )}
      </section>

      {/* 기존 reviews (별점) */}
      <section className="border-t border-gray-200 pt-8">
        <h2 className="text-lg font-bold text-gray-900 mb-2">별점 후기</h2>
        <div className="flex flex-wrap gap-4 text-sm text-gray-600 mb-4">
          <span>⭐ 평균 {stats.avgRating}점</span>
          <span>총 {stats.totalCount}개</span>
        </div>

        <div className="flex gap-2 mb-6 flex-wrap">
          {SORT_OPTIONS.map(({ key, label }) => (
            <button
              key={key}
              type="button"
              onClick={() => {
                setSort(key)
                setPage(1)
              }}
              className={`px-4 py-2 rounded-lg text-sm font-medium ${
                sort === key ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-700'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {legacyLoading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin w-8 h-8 border-2 border-primary-200 border-t-primary-600 rounded-full" />
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {legacyReviews.map((review) => (
              <ReviewCard key={review.id} review={review} />
            ))}
          </div>
        )}

        {!legacyLoading && legacyReviews.length === 0 && (
          <p className="text-center text-gray-500 py-8">등록된 별점 후기가 없습니다.</p>
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
          {legacyReviews.length === limit && (
            <button
              type="button"
              onClick={() => setPage((p) => p + 1)}
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700"
            >
              다음
            </button>
          )}
        </div>
      </section>
    </div>
  )
}
