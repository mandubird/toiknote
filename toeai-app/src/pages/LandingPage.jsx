/**
 * v4.27: 토답 900 점프 프로젝트 - 전환용 랜딩페이지
 * Hero, 문제 공감, 점수 정체 구간, AI 진단 예시(정적) + CTA, 프로그램 구조, 수치 예시, 가격, CTA
 */
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { PublicFooter } from '../components/PublicLayout'

const LandingPage = () => {
  const navigate = useNavigate()
  const { user } = useAuth()

  const scrollToPricing = () => {
    document.getElementById('pricing')?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <div className="min-h-screen bg-white text-gray-900">
      {/* Hero */}
      <section
        className="relative overflow-hidden px-4 py-20 text-center text-white"
        style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}
      >
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl">850에서 멈춰 있나요?</h1>
        <h2 className="mt-4 text-xl font-semibold sm:text-2xl md:text-3xl">900은 전략의 문제입니다.</h2>
        <p className="mt-6 text-lg opacity-95">AI 약점 분석 기반 100일 관리 시스템</p>
        <p className="mt-1 text-sm opacity-80">핵심 8주 커리큘럼 + 시험일까지 맞춤 압축 플랜</p>
        <button
          type="button"
          onClick={() => (user ? navigate('/diagnostic') : navigate('/settings'))}
          className="mt-8 rounded-xl bg-amber-400 px-8 py-4 text-lg font-bold text-gray-900 shadow-lg hover:bg-amber-300"
        >
          무료 점수 진단 받기 →
        </button>
        <div className="mt-8 flex flex-wrap justify-center gap-6 text-sm opacity-90">
          <span>✓ 첫 1기 5명과 함께 100일 실험 시작</span>
          <span>✓ 실제 점수 데이터 공개 예정</span>
          <span>✓ 피드백 기반 지속 개선</span>
        </div>
      </section>

      {/* 문제 공감 */}
      <section className="border-t border-gray-100 px-4 py-16">
        <div className="mx-auto max-w-3xl">
          <h2 className="text-center text-2xl font-bold text-gray-900">이런 고민 있으시죠?</h2>
          <div className="mt-10 grid gap-6 sm:grid-cols-3">
            {[
              { icon: '😰', title: '850에서 6개월째 정체', desc: '"문제는 많이 풀었는데 점수가 안 올라요"' },
              { icon: '⏰', title: 'Part 7 시간 부족', desc: '"항상 5~10문제 못 풀고 끝나요"' },
              { icon: '🤔', title: '뭘 공부해야 할지 모름', desc: '"약점은 아는데 어떻게 고쳐야 하나요?"' },
            ].map((item) => (
              <div key={item.title} className="rounded-xl border border-gray-200 bg-gray-50 p-5 text-center">
                <span className="text-3xl">{item.icon}</span>
                <h3 className="mt-3 font-semibold text-gray-800">{item.title}</h3>
                <p className="mt-2 text-sm text-gray-600">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 점수 정체 구간 */}
      <section className="border-t border-gray-100 bg-gray-50 px-4 py-16">
        <div className="mx-auto max-w-4xl">
          <h2 className="text-center text-2xl font-bold text-gray-900">700~900 구간, 전략이 다릅니다</h2>
          <div className="mt-10 grid gap-8 sm:grid-cols-2">
            <div className="rounded-xl border-2 border-red-200 bg-white p-6">
              <h3 className="font-semibold text-red-700">❌ 잘못된 방법</h3>
              <ul className="mt-3 list-inside list-disc space-y-1 text-gray-600">
                <li>무작정 문제만 많이 풀기</li>
                <li>약점 없이 전체 파트 골고루</li>
                <li>시간 관리 없이 정확도만</li>
              </ul>
            </div>
            <div className="rounded-xl border-2 border-green-200 bg-white p-6">
              <h3 className="font-semibold text-green-700">✅ 올바른 방법</h3>
              <ul className="mt-3 list-inside list-disc space-y-1 text-gray-600">
                <li>약점 파트 집중 공략</li>
                <li>파트별 오답 지도로 취약점 한눈에</li>
                <li>취약 태그 필터 학습</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* AI 진단 예시 + CTA */}
      <section id="diagnosis" className="border-t border-gray-100 px-4 py-16">
        <div className="mx-auto max-w-xl">
          {/* Step 1: 예시 카드 */}
          <div className="mb-2 flex items-center gap-2">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary-600 text-xs font-bold text-white">1</span>
            <h2 className="text-lg font-bold text-gray-900">AI가 이렇게 분석해줍니다</h2>
          </div>
          <p className="mb-4 ml-8 text-sm text-gray-500">오답을 찍으면 자동으로 약점 파트·태그를 찾아줘요</p>
          <div className="rounded-xl border-2 border-primary-100 bg-primary-50 p-5 shadow-sm">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-primary-500">📊 AI 진단 예시</p>
            <div className="mb-3 flex gap-4">
              <div>
                <p className="text-xs text-gray-500">현재 예상 점수</p>
                <p className="text-xl font-bold text-primary-700">650점</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">목표까지</p>
                <p className="text-xl font-bold text-green-600">+250점</p>
              </div>
            </div>
            <p className="mb-2 text-xs font-medium text-gray-600">⚠️ 발견된 약점</p>
            <ul className="space-y-1 text-sm text-gray-700">
              <li className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-red-400" />Part 5 기초 문법 부족</li>
              <li className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-orange-400" />Part 7 시간 관리</li>
              <li className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-yellow-400" />Part 2 우회답변</li>
            </ul>
            <p className="mt-3 text-xs text-gray-500 italic">
              💡 약점 집중 개선 시 <strong className="text-gray-700">80점+ 상승 사례 다수</strong>
            </p>
          </div>

          {/* Step 2: CTA */}
          <div className="mt-8 mb-2 flex items-center gap-2">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber-500 text-xs font-bold text-white">2</span>
            <h2 className="text-lg font-bold text-gray-900">지금 내 오답을 찍어보세요</h2>
          </div>
          <p className="mb-4 ml-8 text-sm text-gray-500">AI가 당신의 약점을 실제로 분석합니다</p>
          <button
            type="button"
            onClick={() => (user ? navigate('/home') : navigate('/settings'))}
            className="w-full rounded-xl bg-amber-400 py-4 text-lg font-bold text-gray-900 shadow hover:bg-amber-300"
          >
            📸 무료로 오답 분석 시작하기 →
          </button>
          <p className="mt-2 text-center text-xs text-gray-400">로그인 후 카메라로 문제를 찍으면 바로 분석돼요</p>
        </div>
      </section>

      {/* D-day 압축 전략 시스템 */}
      <section className="border-t border-gray-100 bg-gray-50 px-4 py-16">
        <div className="mx-auto max-w-3xl">
          <h2 className="text-center text-2xl font-bold text-gray-900">🎯 D-day 압축 전략 시스템</h2>
          <p className="mt-2 text-center text-sm text-gray-500">시험일 기반 자동 모드 전환 — 약점 진단 → 핵심 교정 → 압축 관리</p>
          <div className="mt-10 space-y-6">
            {[
              {
                badge: 'D-57일+',
                label: '일반 모드',
                title: 'RC·LC 균형 교정',
                desc: 'AI가 진단한 약점 태그를 균형 있게 교정하며 점수 기반을 쌓아요.',
                color: 'border-blue-200 bg-blue-50',
                badgeColor: 'bg-blue-100 text-blue-700',
              },
              {
                badge: 'D-35~56',
                label: '압축 모드',
                title: '핵심 약점 집중 공략',
                desc: '점수 손실이 큰 상위 약점만 골라 집중 공략 모드로 전환해요.',
                color: 'border-amber-200 bg-amber-50',
                badgeColor: 'bg-amber-100 text-amber-700',
              },
              {
                badge: 'D-21~34',
                label: '고압축 모드',
                title: '손실 큰 약점 압축 배치',
                desc: '시험일이 다가올수록 배율이 높은 약점부터 압축 배치해 점수를 끌어올려요.',
                color: 'border-orange-200 bg-orange-50',
                badgeColor: 'bg-orange-100 text-orange-700',
              },
              {
                badge: 'D-20 이내',
                label: '생존 모드',
                title: '핵심 파트 미션만 집중',
                desc: '새 학습 없이 핵심 파트 미션·실전 감각 유지에만 집중해 점수를 지켜요.',
                color: 'border-red-200 bg-red-50',
                badgeColor: 'bg-red-100 text-red-700',
              },
            ].map((block) => (
              <div key={block.badge} className={`rounded-xl border p-5 ${block.color}`}>
                <div className="flex items-center gap-2">
                  <span className={`inline-block rounded-full px-3 py-1 text-sm font-semibold ${block.badgeColor}`}>
                    {block.badge}
                  </span>
                  <span className="text-xs text-gray-500">{block.label}</span>
                </div>
                <h3 className="mt-2 font-semibold text-gray-900">{block.title}</h3>
                <p className="mt-1 text-sm text-gray-600">{block.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 베타 테스트 */}
      <section className="border-t border-gray-100 px-4 py-16">
        <div className="mx-auto max-w-4xl">
          <h2 className="text-center text-2xl font-bold text-gray-900">📊 베타 테스트 진행 중</h2>
          <div className="mt-10 grid gap-6 sm:grid-cols-3">
            <div className="rounded-xl border border-gray-200 bg-white p-6 text-center">
              <div className="text-2xl font-bold text-primary-600">첫 5명</div>
              <div className="mt-1 font-medium text-gray-700">실제 수험생과 함께</div>
              <div className="text-sm text-gray-500">100일 실험 시작</div>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white p-6 text-center">
              <div className="text-2xl font-bold text-primary-600">실제 성적표</div>
              <div className="mt-1 font-medium text-gray-700">점수 변화 데이터</div>
              <div className="text-sm text-gray-500">공개 예정</div>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white p-6 text-center">
              <div className="text-2xl font-bold text-primary-600">시간 관리</div>
              <div className="mt-1 font-medium text-gray-700">실제 시간 단축 데이터</div>
              <div className="text-sm text-gray-500">공개 예정</div>
            </div>
          </div>
        </div>
      </section>

      {/* 가격 */}
      <section id="pricing" className="border-t border-gray-100 bg-primary-50 px-4 py-16">
        <div className="mx-auto max-w-lg">
          <h2 className="text-center text-2xl font-bold text-gray-900">💰 토답 프리미엄</h2>
          <div className="mt-8 rounded-2xl border-2 border-primary-200 bg-white p-6 shadow-lg">
            <div className="text-center">
              <p className="text-sm text-gray-500">정가: 49,900원</p>
              <p className="mt-1">
                <span className="rounded bg-amber-200 px-2 py-0.5 text-xs font-medium">1기 한정</span>
                <span className="ml-2 text-2xl font-bold text-gray-900">44,900원</span>
              </p>
              <p className="text-sm font-medium text-green-600">5,000원 할인</p>
            </div>
            <ul className="mt-6 space-y-2 text-sm text-gray-700">
              {[
                'AI 점수 예측 (매일 업데이트)',
                '주간 리포트 자동 생성 (시험일까지)',
                '약점 집중 루틴 (개인 맞춤)',
                '시험일 D-day 맞춤 관리',
                '진행률 대시보드',
                '점수 상승 추적 그래프',
              ].map((item) => (
                <li key={item} className="flex items-center gap-2">
                  <span className="text-green-600">✓</span>
                  {item}
                </li>
              ))}
            </ul>
            <button
              type="button"
              onClick={() => navigate('/settings')}
              className="mt-6 w-full rounded-xl bg-amber-400 py-4 text-lg font-bold text-gray-900 hover:bg-amber-300"
            >
              토답 프리미엄 시작하기 (44,900원)
            </button>
          </div>
        </div>
      </section>

      {/* 최종 CTA */}
      <section className="border-t border-gray-100 px-4 py-16">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-2xl font-bold text-gray-900">900점, 이번엔 달성하세요</h2>
          <div className="mt-6 flex flex-wrap justify-center gap-4 text-sm text-gray-600">
            <span>🎯 AI 전략으로 평균 +58점</span>
            <span>💡 AI 약점 분석</span>
            <span>📊 매주 리포트</span>
          </div>
          <button
            type="button"
            onClick={() => navigate(user ? '/dashboard' : '/settings')}
            className="mt-8 rounded-xl bg-primary-600 px-10 py-4 text-lg font-bold text-white hover:bg-primary-700"
          >
            지금 시작하기 (44,900원)
          </button>
          <p className="mt-3 text-sm text-gray-500">결제 후 즉시 프로그램 시작 가능</p>
        </div>
      </section>
      <PublicFooter />
    </div>
  )
}

export default LandingPage
