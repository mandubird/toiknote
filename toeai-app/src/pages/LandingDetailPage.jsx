/**
 * v4.21: 1Page 상세 랜딩 (/900-jump) - DB 후기 연동
 */
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getApprovedReviews } from '../services/reviewService'
import ReviewCard from '../components/ReviewCard'

export default function LandingDetailPage() {
  const [reviews, setReviews] = useState([])
  const navigate = useNavigate()

  useEffect(() => {
    getApprovedReviews('latest', 1, 6).then(({ data }) => setReviews(data ?? [])).catch(() => {})
    if (typeof window.gtag === 'function') {
      window.gtag('event', 'page_view', { page_path: '/900-jump' })
    }
  }, [])

  const handleCTAClick = (position) => {
    if (typeof window.gtag === 'function') {
      window.gtag('event', 'cta_click', { event_category: 'conversion', event_label: position })
    }
    navigate('/diagnostic')
  }

  const handlePaymentClick = () => {
    if (typeof window.gtag === 'function') {
      window.gtag('event', 'begin_checkout', { event_category: 'conversion', event_label: '900-jump-landing' })
    }
    navigate('/upgrade')
  }

  return (
    <div className="min-h-screen bg-white text-gray-900">
      {/* Section 1: Hero */}
      <section className="relative overflow-hidden px-4 py-20 text-center text-white" style={{ background: 'linear-gradient(135deg, #1e3a5f 0%, #0f172a 100%)' }}>
        <div className="mx-auto max-w-3xl">
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl">
            850에서 멈췄다면,<br />문제는 전략입니다.
          </h1>
          <p className="mt-4 text-lg opacity-95">AI 약점 분석 기반 60일 점프 시스템</p>
          <button
            type="button"
            onClick={() => handleCTAClick('hero')}
            className="mt-8 rounded-xl bg-amber-400 px-8 py-4 text-lg font-bold text-gray-900 shadow-lg hover:bg-amber-300"
          >
            무료 점수 진단 받기 →
          </button>
          <div className="mt-8 flex flex-wrap justify-center gap-6 text-sm opacity-90">
            <span>✓ 평균 +58점 상승</span>
            <span>✓ 60일 집중 관리</span>
            <span>✓ AI 약점 자동 분석</span>
          </div>
        </div>
      </section>

      {/* Section 2: 공감 유도 */}
      <section className="border-t border-gray-100 px-4 py-16">
        <div className="mx-auto max-w-3xl">
          <h2 className="text-center text-2xl font-bold text-gray-900">이런 고민, 있으시죠?</h2>
          <div className="mt-10 grid gap-6 sm:grid-cols-3">
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-5 text-center">
              <span className="text-3xl">📚</span>
              <p className="mt-2 text-gray-700">"문제집은 3권째인데<br />점수는 그대로"</p>
            </div>
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-5 text-center">
              <span className="text-3xl">⏰</span>
              <p className="mt-2 text-gray-700">"Part7에서<br />항상 시간 부족"</p>
            </div>
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-5 text-center">
              <span className="text-3xl">🤔</span>
              <p className="mt-2 text-gray-700">"왜 880에서<br />안 오를까?"</p>
            </div>
          </div>
        </div>
      </section>

      {/* Section 3: 솔루션 */}
      <section className="bg-gray-50 px-4 py-16">
        <div className="mx-auto max-w-3xl">
          <h2 className="text-center text-2xl font-bold text-gray-900">토오AI가 다른 이유</h2>
          <div className="mt-10 grid gap-6 sm:grid-cols-2">
            {[
              { num: '01', title: '약점 TOP3 자동 분석', desc: '오답 패턴을 AI가 분석해 정확한 약점만 집중 공략' },
              { num: '02', title: 'Part7 시간 분석', desc: '문제별 풀이 시간을 측정해 시간 손실 구간을 정확히 진단' },
              { num: '03', title: '점수 예측 시스템', desc: '현재 실력 기반으로 예상 점수를 매주 업데이트' },
              { num: '04', title: '주간 전략 리포트', desc: '이번 주 성과와 다음 주 전략을 AI가 자동 생성' },
            ].map((item) => (
              <div key={item.num} className="rounded-xl border border-gray-200 bg-white p-5">
                <span className="text-sm font-bold text-primary-600">{item.num}</span>
                <h3 className="mt-1 font-semibold text-gray-900">{item.title}</h3>
                <p className="mt-1 text-sm text-gray-600">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Section 4: 결과 예시 카드 */}
      <section className="px-4 py-16">
        <div className="mx-auto max-w-2xl">
          <h2 className="text-center text-2xl font-bold text-gray-900">이런 분석 결과를 받으실 수 있어요</h2>
          <div className="mt-8 rounded-xl border-2 border-primary-200 bg-primary-50/50 p-6">
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-gray-600">현재 예상 점수</span><strong>842점</strong></div>
              <div className="flex justify-between"><span className="text-gray-600">900까지</span><strong className="text-primary-600">-58점</strong></div>
              <div className="flex justify-between"><span className="text-gray-600">약점</span><strong>관계사 / 복수지문 / 추론</strong></div>
              <div className="flex justify-between"><span className="text-gray-600">Part7 평균 시간</span><strong>91초 (기준 대비 +16초)</strong></div>
            </div>
            <button
              type="button"
              onClick={() => handleCTAClick('sample-result')}
              className="mt-6 w-full rounded-lg border-2 border-primary-600 py-3 font-medium text-primary-600"
            >
              내 분석 결과 받기 →
            </button>
          </div>
        </div>
      </section>

      {/* Section 5: 실제 후기 (DB 연동) */}
      <section className="bg-gray-50 px-4 py-16">
        <div className="mx-auto max-w-4xl">
          <h2 className="text-center text-2xl font-bold text-gray-900">실제 사용자 후기</h2>
          {reviews.length > 0 ? (
            <>
              <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {reviews.slice(0, 3).map((review) => (
                  <ReviewCard key={review.id} review={review} />
                ))}
              </div>
              <div className="mt-6 text-center">
                <button
                  type="button"
                  onClick={() => navigate('/reviews')}
                  className="rounded-lg border border-gray-300 px-6 py-2 text-gray-700"
                >
                  후기 더 보기 →
                </button>
              </div>
            </>
          ) : (
            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              <div className="rounded-xl border border-gray-200 bg-white p-4">
                <div className="text-sm font-medium text-primary-600 mb-2">850 → 915 <span className="text-green-600">(+65)</span></div>
                <p className="text-gray-700 text-sm">"Part 7 시간이 항상 부족했는데, AI가 정확히 약점을 찾아줘서 집중 훈련할 수 있었어요. 8주 만에 목표 달성했습니다."</p>
                <span className="mt-2 block text-xs text-gray-500">김O준 (27세, 직장인)</span>
              </div>
              <div className="rounded-xl border border-gray-200 bg-white p-4">
                <div className="text-sm font-medium text-primary-600 mb-2">780 → 865 <span className="text-green-600">(+85)</span></div>
                <p className="text-gray-700 text-sm">"관계대명사가 약점인 줄 몰랐는데 AI 분석으로 알게 되고 집중하니 Part 5가 90%로 올랐어요."</p>
                <span className="mt-2 block text-xs text-gray-500">박O연 (24세, 취준생)</span>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Section 6: 가격 */}
      <section className="px-4 py-16" id="pricing">
        <div className="mx-auto max-w-xl">
          <h2 className="text-center text-2xl font-bold text-gray-900">60일 프로젝트 시작하기</h2>
          <div className="mt-8 rounded-xl border-2 border-primary-200 bg-white p-6 shadow-sm">
            <div className="text-sm text-gray-500">정가 <s>129,000원</s></div>
            <div className="mt-2 flex items-center gap-2">
              <span className="rounded bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">베타 특가</span>
              <span className="text-2xl font-bold text-gray-900">49,000원</span>
            </div>
            <ul className="mt-4 space-y-2 text-sm text-gray-700">
              <li>✓ AI 점수 예측 (매주 업데이트)</li>
              <li>✓ 주간 전략 리포트 자동 생성 (8회)</li>
              <li>✓ 약점 집중 루틴 (개인 맞춤)</li>
              <li>✓ 60일 관리 시스템</li>
              <li>✓ 900 도전 뱃지 시스템</li>
            </ul>
            <button
              type="button"
              onClick={handlePaymentClick}
              className="mt-6 w-full rounded-xl bg-primary-600 py-4 text-lg font-bold text-white"
            >
              60일 프로젝트 시작하기 →
            </button>
            <p className="mt-3 text-center text-xs text-gray-500">진단 먼저 무료로 받고 결정하세요</p>
          </div>
        </div>
      </section>

      {/* Section 7: 하단 CTA */}
      <section className="border-t border-gray-100 bg-gray-50 px-4 py-16">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-xl font-bold text-gray-900">지금 시작하면 60일 후 달라집니다.</h2>
          <button
            type="button"
            onClick={() => handleCTAClick('footer')}
            className="mt-6 rounded-xl bg-primary-600 px-8 py-4 font-bold text-white"
          >
            무료 점수 진단 받기 →
          </button>
        </div>
      </section>
    </div>
  )
}
