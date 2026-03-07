import { useEffect, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { toggleClearWrongAnswer } from '../services/clearWrongAnswer'

const formatDate = (date) => {
  if (!(date instanceof Date)) return ''
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}.${m}.${d}`
}

function mapRowToQuestion(row) {
  if (!row) return null
  const partNumber = row.part_number >= 1 && row.part_number <= 7 ? row.part_number : 5
  const lcOrRc = row.lc_or_rc === 'LC' ? 'LC' : row.lc_or_rc === 'RC' ? 'RC' : partNumber <= 4 ? 'LC' : 'RC'
  const allTags = Array.isArray(row.tags) ? row.tags : typeof row.tags === 'object' && row.tags !== null ? [] : []
  const keyVocabulary = allTags.filter((t) => t.startsWith('어휘:'))
  const tags = allTags.filter((t) => !t.startsWith('어휘:'))
  return {
    id: row.id,
    part: row.part || `Part ${partNumber}`,
    partNumber,
    lcOrRc,
    question: row.question || '',
    answer: row.answer || '',
    explanation: row.explanation || '',
    tags,
    keyVocabulary,
    imageUrl: row.image_url || row.source_image_url || '',
    difficulty: [1, 2, 3].includes(Number(row.difficulty)) ? Number(row.difficulty) : 2,
    createdAt: row.created_at ? new Date(row.created_at) : new Date(),
    clearedAt: row.cleared_at ? new Date(row.cleared_at) : null,
  }
}

const WrongNoteDetailPage = () => {
  const { id } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const initialQuestion = location.state?.question
  const [question, setQuestion] = useState(initialQuestion || null)
  const [loading, setLoading] = useState(!initialQuestion)
  const [error, setError] = useState('')
  const [clearing, setClearing] = useState(false)

  useEffect(() => {
    if (question || !id || !user) return

    let isMounted = true
    setLoading(true)
    setError('')

    supabase
      .from('wrong_answers')
      .select('*')
      .eq('id', id)
      .maybeSingle()
      .then(({ data, error: err }) => {
        if (!isMounted) return
        if (err || !data) {
          console.error('오답 상세 조회 실패:', err)
          setError('오답을 찾지 못했어요.')
          setQuestion(null)
        } else {
          setQuestion(mapRowToQuestion(data))
        }
      })
      .finally(() => {
        if (!isMounted) return
        setLoading(false)
      })

    return () => {
      isMounted = false
    }
  }, [id, user, question])

  const handleBack = () => {
    navigate(-1)
  }

  const handleToggleClear = async () => {
    if (!question || clearing) return
    setClearing(true)
    try {
      const { clearedAt } = await toggleClearWrongAnswer(question.id, !question.clearedAt)
      setQuestion((prev) => ({ ...prev, clearedAt }))
    } catch {
      // silent fail
    } finally {
      setClearing(false)
    }
  }

  if (!user) {
    return (
      <div className="p-4">
        <p className="text-sm text-gray-600">로그인 후 오답 상세를 볼 수 있어요.</p>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="p-4 flex justify-center py-12">
        <div className="animate-spin w-8 h-8 border-2 border-primary-200 border-t-primary-600 rounded-full" />
      </div>
    )
  }

  if (error || !question) {
    return (
      <div className="p-4">
        <button
          type="button"
          onClick={handleBack}
          className="text-sm text-gray-600 mb-4 inline-flex items-center"
        >
          ← 뒤로
        </button>
        <p className="text-sm text-red-600">{error || '오답을 찾지 못했어요.'}</p>
      </div>
    )
  }

  return (
    <div className="p-4">
      <button
        type="button"
        onClick={handleBack}
        className="text-sm text-gray-600 mb-4 inline-flex items-center"
      >
        ← 뒤로
      </button>

      <div className="mb-4">
        <p className="text-xs text-gray-500 mb-1">{formatDate(question.createdAt)}</p>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="inline-block px-2 py-1 text-xs font-semibold text-primary-700 bg-primary-100 rounded">
              {question.part}
            </span>
            <span className="text-xs text-gray-500">{question.lcOrRc}</span>
            <span className="text-xs text-gray-500">
              난이도{' '}
              {question.difficulty === 1 ? '쉬움' : question.difficulty === 3 ? '어려움' : '보통'}
            </span>
          </div>
          {/* 클리어 버튼 */}
          <button
            type="button"
            onClick={handleToggleClear}
            disabled={clearing}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
              question.clearedAt
                ? 'bg-green-100 text-green-700 border border-green-300'
                : 'bg-gray-100 text-gray-600 border border-gray-300 hover:bg-green-50 hover:text-green-700 hover:border-green-300'
            } disabled:opacity-50`}
          >
            {question.clearedAt ? '✓ 클리어 완료' : '○ 클리어'}
          </button>
        </div>
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-bold text-gray-900">오답 상세</h1>
          {question.clearedAt && (
            <span className="text-xs text-green-600">{formatDate(question.clearedAt)} 클리어</span>
          )}
        </div>
      </div>

      {/* 클리어 스탬프 배너 */}
      {question.clearedAt && (
        <div className="mb-4 p-3 bg-green-50 rounded-xl border border-green-200 flex items-center gap-2">
          <span className="text-lg">🏆</span>
          <p className="text-sm font-medium text-green-700">이 문제를 마스터했어요! 다음 약점으로 넘어가세요.</p>
        </div>
      )}

      {question.imageUrl && (
        <div className="mb-4">
          <p className="text-xs text-gray-500 mb-1">문제 이미지</p>
          <img
            src={question.imageUrl}
            alt="문제 이미지"
            className="w-full rounded-lg border border-gray-200"
          />
        </div>
      )}

      <div className="mb-4">
        <p className="text-xs font-medium text-gray-500 mb-1">문제</p>
        <p className="text-sm text-gray-800 whitespace-pre-line">{question.question}</p>
      </div>

      {question.answer && (
        <div className="mb-4">
          <p className="text-xs font-medium text-gray-500 mb-1">정답 / 메모</p>
          <p className="text-sm text-gray-800 whitespace-pre-line">{question.answer}</p>
        </div>
      )}

      {question.explanation && (
        <div className="mb-4">
          <p className="text-xs font-medium text-gray-500 mb-1">해설</p>
          <p className="text-sm text-gray-800 whitespace-pre-line">{question.explanation}</p>
        </div>
      )}

      {question.keyVocabulary?.length > 0 && (
        <div className="mb-4 p-3 bg-amber-50 rounded-xl border border-amber-100">
          <p className="text-xs font-medium text-amber-700 mb-2">📖 핵심 단어/표현</p>
          <div className="flex flex-wrap gap-1.5">
            {question.keyVocabulary.map((v, idx) => (
              <span
                key={idx}
                className="text-xs px-2.5 py-1 bg-white text-amber-800 border border-amber-200 rounded-full font-medium"
              >
                {v.replace(/^어휘:/, '')}
              </span>
            ))}
          </div>
        </div>
      )}

      {question.tags?.length > 0 && (
        <div className="mb-4">
          <p className="text-xs font-medium text-gray-500 mb-1">태그</p>
          <div className="flex flex-wrap gap-1">
            {question.tags.map((tag, idx) => (
              <span
                key={idx}
                className="text-xs px-2 py-1 bg-amber-50 text-amber-800 rounded-full"
              >
                #{tag}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default WrongNoteDetailPage

