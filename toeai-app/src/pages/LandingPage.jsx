/**
 * 랜딩 페이지 — docs/26.03.19_todap_landing_rebuild_spec.md (v3)
 */
import { useNavigate } from 'react-router-dom'
import { useState, useEffect, useMemo } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { PublicFooter } from '../components/PublicLayout'
import { siteBusinessInfo } from '../config/siteBusinessInfo'
import { supabase } from '../lib/supabase'

const LandingPage = () => {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [hasDiagnosed, setHasDiagnosed] = useState(false)
  const [proofList, setProofList] = useState([])

  // 로그인 유저의 진단 완료 여부 확인
  useEffect(() => {
    if (!user) { setHasDiagnosed(false); return }
    supabase
      .from('users')
      .select('program_status')
      .eq('id', user.id)
      .maybeSingle()
      .then(({ data }) => {
        setHasDiagnosed(!!data?.program_status && data.program_status !== 'none')
      })
  }, [user])

  // 증거 섹션: 공개·2단계 후기만, 최대 3건 (랜딩 리빌드 스펙)
  useEffect(() => {
    supabase
      .from('proof_assets')
      .select('id, headline, content, start_score, current_score, usage_days')
      .eq('type', 'review')
      .eq('is_public', true)
      .eq('review_stage', 2)
      .order('created_at', { ascending: false })
      .limit(3)
      .then(({ data, error }) => {
        if (error) return
        setProofList(data || [])
      })
  }, [])

  const scrollToPlans = () => {
    document.getElementById('plans')?.scrollIntoView({ behavior: 'smooth' })
  }

  const handleMainCta = () => {
    if (hasDiagnosed) navigate('/program')
    else navigate('/diagnostic')
  }

  const handlePlanCta = () => {
    if (user) {
      navigate('/settings?pay=1')
    } else {
      navigate('/diagnostic')
    }
  }

  const visibleProofs = useMemo(
    () =>
      proofList
        .filter((p) => p.start_score != null && p.current_score != null)
        .slice(0, 3),
    [proofList]
  )

  return (
    <div className="min-h-screen bg-white text-gray-900">
      {/* ── 체험단 모집 배너 (/landing 전용) ── */}
      <div
        className="px-5 py-2.5 text-white"
        style={{ backgroundColor: '#FF6B2C' }}
      >
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-center gap-1 text-center sm:flex-row sm:gap-2">
          <p className="text-sm font-semibold leading-snug">
            🎯 지금 1기 무료 체험단 모집 중 — 9명 한정 (원래 29,900~79,900원 유료)
          </p>
          <a
            href="https://docs.google.com/forms/d/e/1FAIpQLSdCugg1bwCgHg8wgMeLmsV9Qs4vrC2M4zTg-geuu6nFiAyUUg/viewform"
            target="_blank"
            rel="noreferrer"
            className="text-sm font-bold underline underline-offset-2 hover:opacity-90"
          >
            체험단 신청하기 →
          </a>
        </div>
      </div>

      {/* ── 로그인 사용자 배너 ── */}
      {user && (
        <div className="sticky top-0 z-50 bg-primary-600 text-white py-3 px-4 flex items-center justify-center gap-3">
          <span className="text-sm">이미 계정이 있습니다</span>
          <button
            type="button"
            onClick={() => navigate('/dashboard')}
            className="rounded-lg bg-white/20 px-4 py-1.5 text-sm font-semibold hover:bg-white/30 transition-colors"
          >
            내 대시보드로 가기 →
          </button>
        </div>
      )}

      {/* ── 1. Hero ── */}
      <section
        className="relative overflow-hidden px-4 py-20 text-center text-white"
        style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}
      >
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl">
          700~900 구간에서<br />멈춰 있나요?
        </h1>
        <p className="mt-5 text-lg font-semibold sm:text-xl opacity-95 leading-relaxed">
          점수는 더 푸는 문제가 아니라<br />
          무엇을 먼저 줄이느냐의 문제입니다.
        </p>
        <p className="mt-4 text-sm opacity-80 leading-relaxed max-w-sm mx-auto">
          토답은 현재 점수, 약점 파트, 시험일까지 남은 시간을 바탕으로<br />
          가장 점수 손실이 큰 영역부터 압축 관리하는 토익 전략 서비스입니다.
        </p>
        <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <button
            type="button"
            onClick={handleMainCta}
            className="w-full max-w-xs rounded-xl bg-amber-400 px-8 py-4 text-lg font-bold text-gray-900 shadow-lg hover:bg-amber-300 sm:w-auto"
          >
            무료로 시작하기 →
          </button>
          <button
            type="button"
            onClick={scrollToPlans}
            className="w-full max-w-xs rounded-xl border-2 border-white/80 bg-white/10 px-6 py-3 text-sm font-semibold text-white hover:bg-white/20 sm:w-auto"
          >
            내 상황에 맞는 플랜 보기
          </button>
        </div>
        <div className="mt-8 flex flex-col items-center gap-2 text-sm opacity-90 sm:flex-row sm:flex-wrap sm:justify-center sm:gap-6">
          <span>✓ 진단 후 내 약점 TOP3 바로 확인</span>
          <span>✓ 오늘 해야 할 공부 3개 제시</span>
          <span>✓ 시험일까지 버릴 공부까지 정리</span>
        </div>
      </section>

      {/* ── 2. 문제 공감 ── */}
      <section className="border-t border-gray-100 px-4 py-16">
        <div className="mx-auto max-w-3xl">
          <h2 className="text-center text-2xl font-bold text-gray-900">이런 고민 있으신가요?</h2>
          <p className="mt-3 text-center text-sm text-gray-500 leading-relaxed">
            토익 점수가 정체되는 이유는 문제를 적게 풀어서가 아니라,<br />
            어디서 점수를 잃고 있는지 모른 채 공부하기 때문입니다.
          </p>
          <div className="mt-10 grid gap-6 sm:grid-cols-3">
            {[
              { icon: '😥', title: '850에서 몇 달째 정체', desc: '"문제는 많이 풀었는데 점수가 안 올라요"' },
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

      {/* ── 3. 잘못된 방법 vs 올바른 방법 ── */}
      <section className="border-t border-gray-100 bg-gray-50 px-4 py-16">
        <div className="mx-auto max-w-4xl">
          <p className="mx-auto max-w-2xl text-center text-base font-medium text-gray-800 leading-relaxed mb-10">
            토답은 문제를 더 많이 풀게 만드는 서비스가 아닙니다.
            <br />
            점수를 가장 많이 깎는 원인을 먼저 줄이는 서비스입니다.
          </p>
          <h2 className="text-center text-2xl font-bold text-gray-900">700~900 구간, 전략이 다릅니다</h2>
          <p className="mt-3 text-center text-sm text-gray-500 leading-relaxed">
            고득점 구간에서는 무작정 더 푸는 것보다<br />
            점수를 가장 많이 깎는 약점부터 줄이는 전략이 필요합니다.
          </p>
          <div className="mt-10 grid gap-8 sm:grid-cols-2">
            <div className="rounded-xl border-2 border-red-200 bg-white p-6">
              <h3 className="font-semibold text-red-700">❌ 잘못된 방법</h3>
              <ul className="mt-3 list-inside list-disc space-y-2 text-gray-600 text-sm">
                <li>무작정 문제만 많이 풀기</li>
                <li>약점 없이 전체 파트 골고루 공부하기</li>
                <li>시간 전략 없이 정확도만 올리기</li>
                <li>이미 아는 영역까지 반복하며 불안 해소하기</li>
              </ul>
            </div>
            <div className="rounded-xl border-2 border-green-200 bg-white p-6">
              <h3 className="font-semibold text-green-700">✅ 올바른 방법</h3>
              <ul className="mt-3 list-inside list-disc space-y-2 text-gray-600 text-sm">
                <li>점수 손실이 큰 약점부터 먼저 줄이기</li>
                <li>약한 파트와 취약 태그를 우선순위로 재배치하기</li>
                <li>시험일까지 남은 시간에 맞춰 압축 전략 적용하기</li>
                <li>이미 잡힌 영역보다 흔들리는 약점에 집중하기</li>
              </ul>
            </div>
          </div>
          <p className="mt-8 text-center text-sm text-gray-500 leading-relaxed">
            토답은 오답을 정리하는 데서 끝나지 않고<br />
            <strong className="text-gray-700">"지금 가장 먼저 고쳐야 할 문제"</strong>를 보여줍니다.
          </p>
        </div>
      </section>

      {/* ── 4. 분석 예시 ── */}
      <section id="diagnosis" className="border-t border-gray-100 px-4 py-16">
        <div className="mx-auto max-w-xl">
          <h2 className="text-2xl font-bold text-gray-900 text-center">학습 맞춤 엔진이 이렇게 분석합니다</h2>
          <p className="mt-3 text-center text-sm text-gray-500 leading-relaxed">
            현재 점수와 오답 데이터를 바탕으로<br />
            가장 점수 손실이 큰 약점을 찾아드립니다.
          </p>

          {/* 예시 카드 */}
          <div className="mt-8 rounded-xl border-2 border-primary-100 bg-primary-50 p-5 shadow-sm">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-primary-500">📊 분석 예시</p>
            <div className="mb-3 flex gap-6">
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
            <div className="mt-4 pt-4 border-t border-primary-200 space-y-1">
              <p className="text-xs text-gray-600">
                <span className="font-semibold text-gray-700">지금 가장 큰 손실:</span> Part 7 시간 관리
              </p>
              <p className="text-xs text-gray-600">
                <span className="font-semibold text-gray-700">우선 교정 순서:</span> Part 5 → Part 2 → Part 7
              </p>
            </div>
            <p className="mt-3 text-xs text-gray-500 italic">
              💡 약점 집중 교정 시 <strong className="text-gray-700">80점+ 상승 사례 다수</strong>
            </p>
          </div>

          {/* CTA */}
          <div className="mt-8">
            {hasDiagnosed ? (
              <>
                <p className="mb-2 text-sm font-semibold text-green-700">✅ 이미 진단이 완료됐어요</p>
                <button
                  type="button"
                  onClick={handleMainCta}
                  className="w-full rounded-xl bg-primary-600 py-4 text-lg font-bold text-white shadow hover:bg-primary-700"
                >
                  내 전략 플랜 보기 →
                </button>
              </>
            ) : (
              <>
                <p className="mb-2 text-sm font-semibold text-gray-700">1. 먼저 현재 상태를 확인하세요</p>
                <button
                  type="button"
                  onClick={handleMainCta}
                  className="w-full rounded-xl bg-amber-400 py-4 text-lg font-bold text-gray-900 shadow hover:bg-amber-300"
                >
                  무료로 시작하기 →
                </button>
                <p className="mt-2 text-center text-xs text-gray-400 leading-relaxed">
                  로그인 후 오답 문제를 등록하면<br />진단 결과가 더 정확해집니다.
                </p>
              </>
            )}
          </div>
        </div>
      </section>

      {/* ── 5. D-day 압축 전략 ── */}
      <section className="border-t border-gray-100 bg-gray-50 px-4 py-16">
        <div className="mx-auto max-w-3xl">
          <h2 className="text-center text-2xl font-bold text-gray-900">🎯 D-day 압축 전략 시스템</h2>
          <p className="mt-3 text-center text-sm text-gray-500 leading-relaxed">
            시험일까지 남은 시간에 따라<br />
            약점 진단 → 핵심 교정 → 압축 관리 모드가 자동으로 바뀝니다.
          </p>
          <div className="mt-10 space-y-6">
            {[
              {
                badge: 'D-57일+',
                label: '일반 모드',
                title: 'RC·LC 균형 교정',
                desc: '약점 태그를 균형 있게 교정하며 점수 기반을 쌓아요.',
                sub: '아직 시간이 있을 때는 약점 전반을 안정적으로 다집니다.',
                color: 'border-blue-200 bg-blue-50',
                badgeColor: 'bg-blue-100 text-blue-700',
              },
              {
                badge: 'D-35~56',
                label: '압축 모드',
                title: '핵심 약점 집중 공략',
                desc: '점수 손실이 큰 상위 약점만 골라 집중 공략 모드로 전환해요.',
                sub: '내 점수를 가장 많이 깎는 약점부터 먼저 줄입니다.',
                color: 'border-amber-200 bg-amber-50',
                badgeColor: 'bg-amber-100 text-amber-700',
              },
              {
                badge: 'D-21~34',
                label: '고압축 모드',
                title: '손실 큰 약점 압축 배치',
                desc: '시험일이 다가올수록 비율이 높은 약점부터 압축 배치해 점수를 끌어올려요.',
                sub: '균형보다 우선순위가 중요해지는 구간입니다.',
                color: 'border-orange-200 bg-orange-50',
                badgeColor: 'bg-orange-100 text-orange-700',
              },
              {
                badge: 'D-20 이내',
                label: '생존 모드',
                title: '핵심 파트 미션만 집중',
                desc: '새 학습 없이 핵심 파트 미션과 실전 감각 유지에만 집중해 점수를 지켜요.',
                sub: '이 시점부터는 더 배우기보다 잃지 않는 전략이 중요합니다.',
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
                <p className="mt-1 text-xs text-gray-500 italic">{block.sub}</p>
              </div>
            ))}
          </div>
          <div className="mt-8 text-center">
            <button
              type="button"
              onClick={handleMainCta}
              className="rounded-xl border border-primary-300 bg-white px-6 py-3 text-sm font-semibold text-primary-700 hover:bg-primary-50"
            >
              내 시험일 기준 전략 보기 →
            </button>
          </div>
        </div>
      </section>

      {/* ── 6. 실사용자 증거 (데이터 있을 때만 전체 섹션 렌더) ── */}
      {visibleProofs.length > 0 && (
        <section className="border-t border-gray-100 px-4 py-16">
          <div className="mx-auto max-w-4xl">
            <h2 className="text-center text-2xl font-bold text-gray-900 mb-8">실제 사용자 변화</h2>
            <div className="grid gap-4 sm:grid-cols-3">
              {visibleProofs.map((p) => {
                  const diff = p.current_score - p.start_score
                  const raw = typeof p.content === 'string' ? p.content.trim() : ''
                  const isJsonLike = raw.startsWith('{')
                  const textBody = isJsonLike ? '' : raw
                  const body =
                    textBody.length > 80 ? `${textBody.slice(0, 80)}…` : textBody
                  return (
                    <div key={p.id} className="rounded-xl border border-gray-200 bg-white p-4 text-sm text-gray-700">
                      <p className="text-sm font-bold text-green-700 mb-1">
                        {p.start_score} → {p.current_score}
                        {diff > 0 && <span className="text-xs ml-1">(+{diff}점)</span>}
                      </p>
                      {p.usage_days != null && (
                        <p className="text-[11px] text-gray-500 mb-2">{p.usage_days}일 사용</p>
                      )}
                      {p.headline && (
                        <p className="font-semibold text-gray-900 mb-2">{p.headline}</p>
                      )}
                      {body ? (
                        <p className="text-xs leading-relaxed text-gray-600 whitespace-pre-line">{body}</p>
                      ) : null}
                    </div>
                  )
                })}
            </div>
          </div>
        </section>
      )}

      {/* ── 7. 가격 플랜 ── */}
      <section id="plans" className="border-t border-gray-100 bg-primary-50 px-4 py-16">
        <div className="mx-auto max-w-4xl">
          <h2 className="text-center text-2xl font-bold text-gray-900">내 상황에 맞는 플랜을 선택하세요</h2>
          <p className="mt-3 text-center text-sm text-gray-500 leading-relaxed">
            시험일까지 남은 시간과 공부 강도에 맞춰<br />
            가장 적합한 기간 플랜을 선택할 수 있습니다.
          </p>

          <div className="mt-10 grid gap-6 sm:grid-cols-3">

            {/* 플랜 1: 15일 */}
            <div className="rounded-2xl border border-gray-200 bg-white p-6 flex flex-col">
              <p className="text-xs font-medium text-primary-700 mb-2">시험 2주 이내 남은 사람</p>
              <div className="text-xs font-semibold text-gray-500 mb-1">시험 임박자용</div>
              <div className="text-lg font-bold text-gray-900">시험 직전 압축</div>
              <div className="mt-2 text-2xl font-bold text-gray-900">29,900원</div>
              <p className="mt-2 text-xs text-gray-500 leading-relaxed">
                시험일까지 시간이 많지 않은 수험생을 위한 단기 압축 플랜
              </p>
              <ul className="mt-4 space-y-1.5 text-sm text-gray-600 flex-1">
                {['초기 진단', '약점 분석', 'D-day 압축 전략', '오답 기록', '약점 체크리스트'].map((item) => (
                  <li key={item} className="flex items-center gap-2">
                    <span className="text-green-500">✓</span>{item}
                  </li>
                ))}
              </ul>
              <button
                type="button"
                onClick={handlePlanCta}
                className="mt-6 w-full rounded-xl border border-gray-300 bg-white py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50"
              >
                15일 플랜 시작하기
              </button>
            </div>

            {/* 플랜 2: 30일 (메인) */}
            <div className="rounded-2xl border-2 border-primary-400 bg-white p-6 flex flex-col shadow-lg relative">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <span className="rounded-full bg-primary-600 px-4 py-1 text-xs font-bold text-white whitespace-nowrap">
                  가장 많이 선택
                </span>
              </div>
              <p className="text-xs font-medium text-primary-700 mb-2 mt-2">이번 시험 전 방향 잡고 싶은 사람</p>
              <div className="text-xs font-semibold text-primary-500 mb-1">추천 플랜</div>
              <div className="text-lg font-bold text-gray-900">표준 점수 상승</div>
              <div className="mt-2 text-2xl font-bold text-primary-700">49,900원</div>
              <p className="mt-2 text-xs text-gray-500 leading-relaxed">
                약점 진단부터 집중 교정까지 가장 균형 있게 사용할 수 있는 추천 플랜
              </p>
              <ul className="mt-4 space-y-1.5 text-sm text-gray-600 flex-1">
                {[
                  '점수 진단',
                  '핵심 약점 분석',
                  'D-day 맞춤 전략',
                  '오답 기록 및 정밀 보정',
                  '약점 체크리스트 / 마스터리 보드',
                  'D-day 맞춤 코칭 가이드',
                ].map((item) => (
                  <li key={item} className="flex items-center gap-2">
                    <span className="text-green-500">✓</span>{item}
                  </li>
                ))}
              </ul>
              <button
                type="button"
                onClick={handlePlanCta}
                className="mt-6 w-full rounded-xl bg-amber-400 py-3 text-sm font-bold text-gray-900 hover:bg-amber-300"
              >
                30일 플랜 시작하기
              </button>
              <p className="mt-2 text-center text-xs text-gray-400">대부분의 수험생에게 가장 적합한 기본 플랜</p>
            </div>

            {/* 플랜 3: 60일 */}
            <div className="rounded-2xl border border-gray-200 bg-white p-6 flex flex-col">
              <p className="text-xs font-medium text-primary-700 mb-2">850 이상 정체 구간 탈출하고 싶은 사람</p>
              <div className="text-xs font-semibold text-gray-500 mb-1">장기 준비용</div>
              <div className="text-lg font-bold text-gray-900">정체 탈출 집중</div>
              <div className="mt-2 text-2xl font-bold text-gray-900">79,900원</div>
              <p className="mt-2 text-xs text-gray-500 leading-relaxed">
                시간 여유가 있는 수험생을 위한 안정형 플랜
              </p>
              <ul className="mt-4 space-y-1.5 text-sm text-gray-600 flex-1">
                {[
                  '점수 진단',
                  '약점 분석',
                  'D-day 맞춤 전략',
                  '오답 기록',
                  '마스터리 보드',
                  '장기 체크/재확인 관리',
                ].map((item) => (
                  <li key={item} className="flex items-center gap-2">
                    <span className="text-green-500">✓</span>{item}
                  </li>
                ))}
              </ul>
              <button
                type="button"
                onClick={handlePlanCta}
                className="mt-6 w-full rounded-xl border border-gray-300 bg-white py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50"
              >
                60일 플랜 시작하기
              </button>
            </div>

          </div>
        </div>
      </section>

      {/* ── 8. 최종 CTA ── */}
      <section className="border-t border-gray-100 px-4 py-16">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-2xl font-bold text-gray-900">이번엔, 점수 손실부터 줄여보세요</h2>
          <p className="mt-4 text-sm text-gray-500 leading-relaxed">
            더 많은 문제를 풀기 전에,<br />
            지금 내 점수를 가장 많이 깎는 원인을 먼저 줄이는 것이 중요합니다.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-4 text-sm text-gray-600">
            <span>🎯 약점 분석</span>
            <span>📉 점수 손실 원인 진단</span>
            <span>📅 시험일까지 압축 전략</span>
          </div>
          <button
            type="button"
            onClick={handleMainCta}
            className="mt-8 rounded-xl bg-amber-400 px-10 py-4 text-lg font-bold text-gray-900 hover:bg-amber-300"
          >
            무료로 시작하기 →
          </button>
          <p className="mt-4 text-xs text-gray-400">또는</p>
          <button
            type="button"
            onClick={handlePlanCta}
            className="mt-2 rounded-xl border border-primary-400 px-8 py-3 text-sm font-semibold text-primary-700 hover:bg-primary-50"
          >
            30일 집중 플랜 시작하기
          </button>
          <p className="mt-3 text-sm text-gray-500">결제 후 즉시 이용 가능 · 시험일과 목표 점수에 맞춰 바로 전략이 구성됩니다.</p>
        </div>
      </section>

      {/* ── 9. 신뢰 문구 (푸터 직전) ── */}
      <section className="border-t border-gray-100 bg-gray-50 px-4 py-10">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm text-gray-600 leading-relaxed">
            토답은 문제를 더 많이 풀게 만드는 서비스가 아닙니다.
            <br />
            점수를 가장 많이 깎는 원인을 먼저 줄이는 서비스입니다.
          </p>
        </div>
      </section>

      <PublicFooter />
    </div>
  )
}

export default LandingPage
