import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useListVersion } from '../contexts/RefreshListContext'
import { fetchWrongAnswers } from '../services/fetchWrongAnswers'
import { getDashboardSummary } from '../services/programService'

// ─── 오늘 날짜 체크 ─────────────────────────────────────────────
const isToday = (date) => {
  if (!(date instanceof Date)) return false
  const now = new Date()
  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth()    === now.getMonth()    &&
    date.getDate()     === now.getDate()
  )
}

const formatDate = (date) => {
  if (!(date instanceof Date)) return ''
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}.${m}.${d}`
}

// ─── 약점 기반 코치 한 줄 ───────────────────────────────────────
const buildCoachLine = (top3) => {
  if (!top3?.length) return null
  const t = top3[0]
  const tag = t.tag || t.category || '약점 영역'
  if (t.hasTimePressure) return `${tag} 시간 단축이 지금 가장 큰 점수 레버리지예요.`
  return `${tag}를 먼저 줄이는 게 지금 점수 효율이 가장 높아요.`
}

// ─────────────────────────────────────────────────────────────────
const HomePage = () => {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const listVersion = useListVersion()
  const [questions, setQuestions]   = useState([])
  const [dashboard, setDashboard]   = useState(null)
  const [loading, setLoading]       = useState(true)
  const [showAll, setShowAll]       = useState(false)
  // 전체 목록용 필터
  const [selectedPart, setSelectedPart]   = useState(null)
  const [selectedTag, setSelectedTag]     = useState(null)
  const [clearFilter, setClearFilter]     = useState('all')
  const [showAllTags, setShowAllTags]     = useState(false)

  // 파트 지도 클릭 시 (?part=N) 자동 필터
  useEffect(() => {
    const partParam = searchParams.get('part')
    if (partParam) {
      const n = parseInt(partParam, 10)
      if (n >= 1 && n <= 7) {
        setSelectedPart(`Part ${n}`)
        setShowAll(true)
      }
    }
  }, [searchParams])

  useEffect(() => {
    if (!user) {
      setQuestions([])
      setDashboard(null)
      setLoading(false)
      return
    }
    setLoading(true)
    Promise.all([fetchWrongAnswers(user.id), getDashboardSummary(user.id)])
      .then(([q, d]) => {
        setQuestions(q || [])
        setDashboard(d)
      })
      .catch(() => { setQuestions([]); setDashboard(null) })
      .finally(() => setLoading(false))
  }, [user, listVersion])

  // ── 파생 데이터 ────────────────────────────────────────────────
  const todayCount   = questions.filter((q) => isToday(q.createdAt)).length
  const pendingCount = questions.filter((q) => !q.clearedAt).length
  const clearedCount = questions.length - pendingCount

  const partCounts = questions.reduce((acc, q) => {
    if (q.part) acc[q.part] = (acc[q.part] || 0) + 1
    return acc
  }, {})
  const topPart = Object.entries(partCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null

  const tagCounts = questions.reduce((acc, q) => {
    ;(q.tags || []).forEach((tag) => { acc[tag] = (acc[tag] || 0) + 1 })
    return acc
  }, {})
  const sortedTags = Object.entries(tagCounts).sort((a, b) => b[1] - a[1]).map(([tag]) => tag)

  const PARTS = ['Part 1','Part 2','Part 3','Part 4','Part 5','Part 6','Part 7']

  const mission = dashboard?.weekly_mission
    || (dashboard?.weakness_top3?.[0]
        ? `지금 가장 약한 영역: ${dashboard.weakness_top3[0].tag || dashboard.weakness_top3[0].category}`
        : null)

  const coachLine = buildCoachLine(dashboard?.weakness_top3)

  // 최근 3개
  const recentThree = [...questions].sort((a, b) => b.createdAt - a.createdAt).slice(0, 3)

  // 전체 목록 필터
  const filtered = questions.filter((q) => {
    if (selectedPart && q.part !== selectedPart) return false
    if (selectedTag && !(q.tags || []).includes(selectedTag)) return false
    if (clearFilter === 'cleared' && !q.clearedAt) return false
    if (clearFilter === 'pending' && q.clearedAt) return false
    return true
  })

  // ── 렌더 ───────────────────────────────────────────────────────
  return (
    <div className="p-4 pb-8">

      {/* ── 섹션1: 오늘의 요약 ── */}
      {!loading && (
        <div className="mb-5">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">오늘의 요약</p>
          <div className="grid grid-cols-3 gap-2">
            <SummaryCard
              label="오늘 등록"
              value={todayCount}
              unit="개"
              accent={todayCount > 0}
            />
            <SummaryCard
              label="미완료"
              value={pendingCount}
              unit="개"
              accent={pendingCount > 0}
              accentColor="amber"
            />
            <SummaryCard
              label="가장 취약"
              value={topPart ? topPart.replace('Part ', 'P') : '—'}
              unit=""
              accent={!!topPart}
              accentColor="red"
            />
          </div>
        </div>
      )}

      {/* ── 섹션2: 오늘 추천 미션 ── */}
      {!loading && (
        <div className="bg-primary-50 border border-primary-100 rounded-xl p-3.5 mb-4">
          <p className="text-xs font-semibold text-primary-500 mb-1">오늘 추천 미션</p>
          <p className="text-sm font-medium text-primary-900 leading-relaxed">
            {mission || '카메라 버튼을 눌러 첫 오답을 등록해보세요 📸'}
          </p>
        </div>
      )}

      {/* ── 섹션3: AI 코치 한 줄 ── */}
      {!loading && coachLine && (
        <div className="flex items-start gap-2 bg-white border border-gray-200 rounded-xl p-3.5 mb-4 shadow-sm">
          <span className="text-lg leading-none mt-0.5">💬</span>
          <p className="text-sm text-gray-700 leading-relaxed">{coachLine}</p>
        </div>
      )}

      {/* ── 섹션4: 최근 오답 3개 ── */}
      <div className="mb-2">
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-semibold text-gray-700">
            {loading ? '불러오는 중…' : `내 오답노트 · 총 ${questions.length}개`}
          </p>
          {questions.length > 3 && !showAll && (
            <button
              type="button"
              onClick={() => setShowAll(true)}
              className="text-xs text-primary-600 font-medium"
            >
              전체 보기 →
            </button>
          )}
          {showAll && (
            <button
              type="button"
              onClick={() => setShowAll(false)}
              className="text-xs text-gray-500 font-medium"
            >
              접기
            </button>
          )}
        </div>

        {loading ? (
          <div className="py-12 text-center text-gray-500 text-sm">목록을 불러오는 중…</div>
        ) : questions.length === 0 ? (
          <EmptyState hasAny={false} />
        ) : !showAll ? (
          // 최근 3개만
          <div className="space-y-3">
            {recentThree.map((q) => (
              <QuestionCard
                key={q.id}
                question={{ ...q, date: formatDate(q.createdAt) }}
                onClick={() => navigate(`/note/${q.id}`, { state: { question: q } })}
              />
            ))}
            {questions.length > 3 && (
              <button
                type="button"
                onClick={() => setShowAll(true)}
                className="w-full py-2.5 rounded-lg border border-gray-200 bg-white text-sm text-gray-600 hover:bg-gray-50"
              >
                전체 오답 {questions.length}개 보기 →
              </button>
            )}
          </div>
        ) : (
          // 전체 목록 + 필터
          <>
            <div className="mb-4 space-y-3">
              {/* 클리어 필터 */}
              <div className="flex gap-2">
                {[
                  { key: 'all',     label: `전체 (${questions.length})` },
                  { key: 'pending', label: `미완료 (${pendingCount})` },
                  { key: 'cleared', label: `클리어 (${clearedCount})` },
                ].map(({ key, label }) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setClearFilter(key)}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                      clearFilter === key
                        ? key === 'cleared' ? 'bg-green-600 text-white' : 'bg-primary-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {/* 파트 필터 */}
              <p className="text-xs font-medium text-gray-500">파트</p>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedPart(null)}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium ${
                    selectedPart === null ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >전체</button>
                {PARTS.map((part) => (
                  <button
                    key={part}
                    type="button"
                    onClick={() => setSelectedPart(part)}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium ${
                      selectedPart === part ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {part}{partCounts[part] ? ` (${partCounts[part]})` : ''}
                  </button>
                ))}
              </div>

              {/* 태그 필터 */}
              {sortedTags.length > 0 && (
                <>
                  <p className="text-xs font-medium text-gray-500 mt-1">자주 틀리는 태그</p>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setSelectedTag(null)}
                      className={`px-3 py-1.5 rounded-full text-sm font-medium ${
                        selectedTag === null ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >전체</button>
                    {(showAllTags ? sortedTags : sortedTags.slice(0, 5)).map((tag) => (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => setSelectedTag(tag)}
                        className={`px-3 py-1.5 rounded-full text-sm font-medium ${
                          selectedTag === tag ? 'bg-amber-500 text-white' : 'bg-amber-50 text-amber-800 hover:bg-amber-100'
                        }`}
                      >
                        #{tag}{tagCounts[tag] > 1 ? ` (${tagCounts[tag]})` : ''}
                      </button>
                    ))}
                    {sortedTags.length > 5 && (
                      <button
                        type="button"
                        onClick={() => setShowAllTags((v) => !v)}
                        className="px-2 py-1 rounded-full text-xs font-medium bg-white border border-amber-200 text-amber-700 hover:bg-amber-50"
                      >
                        {showAllTags ? '접기' : `더보기 (+${sortedTags.length - 5})`}
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>

            {filtered.length === 0 ? (
              <EmptyState hasAny={questions.length > 0} />
            ) : (
              <div className="space-y-3">
                {filtered.map((q) => (
                  <QuestionCard
                    key={q.id}
                    question={{ ...q, date: formatDate(q.createdAt) }}
                    onClick={() => navigate(`/note/${q.id}`, { state: { question: q } })}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

// ─── 오늘 요약 카드 ────────────────────────────────────────────
const accentMap = {
  blue:  { bg: 'bg-primary-50',  text: 'text-primary-600',  label: 'text-primary-500' },
  amber: { bg: 'bg-amber-50',    text: 'text-amber-600',    label: 'text-amber-500'   },
  red:   { bg: 'bg-red-50',      text: 'text-red-600',      label: 'text-red-400'     },
}

const SummaryCard = ({ label, value, unit, accent, accentColor = 'blue' }) => {
  const c = accent ? accentMap[accentColor] : { bg: 'bg-white', text: 'text-gray-700', label: 'text-gray-400' }
  return (
    <div className={`${c.bg} border border-gray-100 rounded-xl p-3 text-center shadow-sm`}>
      <p className={`text-xs font-medium ${c.label} mb-1`}>{label}</p>
      <p className={`text-xl font-bold ${c.text} leading-none`}>
        {value}<span className="text-sm font-medium ml-0.5">{unit}</span>
      </p>
    </div>
  )
}

// ─── EmptyState ───────────────────────────────────────────────
const EmptyState = ({ hasAny }) => (
  <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
    <div className="bg-primary-100 rounded-full p-6 mb-4">
      <svg className="w-16 h-16 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    </div>
    <h3 className="text-lg font-semibold text-gray-900 mb-2">
      {hasAny ? '선택한 조건에 맞는 오답이 없어요' : '아직 오답이 없어요'}
    </h3>
    <p className="text-sm text-gray-600 mb-1">
      {hasAny ? '다른 파트나 태그를 선택해 보세요.' : '하단의 카메라 버튼을 눌러'}
    </p>
    {!hasAny && <p className="text-sm text-gray-600">틀린 문제를 사진으로 찍어보세요!</p>}
  </div>
)

// ─── QuestionCard ─────────────────────────────────────────────
const QuestionCard = ({ question, onClick }) => (
  <div
    className={`relative bg-white rounded-lg shadow-sm border p-4 cursor-pointer hover:bg-gray-50 active:scale-[0.99] transition ${
      question.clearedAt ? 'border-green-200' : 'border-gray-200'
    }`}
    onClick={onClick}
    role="button"
    tabIndex={0}
    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick?.() } }}
  >
    {question.clearedAt && (
      <div className="absolute top-3 right-3 flex items-center gap-1 bg-green-100 text-green-700 text-xs font-bold px-2 py-0.5 rounded-full border border-green-300">
        ✓ CLEAR
      </div>
    )}
    <div className="flex items-start justify-between mb-2">
      <span className="inline-block px-2 py-1 text-xs font-semibold text-primary-700 bg-primary-100 rounded">
        {question.part}
      </span>
      <span className="text-xs text-gray-500 mr-16">{question.date}</span>
    </div>
    <p className={`text-sm mb-2 line-clamp-2 ${question.clearedAt ? 'text-gray-400' : 'text-gray-800'}`}>
      {question.question}
    </p>
    <div className="flex flex-wrap gap-1">
      {question.tags?.map((tag, idx) => (
        <span key={idx} className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded">#{tag}</span>
      ))}
    </div>
  </div>
)

export default HomePage
