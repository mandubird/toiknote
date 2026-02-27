import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useListVersion } from '../contexts/RefreshListContext'
import { fetchWrongAnswers } from '../services/fetchWrongAnswers'
import { getDashboardSummary } from '../services/programService'

const PARTS = ['Part 1', 'Part 2', 'Part 3', 'Part 4', 'Part 5', 'Part 6', 'Part 7']

const HomePage = () => {
  const { user } = useAuth()
  const navigate = useNavigate()
  const listVersion = useListVersion()
  const [questions, setQuestions] = useState([])
  const [loading, setLoading] = useState(true)
  const [dashboard, setDashboard] = useState(null)
  const [selectedPart, setSelectedPart] = useState(null)
  const [selectedTag, setSelectedTag] = useState(null)

  useEffect(() => {
    if (!user) {
      setQuestions([])
      setDashboard(null)
      setLoading(false)
      return
    }
    setLoading(true)
    Promise.all([
      fetchWrongAnswers(user.id),
      getDashboardSummary(user.id),
    ])
      .then(([q, d]) => {
        setQuestions(q || [])
        setDashboard(d)
      })
      .catch((err) => {
        console.error('조회 실패:', err)
        setQuestions([])
        setDashboard(null)
      })
      .finally(() => setLoading(false))
  }, [user, listVersion])

  // 태그별 등장 횟수 (자주 틀리는 순)
  const tagCounts = questions.reduce((acc, q) => {
    ;(q.tags || []).forEach((tag) => {
      acc[tag] = (acc[tag] || 0) + 1
    })
    return acc
  }, {})
  const sortedTags = Object.entries(tagCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([tag]) => tag)

  const filtered = questions.filter((q) => {
    if (selectedPart && q.part !== selectedPart) return false
    if (selectedTag && !(q.tags || []).includes(selectedTag)) return false
    return true
  })

  const formatDate = (date) => {
    if (!(date instanceof Date)) return ''
    const y = date.getFullYear()
    const m = String(date.getMonth() + 1).padStart(2, '0')
    const d = String(date.getDate()).padStart(2, '0')
    return `${y}.${m}.${d}`
  }

  const showDashboard = user && dashboard && dashboard.current_week >= 1

  return (
    <div className="p-4">
      {showDashboard && (
        <div className="mb-6">
          <h2 className="text-lg font-bold text-gray-800 mb-3">코칭 대시보드</h2>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
              <p className="text-xs text-gray-500 mb-1">현재 주차</p>
              <p className="text-xl font-bold text-primary-600">{dashboard.current_week || 0}주차</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
              <p className="text-xs text-gray-500 mb-1">예상 점수</p>
              <p className="text-xl font-bold text-primary-600">{dashboard.predicted_score ?? '-'}점</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
              <p className="text-xs text-gray-500 mb-1">목표 점수</p>
              <p className="text-xl font-bold text-gray-800">{dashboard.target_score ?? '-'}점</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm col-span-2">
              <p className="text-xs text-gray-500 mb-1">이번 주 미션</p>
              <p className="text-sm font-medium text-gray-800">{dashboard.weekly_mission ?? '-'}</p>
            </div>
          </div>
          {(dashboard.accuracy_change != null || dashboard.part7_time_change != null) && (
            <div className="flex gap-3 text-sm text-gray-600">
              {dashboard.accuracy_change != null && (
                <span>정확도 변화: {dashboard.accuracy_change >= 0 ? '+' : ''}{dashboard.accuracy_change}%</span>
              )}
              {dashboard.part7_time_change != null && (
                <span>Part7 시간: {dashboard.part7_time_change >= 0 ? '+' : ''}{dashboard.part7_time_change}초</span>
              )}
            </div>
          )}
          <button
            type="button"
            onClick={() => navigate('/program')}
            className="mt-3 text-sm text-primary-600 font-medium"
          >
            8주 프로그램 상세 →
          </button>
        </div>
      )}

      <div className="mb-4">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">내 오답노트</h2>
        <p className="text-sm text-gray-600">
          {loading
            ? '불러오는 중…'
            : questions.length > 0
            ? `총 ${questions.length}개의 오답을 정리했어요`
            : '카메라 버튼을 눌러 첫 오답을 등록해보세요!'}
        </p>
      </div>

      {questions.length > 0 && (
        <div className="mb-4 space-y-3">
          <p className="text-xs font-medium text-gray-500">파트</p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setSelectedPart(null)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium ${
                selectedPart === null
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              전체
            </button>
            {PARTS.map((part) => (
              <button
                key={part}
                type="button"
                onClick={() => setSelectedPart(part)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium ${
                  selectedPart === part
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {part}
              </button>
            ))}
          </div>

          {sortedTags.length > 0 && (
            <>
              <p className="text-xs font-medium text-gray-500 mt-3">자주 틀리는 태그</p>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedTag(null)}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium ${
                    selectedTag === null
                      ? 'bg-primary-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  전체
                </button>
                {sortedTags.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => setSelectedTag(tag)}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium ${
                      selectedTag === tag
                        ? 'bg-amber-500 text-white'
                        : 'bg-amber-50 text-amber-800 hover:bg-amber-100'
                    }`}
                  >
                    #{tag} {tagCounts[tag] > 1 ? `(${tagCounts[tag]})` : ''}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {loading ? (
        <div className="py-12 text-center text-gray-500 text-sm">목록을 불러오는 중…</div>
      ) : filtered.length === 0 ? (
        <EmptyState hasAny={questions.length > 0} />
      ) : (
        <div className="space-y-3">
          {filtered.map((q) => (
            <QuestionCard key={q.id} question={{ ...q, date: formatDate(q.createdAt) }} />
          ))}
        </div>
      )}
    </div>
  )
}

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

const QuestionCard = ({ question }) => (
  <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
    <div className="flex items-start justify-between mb-2">
      <span className="inline-block px-2 py-1 text-xs font-semibold text-primary-700 bg-primary-100 rounded">
        {question.part}
      </span>
      <span className="text-xs text-gray-500">{question.date}</span>
    </div>
    <p className="text-sm text-gray-800 mb-2 line-clamp-2">{question.question}</p>
    <div className="flex flex-wrap gap-1">
      {question.tags?.map((tag, idx) => (
        <span key={idx} className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded">
          #{tag}
        </span>
      ))}
    </div>
  </div>
)

export default HomePage
