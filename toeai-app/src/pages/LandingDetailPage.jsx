/**
 * v4.21 + v4.23: /900-jump 상세 랜딩 — 카피·심리 트리거·가격 DB 연동
 */
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getApprovedReviews } from '../services/reviewService'
import { getActivePricingPlan } from '../services/landingService'
import ReviewCard from '../components/ReviewCard'
import CtaButton from '../components/landing/CtaButton'
import SocialProofBar from '../components/landing/SocialProofBar'
import LossAversionBanner from '../components/landing/LossAversionBanner'
import FutureAnxietySection from '../components/landing/FutureAnxietySection'
import ScarcityCounter from '../components/landing/ScarcityCounter'

export default function LandingDetailPage() {
  const [reviews, setReviews] = useState([])
  const [plan, setPlan] = useState(null)
  const navigate = useNavigate()

  useEffect(() => {
    getApprovedReviews('latest', 1, 6).then(({ data }) => setReviews(data ?? [])).catch(() => {})
    getActivePricingPlan().then(setPlan).catch(() => {})
    if (typeof window.gtag === 'function') {
      window.gtag('event', 'page_view', { page_path: '/900-jump' })
    }
  }, [])

  const price = plan?.price ?? 49000
  const originalPrice = plan?.original_price ?? 129000

  return (
    <div className="min-h-screen bg-white text-gray-900">
      {/* Section 1: Hero */}
      <section className="relative overflow-hidden px-4 py-20 text-center text-white" style={{ background: 'linear-gradient(135deg, #1e3a5f 0%, #0f172a 100%)' }}>
        <div className="mx-auto max-w-3xl">
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl">
            850에서 멈췄다면,<br />
            <span className="text-amber-300">공부 방법이 잘못된 겁니다</span>
          </h1>
          <p className="mt-4 text-lg opacity-95">문제집 3권 풀어도 점수가 안 오르는 이유</p>
          <p className="text-lg opacity-95">AI가 정체 구간을 분석합니다</p>
          <div className="mt-8">
            <CtaButton type="FREE_DIAGNOSIS" position="hero" />
          </div>
          <p className="mt-4 text-sm text-white/80">
            ✓ 30초 소요 &nbsp; ✓ 회원가입 없이 가능 &nbsp; ✓ 완전 무료
          </p>
          <SocialProofBar />
        </div>
      </section>

      <LossAversionBanner />

      {/* Section 2: 공감 (질문형) */}
      <section className="border-t border-gray-100 px-4 py-16">
        <div className="mx-auto max-w-3xl">
          <h2 className="text-center text-2xl font-bold text-gray-900">왜 열심히 하는데 점수는 그대로일까요?</h2>
          <div className="mt-10 grid gap-6 sm:grid-cols-3">
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-5 text-center">
              <span className="text-3xl">⏰</span>
              <p className="mt-2 text-gray-700">"Part7에서 항상 시간이 부족한데,<br />어디서 시간을 잃는지 모르지 않나요?"</p>
            </div>
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-5 text-center">
              <span className="text-3xl">📚</span>
              <p className="mt-2 text-gray-700">"문법은 아는 것 같은데<br />왜 문제는 계속 틀릴까요?"</p>
            </div>
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-5 text-center">
              <span className="text-3xl">😤</span>
              <p className="mt-2 text-gray-700">"공부 시간은 늘었는데<br />점수는 왜 그대로일까요?"</p>
            </div>
          </div>
          <p className="mt-8 text-center text-gray-700">
            문제는 노력이 아닙니다. <strong>전략이 없는 겁니다.</strong>
          </p>
        </div>
      </section>

      {/* Section 3: 솔루션 3개만 */}
      <section className="bg-gray-50 px-4 py-16">
        <div className="mx-auto max-w-3xl">
          <h2 className="text-center text-2xl font-bold text-gray-900">딱 3가지만 해결하면 됩니다</h2>
          <div className="mt-10 grid gap-6 sm:grid-cols-3">
            <div className="rounded-xl border border-gray-200 bg-white p-5">
              <span className="text-sm font-bold text-primary-600">01</span>
              <h3 className="mt-1 font-semibold text-gray-900">약점 자동 분석</h3>
              <p className="mt-1 text-sm text-gray-600">오답 패턴을 AI가 분석해<br />정확한 약점만 집중 공략</p>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white p-5">
              <span className="text-sm font-bold text-primary-600">02</span>
              <h3 className="mt-1 font-semibold text-gray-900">점수 예측</h3>
              <p className="mt-1 text-sm text-gray-600">현재 실력 기반으로<br />예상 점수를 매주 업데이트</p>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white p-5">
              <span className="text-sm font-bold text-primary-600">03</span>
              <h3 className="mt-1 font-semibold text-gray-900">전략 리포트</h3>
              <p className="mt-1 text-sm text-gray-600">이번 주 성과와<br />다음 주 전략을 자동 생성</p>
            </div>
          </div>
        </div>
      </section>

      <FutureAnxietySection />

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
            <div className="mt-6">
              <CtaButton type="FREE_DIAGNOSIS" position="sample-result" size="large" />
            </div>
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
                <button type="button" onClick={() => navigate('/reviews')} className="rounded-lg border border-gray-300 px-6 py-2 text-gray-700">
                  후기 더 보기 →
                </button>
              </div>
            </>
          ) : (
            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              <div className="rounded-xl border border-gray-200 bg-white p-4">
                <div className="text-sm font-medium text-primary-600 mb-2">820 → 895 <span className="text-green-600">(+75)</span></div>
                <p className="text-gray-700 text-sm">"2주 만에 Part7 시간이 줄었어요. AI가 정확히 어디서 시간을 잃는지 찾아줬습니다."</p>
                <span className="mt-2 block text-xs text-gray-500">김O준 · 직장인 · 2주 만에 점수 상승</span>
              </div>
              <div className="rounded-xl border border-gray-200 bg-white p-4">
                <div className="text-sm font-medium text-primary-600 mb-2">780 → 865 <span className="text-green-600">(+85)</span></div>
                <p className="text-gray-700 text-sm">"관계대명사가 약점인 줄 몰랐는데 AI 분석으로 알게 되고 집중하니 Part 5가 90%로 올랐어요."</p>
                <span className="mt-2 block text-xs text-gray-500">박O연 · 취준생</span>
              </div>
            </div>
          )}
        </div>
      </section>

      <div className="px-4 pb-6">
        <ScarcityCounter />
      </div>

      {/* Section 6: 가격 (pricing_plans 조회) */}
      <section className="px-4 py-16" id="pricing">
        <div className="mx-auto max-w-xl">
          <h2 className="text-center text-2xl font-bold text-gray-900">토답 프리미엄 시작하기</h2>
          <div className="mt-8 rounded-xl border-2 border-primary-200 bg-white p-6 shadow-sm">
            <p className="text-sm text-gray-500">정가 <s>{originalPrice.toLocaleString()}원</s></p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span className="rounded bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">베타 특가</span>
              <strong className="text-2xl text-gray-900">{price.toLocaleString()}원</strong>
              {originalPrice > 0 && (
                <span className="text-sm text-primary-600">
                  {Math.round((1 - price / originalPrice) * 100)}% 할인
                </span>
              )}
            </div>
            <ul className="mt-4 space-y-2 text-sm text-gray-700">
              <li>✓ AI 약점 분석 + 점수 예측</li>
              <li>✓ 주간 맞춤 전략 리포트</li>
              <li>✓ D-day 압축 전략 시스템</li>
            </ul>
            <div className="mt-6">
              <CtaButton type="START_PROGRAM" position="pricing" size="large" />
            </div>
            <p className="mt-3 text-center text-xs text-gray-500">진단 먼저 무료로 받고 결정하셔도 됩니다</p>
          </div>
        </div>
      </section>

      {/* Section 7: 하단 CTA */}
      <section className="border-t border-gray-100 bg-gray-50 px-4 py-16">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-xl font-bold text-gray-900">오늘 시작하면 시험일까지 달라집니다.</h2>
          <div className="mt-6">
            <CtaButton type="FREE_DIAGNOSIS" position="footer" />
          </div>
        </div>
      </section>
    </div>
  )
}
