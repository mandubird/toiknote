import { useState, useEffect } from 'react'

const AnalysisConfirmModal = ({ open, onClose, initialData, imageUrl, onSave, saving }) => {
  const [step, setStep] = useState(1)
  const [part, setPart] = useState('')
  const [question, setQuestion] = useState('')
  const [answer, setAnswer] = useState('')
  const [explanation, setExplanation] = useState('')
  const [tags, setTags] = useState('')
  const [lcOrRc, setLcOrRc] = useState('RC')
  const [difficulty, setDifficulty] = useState(2)
  const [partNumber, setPartNumber] = useState(5)

  useEffect(() => {
    if (open && initialData) {
      setStep(1)
      setPart(initialData.part || '')
      setQuestion(initialData.question || '')
      setAnswer(initialData.answer || '')
      setExplanation(initialData.explanation || '')
      setTags(Array.isArray(initialData.tags) ? initialData.tags.join(', ') : '')
      setLcOrRc(initialData.lcOrRc === 'LC' ? 'LC' : 'RC')
      setDifficulty([1, 2, 3].includes(Number(initialData.difficulty)) ? Number(initialData.difficulty) : 2)
      setPartNumber(initialData.partNumber >= 1 && initialData.partNumber <= 7 ? initialData.partNumber : 5)
    }
  }, [open, initialData])

  if (!open) return null

  const tagsArray = tags
    .split(/[,，\s]+/)
    .map((t) => t.trim())
    .filter(Boolean)

  const handleSave = () => {
    onSave({
      imageUrl,
      part,
      partNumber,
      lcOrRc,
      question,
      answer,
      explanation,
      tags: tagsArray,
      difficulty,
    })
  }

  return (
    <div className="fixed inset-0 z-[110] flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4">
      <div className="bg-white w-full max-h-[90vh] rounded-t-2xl sm:rounded-2xl shadow-xl flex flex-col max-w-lg mx-auto overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="text-lg font-bold text-gray-900">
            {step === 1 ? '1단계: 분석 결과 확인' : '2단계: 수정 후 저장'}
          </h2>
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

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {step === 1 ? (
            <>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">파트</label>
                <p className="text-gray-900 font-medium">{part || '-'} · {lcOrRc}</p>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">난이도</label>
                <p className="text-gray-900 font-medium">{difficulty === 1 ? '쉬움' : difficulty === 3 ? '어려움' : '보통'}</p>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">문제</label>
                <p className="text-gray-800 text-sm whitespace-pre-wrap">{question || '-'}</p>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">정답</label>
                <p className="text-gray-900 font-medium">{answer || '-'}</p>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">해설</label>
                <p className="text-gray-800 text-sm whitespace-pre-wrap">{explanation || '-'}</p>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">태그</label>
                <div className="flex flex-wrap gap-1">
                  {tagsArray.length ? tagsArray.map((t, i) => (
                    <span key={i} className="text-xs px-2 py-1 bg-primary-100 text-primary-700 rounded">
                      #{t}
                    </span>
                  )) : '-'}
                </div>
              </div>
            </>
          ) : (
            <>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">파트</label>
                <input
                  type="text"
                  value={part}
                  onChange={(e) => setPart(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  placeholder="Part 5"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">문제</label>
                <textarea
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  rows={4}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm resize-none"
                  placeholder="문제 텍스트"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">정답</label>
                <input
                  type="text"
                  value={answer}
                  onChange={(e) => setAnswer(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  placeholder="A"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">해설</label>
                <textarea
                  value={explanation}
                  onChange={(e) => setExplanation(e.target.value)}
                  rows={3}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm resize-none"
                  placeholder="정답 해설"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">태그 (쉼표로 구분)</label>
                <input
                  type="text"
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  placeholder="관계대명사, 현재완료"
                />
              </div>
            </>
          )}
        </div>

        <div className="p-4 border-t border-gray-200 flex gap-2">
          {step === 1 ? (
            <>
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2.5 px-4 rounded-lg border border-gray-300 text-gray-700 text-sm font-medium"
              >
                취소
              </button>
              <button
                type="button"
                onClick={() => setStep(2)}
                className="flex-1 py-2.5 px-4 rounded-lg bg-primary-600 text-white text-sm font-medium hover:bg-primary-700"
              >
                수정하고 저장
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => setStep(1)}
                className="flex-1 py-2.5 px-4 rounded-lg border border-gray-300 text-gray-700 text-sm font-medium"
              >
                뒤로
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="flex-1 py-2.5 px-4 rounded-lg bg-primary-600 text-white text-sm font-medium hover:bg-primary-700 disabled:opacity-50"
              >
                {saving ? '저장 중…' : '저장'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default AnalysisConfirmModal
