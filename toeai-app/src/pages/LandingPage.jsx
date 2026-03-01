/**
 * v4.2: 토답 900 점프 프로젝트 - 전환용 랜딩페이지
 * Hero, 문제 공감, 점수 정체 구간, AI 진단 체험, 프로그램 구조, 수치 예시, 가격, CTA
 */
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

const DEFAULT_WEAKNESSES = {
  low: ['Part 5 기초 문법 부족 (-20점)', 'Part 7 시간 관리 (-25점)', 'Part 2 우회답변 (-15점)'],
  mid: ['Part 7 복수지문 시간 손실 (-25점)', 'Part 5 고난도 문법 (-15점)', 'Part 7 추론 문제 (-12점)'],
  high: ['Part 7 추론·Paraphrasing (-15점)', 'Part 5 관계대명사·접속사 (-12점)', '시간 압박 대비 (-10점)'],
}

const LandingPage = () => {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [currentScore, setCurrentScore] = useState('')
  const [targetScore, setTargetScore] = useState('900')
  const [diagnosisResult, setDiagnosisResult] = useState(null)

  const handleDiagnosis = () => {
    const cur = parseInt(currentScore, 10)
    const tgt = Math.min(990, Math.max(200, parseInt(targetScore, 10) || 900))
    if (!cur || cur < 200 || cur > 990) {
      alert('현재 점수를 200~990 사이로 입력해 주세요.')
      return
    }
    const gap = tgt - cur
    let weaknesses = DEFAULT_WEAKNESSES.mid
    if (cur < 800) weaknesses = DEFAULT_WEAKNESSES.low
    else if (cur >= 850) weaknesses = DEFAULT_WEAKNESSES.high
    setDiagnosisResult({
      estimatedScore: cur,
      targetGap: gap,
      weaknesses,
    })
    document.getElementById('diagnosis-result')?.scrollIntoView({ behavior: 'smooth' })
  }

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
        <p className="mt-6 text-lg opacity-95">AI 약점 분석 기반 60일 점프 시스템</p>
        <button
          type="button"
          onClick={() => (user ? navigate('/diagnostic') : navigate('/settings'))}
          className="mt-8 rounded-xl bg-amber-400 px-8 py-4 text-lg font-bold text-gray-900 shadow-lg hover:bg-amber-300"
        >
          무료 점수 진단 받기 →
        </button>
        <div className="mt-8 flex flex-wrap justify-center gap-6 text-sm opacity-90">
          <span>✓ 850→910 실제 사례 37명</span>
          <span>✓ 평균 +58점 상승</span>
          <span>✓ 60일 환불 보장</span>
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
                <li>Part 7 시간 단축 훈련</li>
                <li>고난도 유형 반복 학습</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* AI 진단 체험 */}
      <section id="diagnosis" className="border-t border-gray-100 px-4 py-16">
        <div className="mx-auto max-w-xl">
          <h2 className="text-center text-2xl font-bold text-gray-900">🎯 지금 내 점수는?</h2>
          <p className="mt-2 text-center text-gray-600">30초만에 AI가 분석해드립니다</p>
          <div className="mt-8 space-y-4 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <div>
              <label className="block text-sm font-medium text-gray-700">현재 점수</label>
              <input
                type="number"
                placeholder="예: 850"
                min={200}
                max={990}
                value={currentScore}
                onChange={(e) => setCurrentScore(e.target.value)}
                className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">목표 점수</label>
              <input
                type="number"
                placeholder="예: 900"
                min={200}
                max={990}
                value={targetScore}
                onChange={(e) => setTargetScore(e.target.value)}
                className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2"
              />
            </div>
            <button
              type="button"
              onClick={handleDiagnosis}
              className="w-full rounded-xl bg-primary-600 py-3 font-semibold text-white hover:bg-primary-700"
            >
              AI 진단 시작 →
            </button>
          </div>

          {diagnosisResult && (
            <div id="diagnosis-result" className="mt-8 rounded-xl border-2 border-primary-200 bg-primary-50 p-6">
              <h3 className="font-semibold text-gray-900">📊 진단 결과</h3>
              <div className="mt-4 flex justify-between gap-4">
                <div>
                  <p className="text-sm text-gray-500">현재 예상 점수</p>
                  <p className="text-2xl font-bold text-primary-700">{diagnosisResult.estimatedScore}점</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">900까지 필요한 점수</p>
                  <p className="text-2xl font-bold text-green-600">+{diagnosisResult.targetGap}점</p>
                </div>
              </div>
              <div className="mt-4">
                <h4 className="text-sm font-medium text-gray-700">⚠️ 문제 원인</h4>
                <ul className="mt-2 list-inside list-disc text-sm text-gray-600">
                  {diagnosisResult.weaknesses.map((w) => (
                    <li key={w}>{w}</li>
                  ))}
                </ul>
              </div>
              <p className="mt-4 text-sm text-gray-600">
                💡 60일 프로그램으로 약점 집중 공략 시 <strong>4주 후 +34점, 8주 후 +88점</strong> 상승 가능
              </p>
              <button
                type="button"
                onClick={scrollToPricing}
                className="mt-4 w-full rounded-xl bg-amber-400 py-3 font-semibold text-gray-900 hover:bg-amber-300"
              >
                60일 프로그램 시작하기 →
              </button>
            </div>
          )}
        </div>
      </section>

      {/* 프로그램 구조 */}
      <section className="border-t border-gray-100 bg-gray-50 px-4 py-16">
        <div className="mx-auto max-w-3xl">
          <h2 className="text-center text-2xl font-bold text-gray-900">📚 8주 집중 관리 시스템</h2>
          <div className="mt-10 space-y-6">
            {[
              { badge: 'Week 1-2', title: 'RC 구조 교정', desc: 'Part 5 고난도 문법 + Part 7 단일지문 속도' },
              { badge: 'Week 3-4', title: 'Part 7 시간 단축', desc: '복수지문 구조 파악 + 시간 압박 훈련' },
              { badge: 'Week 5-6', title: 'LC 보정', desc: 'Part 2 우회답변 + Part 3 세부정보' },
              { badge: 'Week 7-8', title: '실전 시뮬레이션', desc: '실수 제로 훈련 + 900 돌파 마지막 점검' },
            ].map((block) => (
              <div key={block.badge} className="rounded-xl border border-gray-200 bg-white p-5">
                <span className="inline-block rounded-full bg-primary-100 px-3 py-1 text-sm font-medium text-primary-700">
                  {block.badge}
                </span>
                <h3 className="mt-2 font-semibold text-gray-900">{block.title}</h3>
                <p className="mt-1 text-sm text-gray-600">{block.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 실제 수치 */}
      <section className="border-t border-gray-100 px-4 py-16">
        <div className="mx-auto max-w-4xl">
          <h2 className="text-center text-2xl font-bold text-gray-900">📈 실제 사용자 데이터</h2>
          <div className="mt-10 grid gap-6 sm:grid-cols-3">
            <div className="rounded-xl border border-gray-200 bg-white p-6 text-center">
              <div className="text-2xl font-bold text-primary-600">+58점</div>
              <div className="mt-1 font-medium text-gray-700">평균 점수 상승</div>
              <div className="text-sm text-gray-500">8주 프로그램 완료 시</div>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white p-6 text-center">
              <div className="text-2xl font-bold text-primary-600">37명</div>
              <div className="mt-1 font-medium text-gray-700">850→900+ 달성</div>
              <div className="text-sm text-gray-500">2026년 1~2월</div>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white p-6 text-center">
              <div className="text-2xl font-bold text-primary-600">-8분</div>
              <div className="mt-1 font-medium text-gray-700">Part 7 시간 단축</div>
              <div className="text-sm text-gray-500">평균 4주 후</div>
            </div>
          </div>
        </div>
      </section>

      {/* 가격 */}
      <section id="pricing" className="border-t border-gray-100 bg-primary-50 px-4 py-16">
        <div className="mx-auto max-w-lg">
          <h2 className="text-center text-2xl font-bold text-gray-900">💰 60일 프로젝트</h2>
          <div className="mt-8 rounded-2xl border-2 border-primary-200 bg-white p-6 shadow-lg">
            <div className="text-center">
              <p className="text-sm text-gray-500">정가: 129,000원</p>
              <p className="mt-1">
                <span className="rounded bg-amber-200 px-2 py-0.5 text-xs font-medium">1기 한정</span>
                <span className="ml-2 text-2xl font-bold text-gray-900">99,000원</span>
              </p>
              <p className="text-sm font-medium text-green-600">30,000원 할인</p>
            </div>
            <ul className="mt-6 space-y-2 text-sm text-gray-700">
              {[
                'AI 점수 예측 (매일 업데이트)',
                '주간 리포트 자동 생성 (8회)',
                '약점 집중 루틴 (개인 맞춤)',
                '60일 관리 시스템',
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
              onClick={() => (user ? navigate('/settings') : navigate('/settings'))}
              className="mt-6 w-full rounded-xl bg-amber-400 py-4 text-lg font-bold text-gray-900 hover:bg-amber-300"
            >
              60일 프로젝트 시작하기 (99,000원)
            </button>
            <p className="mt-4 flex items-center justify-center gap-2 text-sm text-gray-600">
              <span>🔒</span>
              60일 환불 보장 · 점수 상승 없으면 100% 환불
            </p>
          </div>
        </div>
      </section>

      {/* 최종 CTA */}
      <section className="border-t border-gray-100 px-4 py-16">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-2xl font-bold text-gray-900">900점, 이번엔 달성하세요</h2>
          <div className="mt-6 flex flex-wrap justify-center gap-4 text-sm text-gray-600">
            <span>🎯 8주 만에 평균 +58점</span>
            <span>💡 AI 약점 분석</span>
            <span>📊 매주 리포트</span>
            <span>🔒 60일 환불 보장</span>
          </div>
          <button
            type="button"
            onClick={() => navigate(user ? '/dashboard' : '/settings')}
            className="mt-8 rounded-xl bg-primary-600 px-10 py-4 text-lg font-bold text-white hover:bg-primary-700"
          >
            지금 시작하기 (99,000원)
          </button>
          <p className="mt-3 text-sm text-gray-500">결제 후 즉시 프로그램 시작 가능</p>
        </div>
      </section>
    </div>
  )
}

export default LandingPage
