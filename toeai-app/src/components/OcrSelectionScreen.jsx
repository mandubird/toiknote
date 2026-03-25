import { useEffect, useMemo, useState } from 'react'

function truncateFront(s, max = 50) {
  const t = String(s || '').trim()
  if (!t) return ''
  return t.length > max ? t.slice(0, max) + '…' : t
}

function getQuestionNumberLabel(q, idx) {
  const n = q?.question_number ?? q?.questionNumber
  if (n == null || String(n).trim() === '') return `문제 ${idx + 1}`
  return `${n}. ${truncateFront(q?.question || q?.questionText || '', 50)}`
}

function getPartNumber(part) {
  const str = String(part || '')
  const m = str.match(/part\s*([1-7])/i)
  if (!m) return null
  const num = parseInt(m[1], 10)
  return num >= 1 && num <= 7 ? num : null
}

function getPart56Subtitle(q) {
  const partNum = getPartNumber(q?.part)
  if (!(partNum === 5 || partNum === 6)) return null
  const opts = q?.options && typeof q.options === 'object' ? q.options : {}
  for (const k of ['A', 'B', 'C', 'D']) {
    const v = opts?.[k]
    if (v != null && String(v).trim()) return truncateFront(v, 80)
  }
  return null
}

function getQuestionTextSubtitle(q) {
  const t = q?.question
  if (t == null || String(t).trim() === '') return '(텍스트 없음)'
  return null
}

const OcrSelectionScreen = ({ open, questions, onConfirm, onClose }) => {
  const [checkedIndices, setCheckedIndices] = useState(new Set())

  useEffect(() => {
    if (!open) {
      setCheckedIndices(new Set())
    }
  }, [open])

  const count = questions?.length || 0
  const selectedCount = checkedIndices.size

  const toggleIndex = (idx) => {
    setCheckedIndices((prev) => {
      const next = new Set(prev)
      if (next.has(idx)) next.delete(idx)
      else next.add(idx)
      return next
    })
  }

  const setAll = () => {
    setCheckedIndices(new Set((questions || []).map((_, i) => i)))
  }

  const clearAll = () => {
    setCheckedIndices(new Set())
  }

  const selectedQuestions = useMemo(() => {
    const indices = [...checkedIndices].sort((a, b) => a - b)
    return indices.map((i) => questions[i]).filter(Boolean)
  }, [checkedIndices, questions])

  const groupedPassage = (idx) => {
    const q = questions[idx]
    const partNum = getPartNumber(q?.part)
    if (!(partNum === 7 || q?.passage_group_id)) return { showBadge: false, groupKey: null }
    const groupKey = q?.passage_group_id || String(idx)
    const prev = questions[idx - 1]
    const prevKey = prev?.passage_group_id || null
    const showBadge = idx === 0 ? true : groupKey && prevKey !== q?.passage_group_id
    return { showBadge, groupKey }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[100] bg-white overflow-y-auto">
      <div className="max-w-lg mx-auto px-4 py-4 pb-28">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-gray-900">문제를 분석했습니다</h2>
            <p className="text-xs text-gray-500 mt-1">
              틀린 문제만 선택해주세요. 맞은 문제는 선택하지 않아도 됩니다.
            </p>
            {count > 0 && (
              <div className="mt-3 text-xs text-gray-600 bg-surface-50 border border-surface-200 rounded-lg px-3 py-2">
                총 {count}문제 인식 · 선택한 오답 {selectedCount}개
              </div>
            )}
          </div>

          <div className="flex items-start gap-2">
            {count > 0 && (
              <div className="flex flex-col items-end gap-2">
                <div className="flex gap-2">
                  <button
                    type="button"
                    className="text-[11px] px-3 py-1 rounded-full border border-gray-200 text-gray-700 bg-white hover:bg-gray-50"
                    onClick={setAll}
                  >
                    전체 선택
                  </button>
                  <button
                    type="button"
                    className="text-[11px] px-3 py-1 rounded-full border border-gray-200 text-gray-700 bg-white hover:bg-gray-50"
                    onClick={clearAll}
                  >
                    전체 해제
                  </button>
                </div>
              </div>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-2 text-gray-500 hover:text-gray-700 rounded-full hover:bg-gray-100"
              aria-label="닫기"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="mt-4 space-y-3">
          {(questions || []).map((q, idx) => {
            const checked = checkedIndices.has(idx)
            const partStr = q?.part || ''
            const subtitle56 = getPart56Subtitle(q)
            const subtitleText = getQuestionTextSubtitle(q)

            const passage = groupedPassage(idx)

            return (
              <div key={q?.question_number ?? idx}>
                {passage.showBadge && q?.passage_group_id && (
                  <div className="mt-4 flex items-center gap-2 border-t border-gray-200 pt-3">
                    <span className="text-[11px] font-semibold text-primary-700 bg-primary-50 border border-primary-100 px-2 py-0.5 rounded-full">
                      지문 공유
                    </span>
                  </div>
                )}

                <label
                  className={`flex items-start gap-3 rounded-xl border px-3 py-3 cursor-pointer transition-colors ${
                    checked ? 'bg-primary-50 border-primary-200' : 'bg-white border-gray-200'
                  }`}
                >
                  <input
                    type="checkbox"
                    className="mt-1 rounded border-gray-300 text-primary-600"
                    checked={checked}
                    onChange={() => toggleIndex(idx)}
                  />

                  <div className="flex-1">
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-gray-900">
                          {q?.question_number == null || String(q?.question_number).trim() === '' ? (
                            `문제 ${idx + 1}`
                          ) : (
                            getQuestionNumberLabel(q, idx)
                          )}
                        </p>
                      </div>
                      {partStr && (
                        <span className="text-[10px] px-2 py-1 rounded-full bg-surface-100 text-surface-700 border border-surface-200 shrink-0">
                          {partStr}
                        </span>
                      )}
                    </div>

                    {(subtitle56 || subtitleText) && (
                      <p className="text-xs text-gray-600 mt-1">
                        {subtitle56 || subtitleText}
                      </p>
                    )}
                  </div>
                </label>
              </div>
            )
          })}
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 safe-area-bottom p-4">
        <button
          type="button"
          disabled={selectedCount < 1}
          onClick={() => {
            if (selectedCount < 1) return
            onConfirm?.(selectedQuestions)
          }}
          className={`w-full py-3 rounded-xl text-sm font-semibold transition-colors ${
            selectedCount < 1
              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
              : 'bg-primary-600 text-white hover:bg-primary-700'
          }`}
        >
          선택한 문제만 입력하기
        </button>
        {selectedCount < 1 && (
          <p className="text-center text-[11px] text-gray-500 mt-2">틀린 문제를 1개 이상 선택해주세요</p>
        )}
      </div>
    </div>
  )
}

export default OcrSelectionScreen

