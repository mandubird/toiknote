/**
 * v5.0: 무료 점수 진단 — 멀티스텝 온보딩 위자드
 * Step 0: 인트로 + 로그인
 * Step 1: 최근 점수 (총점, LC/RC 선택)
 * Step 2: 목표 점수 + 시험일
 * Step 3: 약점 자가 진단 (멀티셀렉트)
 * Step 4: 공부 패턴 (싱글셀렉트)
 * Step 5: 진단 결과
 */
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { updateUserProfile } from '../services/userProfile'
import { updateExamDate } from '../services/programService'
import { supabase } from '../lib/supabase'

/* ── 약점 선택지 ── */
const WEAKNESS_OPTIONS = [
  { id: 'p5_grammar', label: 'Part 5 기초 문법 부족', part: 5 },
  { id: 'p6_inference', label: 'Part 6 빈칸 추론 어려움', part: 6 },
  { id: 'p7_time', label: 'Part 7 시간 부족', part: 7 },
  { id: 'p7_multi', label: 'Part 7 복수지문 (이중/삼중)', part: 7 },
  { id: 'p2_indirect', label: 'Part 2 우회답변 혼동', part: 2 },
  { id: 'p34_detail', label: 'Part 3/4 세부정보 놓침', part: 3 },
  { id: 'p1_trap', label: 'Part 1 함정 보기', part: 1 },
  { id: 'repeat_mistake', label: '문법은 아는데 실수 반복', part: 5 },
  { id: 'rc_time', label: '시간 관리 (RC 전체)', part: 7 },
  { id: 'vocab', label: '어휘력 부족', part: 5 },
]

/* ── 공부 패턴 선택지 ── */
const STUDY_PATTERNS = [
  { id: 'daily', label: '매일 꾸준히 (1~2시간)', icon: '📚' },
  { id: 'weekend', label: '주말 집중형', icon: '📅' },
  { id: 'cram', label: '시험 직전 벼락치기', icon: '⚡' },
  { id: 'irregular', label: '불규칙 / 간헐적', icon: '🔄' },
]

/* ── D-day 전략 모드 계산 ── */
function getStrategyMode(daysLeft) {
  if (daysLeft == null) return { label: '일반 모드', badge: '시험일 미정', color: 'bg-gray-100 text-gray-700' }
  if (daysLeft > 56) return { label: '일반 모드', badge: `D-${daysLeft}`, color: 'bg-blue-100 text-blue-700', desc: 'RC·LC 균형 교정 — 약점 전반을 안정적으로 다집니다.' }
  if (daysLeft >= 35) return { label: '압축 모드', badge: `D-${daysLeft}`, color: 'bg-amber-100 text-amber-700', desc: '점수 손실이 큰 상위 약점만 골라 집중 공략합니다.' }
  if (daysLeft >= 21) return { label: '고압축 모드', badge: `D-${daysLeft}`, color: 'bg-orange-100 text-orange-700', desc: '비율이 높은 약점부터 압축 배치해 점수를 끌어올립니다.' }
  return { label: '생존 모드', badge: `D-${daysLeft}`, color: 'bg-red-100 text-red-700', desc: '핵심 파트 미션과 실전 감각 유지에만 집중합니다.' }
}

/* ── 약점 개수 기반 메시지 ── */
function getImprovementMsg(count) {
  if (count <= 2) return '집중 교정 시 40~60점 상승 가능'
  if (count <= 4) return '집중 교정 시 60~100점 상승 가능'
  return '체계적 교정 시 100점+ 상승 가능'
}

const TOTAL_STEPS = 5

const DiagnosticPage = () => {
  const navigate = useNavigate()
  const { user, loading: authLoading, signInWithGoogle } = useAuth()

  const [step, setStep] = useState(0)
  const [saving, setSaving] = useState(false)
  const [authError, setAuthError] = useState(null)

  // Step 1
  const [currentScore, setCurrentScore] = useState('')
  const [lcScore, setLcScore] = useState('')
  const [rcScore, setRcScore] = useState('')

  // Step 2
  const [targetScore, setTargetScore] = useState('900')
  const [examDate, setExamDate] = useState('')

  // Step 3
  const [selectedWeaknesses, setSelectedWeaknesses] = useState([])

  // Step 4
  const [studyPattern, setStudyPattern] = useState('')

  /* ── handlers ── */
  const handleGoogleLogin = async () => {
    setAuthError(null)
    try {
      await signInWithGoogle(window.location.origin + '/diagnostic')
    } catch (err) {
      setAuthError(err?.message || '로그인에 실패했어요.')
    }
  }

  const toggleWeakness = (id) => {
    setSelectedWeaknesses((prev) =>
      prev.includes(id) ? prev.filter((w) => w !== id) : [...prev, id]
    )
  }

  const canNext = () => {
    if (step === 1) {
      const s = parseInt(currentScore, 10)
      return !isNaN(s) && s >= 200 && s <= 990
    }
    if (step === 2) {
      const t = parseInt(targetScore, 10)
      return !isNaN(t) && t >= 200 && t <= 990
    }
    if (step === 3) return selectedWeaknesses.length >= 1
    if (step === 4) return studyPattern !== ''
    return true
  }

  const handleNext = () => {
    if (step < 4) {
      setStep(step + 1)
    } else if (step === 4) {
      handleSubmit()
    }
  }

  const handleSubmit = async () => {
    if (!user) return
    setSaving(true)
    try {
      const curVal = parseInt(currentScore, 10)
      const tgtVal = parseInt(targetScore, 10)
      const lcVal = lcScore.trim() ? parseInt(lcScore, 10) : null
      const rcVal = rcScore.trim() ? parseInt(rcScore, 10) : null

      // 1) users 프로필 업데이트
      await updateUserProfile(user.id, {
        currentScore: curVal,
        targetScore: tgtVal,
        lcScore: lcVal,
        rcScore: rcVal,
      })

      // 2) 시험일 저장
      if (examDate) {
        await updateExamDate(user.id, examDate)
      }

      // 3) diagnostic_sessions 스냅샷 저장
      await supabase.from('diagnostic_sessions').insert({
        user_id: user.id,
        current_score: curVal,
        target_score: tgtVal,
        lc_score: lcVal,
        rc_score: rcVal,
        exam_date: examDate || null,
        self_reported_weaknesses: selectedWeaknesses,
        study_pattern: studyPattern,
        score_gap: tgtVal - curVal,
        weakness_count: selectedWeaknesses.length,
      })

      setStep(5)
    } catch (err) {
      console.error('[DiagnosticPage] submit error:', err)
      alert(`저장에 실패했어요.\n${err?.message || ''}`)
    } finally {
      setSaving(false)
    }
  }

  /* ── computed values for result ── */
  const scoreGap = parseInt(targetScore, 10) - parseInt(currentScore, 10)
  const daysLeft = examDate
    ? Math.ceil((new Date(examDate).setHours(0, 0, 0, 0) - new Date().setHours(0, 0, 0, 0)) / (1000 * 60 * 60 * 24))
    : null
  const strategyMode = getStrategyMode(daysLeft)
  const weaknessLabels = selectedWeaknesses
    .map((id) => WEAKNESS_OPTIONS.find((w) => w.id === id))
    .filter(Boolean)

  /* ── progress bar ── */
  const progress = step === 0 ? 0 : step === 5 ? 100 : Math.round((step / TOTAL_STEPS) * 100)

  /* ── loading ── */
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="animate-spin w-8 h-8 border-2 border-primary-200 border-t-primary-600 rounded-full" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Progress bar */}
      {step > 0 && step < 5 && (
        <div className="sticky top-0 z-10 bg-white border-b border-gray-100">
          <div className="h-1 bg-gray-100">
            <div
              className="h-full bg-primary-500 transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="flex items-center justify-between px-4 py-3">
            <button type="button" onClick={() => setStep(step - 1)} className="text-sm text-gray-500">
              ← 이전
            </button>
            <span className="text-xs text-gray-400">{step} / {TOTAL_STEPS}</span>
          </div>
        </div>
      )}

      <div className="max-w-lg mx-auto px-4 py-8">

        {/* ── Step 0: 인트로 + 로그인 ── */}
        {step === 0 && (
          <div className="text-center pt-12">
            <div className="text-5xl mb-6">📊</div>
            <h1 className="text-2xl font-bold text-gray-900">무료 점수 진단</h1>
            <p className="mt-3 text-sm text-gray-500 leading-relaxed">
              현재 점수와 약점을 입력하면<br />
              시험일까지의 맞춤 전략을 제안해드립니다.
            </p>
            <p className="mt-2 text-xs text-gray-400">약 1분 소요</p>

            {user ? (
              <div className="mt-10">
                <p className="text-sm text-gray-600 mb-4">{user.email}로 로그인됨</p>
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="w-full rounded-xl bg-primary-600 py-4 text-lg font-bold text-white hover:bg-primary-700"
                >
                  진단 시작하기 →
                </button>
              </div>
            ) : (
              <div className="mt-10">
                {authError && <p className="text-sm text-red-600 mb-3">{authError}</p>}
                <button
                  type="button"
                  onClick={handleGoogleLogin}
                  className="w-full rounded-xl bg-primary-600 py-4 text-lg font-bold text-white hover:bg-primary-700"
                >
                  구글로 로그인하고 시작하기
                </button>
                <p className="mt-3 text-xs text-gray-400">진단 결과를 저장하려면 로그인이 필요해요</p>
              </div>
            )}

            <button
              type="button"
              onClick={() => navigate('/landing')}
              className="mt-6 text-sm text-gray-400 underline"
            >
              ← 랜딩으로 돌아가기
            </button>
          </div>
        )}

        {/* ── Step 1: 최근 점수 ── */}
        {step === 1 && (
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">최근 토익 점수를 알려주세요</h2>
            <p className="text-sm text-gray-500 mb-8">가장 최근 성적을 기준으로 입력해 주세요.</p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  총점 <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  min={200}
                  max={990}
                  value={currentScore}
                  onChange={(e) => setCurrentScore(e.target.value)}
                  placeholder="예: 650"
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 text-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  autoFocus
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    LC 점수 <span className="text-gray-400">(선택)</span>
                  </label>
                  <input
                    type="number"
                    min={5}
                    max={495}
                    value={lcScore}
                    onChange={(e) => setLcScore(e.target.value)}
                    placeholder="예: 320"
                    className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    RC 점수 <span className="text-gray-400">(선택)</span>
                  </label>
                  <input
                    type="number"
                    min={5}
                    max={495}
                    value={rcScore}
                    onChange={(e) => setRcScore(e.target.value)}
                    placeholder="예: 330"
                    className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>
              </div>
              <p className="text-xs text-gray-400">LC·RC를 입력하면 파트별 전략이 더 구체적으로 나와요</p>
            </div>

            <button
              type="button"
              onClick={handleNext}
              disabled={!canNext()}
              className="mt-8 w-full rounded-xl bg-primary-600 py-4 text-lg font-bold text-white disabled:opacity-40 hover:bg-primary-700"
            >
              다음
            </button>
          </div>
        )}

        {/* ── Step 2: 목표 점수 + 시험일 ── */}
        {step === 2 && (
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">목표 점수와 시험일을 알려주세요</h2>
            <p className="text-sm text-gray-500 mb-8">시험일에 맞춰 압축 전략이 달라집니다.</p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  목표 점수 <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  min={200}
                  max={990}
                  value={targetScore}
                  onChange={(e) => setTargetScore(e.target.value)}
                  placeholder="예: 900"
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 text-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  시험 예정일 <span className="text-gray-400">(선택)</span>
                </label>
                <input
                  type="date"
                  value={examDate}
                  min={new Date().toISOString().split('T')[0]}
                  onChange={(e) => setExamDate(e.target.value)}
                  className="w-full max-w-full box-border border border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent appearance-none"
                />
                <p className="mt-1 text-xs text-gray-400">나중에 설정에서 변경할 수 있어요</p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleNext}
              disabled={!canNext()}
              className="mt-8 w-full rounded-xl bg-primary-600 py-4 text-lg font-bold text-white disabled:opacity-40 hover:bg-primary-700"
            >
              다음
            </button>
          </div>
        )}

        {/* ── Step 3: 약점 자가 진단 ── */}
        {step === 3 && (
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">어떤 부분이 약하다고 느끼시나요?</h2>
            <p className="text-sm text-gray-500 mb-6">해당되는 항목을 모두 선택해 주세요.</p>

            <div className="space-y-2">
              {WEAKNESS_OPTIONS.map((w) => {
                const selected = selectedWeaknesses.includes(w.id)
                return (
                  <button
                    key={w.id}
                    type="button"
                    onClick={() => toggleWeakness(w.id)}
                    className={`w-full text-left rounded-xl border-2 px-4 py-3 text-sm transition ${
                      selected
                        ? 'border-primary-500 bg-primary-50 text-primary-700 font-medium'
                        : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <span className="mr-2">{selected ? '✓' : '○'}</span>
                    {w.label}
                  </button>
                )
              })}
            </div>

            <p className="mt-3 text-xs text-gray-400">{selectedWeaknesses.length}개 선택됨</p>

            <button
              type="button"
              onClick={handleNext}
              disabled={!canNext()}
              className="mt-6 w-full rounded-xl bg-primary-600 py-4 text-lg font-bold text-white disabled:opacity-40 hover:bg-primary-700"
            >
              다음
            </button>
          </div>
        )}

        {/* ── Step 4: 공부 패턴 ── */}
        {step === 4 && (
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">현재 공부 패턴은 어떤가요?</h2>
            <p className="text-sm text-gray-500 mb-6">전략 강도를 조절하는 데 참고합니다.</p>

            <div className="space-y-3">
              {STUDY_PATTERNS.map((p) => {
                const selected = studyPattern === p.id
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setStudyPattern(p.id)}
                    className={`w-full text-left rounded-xl border-2 px-4 py-4 transition ${
                      selected
                        ? 'border-primary-500 bg-primary-50'
                        : 'border-gray-200 bg-white hover:border-gray-300'
                    }`}
                  >
                    <span className="text-xl mr-3">{p.icon}</span>
                    <span className={`text-sm ${selected ? 'text-primary-700 font-medium' : 'text-gray-700'}`}>
                      {p.label}
                    </span>
                  </button>
                )
              })}
            </div>

            <button
              type="button"
              onClick={handleNext}
              disabled={!canNext() || saving}
              className="mt-8 w-full rounded-xl bg-amber-400 py-4 text-lg font-bold text-gray-900 disabled:opacity-40 hover:bg-amber-300"
            >
              {saving ? '분석 중…' : '진단 결과 보기 →'}
            </button>
          </div>
        )}

        {/* ── Step 5: 결과 ── */}
        {step === 5 && (
          <div>
            <div className="text-center mb-8">
              <div className="text-4xl mb-3">✅</div>
              <h2 className="text-xl font-bold text-gray-900">진단이 완료되었습니다</h2>
              <p className="mt-1 text-sm text-gray-500">입력 기반 전략 요약</p>
            </div>

            {/* 점수 요약 */}
            <div className="rounded-xl border border-gray-200 bg-white p-5 mb-4 shadow-sm">
              <div className="flex justify-between items-end mb-4">
                <div>
                  <p className="text-xs text-gray-500">현재 점수</p>
                  <p className="text-3xl font-bold text-gray-900">{currentScore}점</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-500">목표까지</p>
                  <p className={`text-2xl font-bold ${scoreGap > 0 ? 'text-green-600' : 'text-gray-400'}`}>
                    {scoreGap > 0 ? `+${scoreGap}점` : '달성!'}
                  </p>
                </div>
              </div>

              {/* D-day 전략 모드 */}
              <div className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-semibold ${strategyMode.color}`}>
                <span>{strategyMode.badge}</span>
                <span>·</span>
                <span>{strategyMode.label}</span>
              </div>
              {strategyMode.desc && (
                <p className="mt-2 text-xs text-gray-500">{strategyMode.desc}</p>
              )}
            </div>

            {/* 약점 Top 3 */}
            <div className="rounded-xl border border-gray-200 bg-white p-5 mb-4 shadow-sm">
              <h3 className="text-sm font-semibold text-gray-800 mb-3">⚠️ 자가 진단 약점</h3>
              <div className="space-y-2">
                {weaknessLabels.slice(0, 5).map((w, i) => (
                  <div key={w.id} className="flex items-center gap-2">
                    <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold text-white ${
                      i === 0 ? 'bg-red-500' : i === 1 ? 'bg-orange-500' : 'bg-yellow-500'
                    }`}>
                      {i + 1}
                    </span>
                    <span className="text-sm text-gray-700">{w.label}</span>
                  </div>
                ))}
              </div>

              {/* 우선 교정 순서 */}
              {weaknessLabels.length >= 2 && (
                <div className="mt-4 pt-3 border-t border-gray-100">
                  <p className="text-xs text-gray-600">
                    <span className="font-semibold text-gray-700">우선 교정 순서: </span>
                    {weaknessLabels.slice(0, 3).map((w) => w.label.split(' ').slice(0, 2).join(' ')).join(' → ')}
                  </p>
                </div>
              )}

              {/* 규칙 기반 상승 메시지 */}
              <div className="mt-3 rounded-lg bg-green-50 px-3 py-2">
                <p className="text-xs text-green-700 font-medium">
                  💡 {getImprovementMsg(selectedWeaknesses.length)}
                </p>
              </div>
            </div>

            {/* 다음 단계 안내 */}
            <div className="rounded-xl border-2 border-primary-200 bg-primary-50 p-5 mb-4">
              <h3 className="text-sm font-semibold text-primary-800 mb-2">다음 단계</h3>
              <p className="text-sm text-primary-700 leading-relaxed">
                오답 문제를 등록하면 AI가 실제 약점 태그를 분석해<br />
                진단 정확도가 크게 높아집니다.
              </p>
            </div>

            {/* CTA */}
            <button
              type="button"
              onClick={() => navigate('/')}
              className="w-full rounded-xl bg-primary-600 py-4 text-lg font-bold text-white hover:bg-primary-700"
            >
              오답 등록하러 가기 →
            </button>
            <button
              type="button"
              onClick={() => navigate('/settings')}
              className="mt-3 w-full rounded-xl border border-gray-300 py-3 text-sm font-medium text-gray-600 hover:bg-gray-50"
            >
              설정에서 플랜 선택하기
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default DiagnosticPage
