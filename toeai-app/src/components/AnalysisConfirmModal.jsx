import { useState, useEffect } from 'react'

// STEP 4: 파트별 세부 태그 옵션 (여러 개 선택 가능)
const PART_TAG_OPTIONS = {
  5: [
    { label: '시제 관련', options: ['현재완료', '과거시제', '미래시제', '시제일치'] },
    { label: '관계대명사', options: ['주격', '목적격', '소유격', '선행사불일치'] },
    { label: '기타', options: ['수일치', '전치사', '접속사', '분사', '가정법', '비교급', '어휘'] },
  ],
  6: [
    { label: '빈칸 유형', options: ['문장삽입', '문법', '어휘', '연결어'] },
    { label: '문맥', options: ['앞문장미이해', '전체흐름미파악'] },
  ],
  7: [
    { label: '지문', options: ['단일지문', '이중지문', '삼중지문'] },
    { label: '문제 유형', options: ['사실확인', '추론', '어휘', '의도파악', '문장삽입'] },
  ],
  2: [
    { label: '질문 패턴', options: ['의문사질문', '일반의문문', '부정의문문', '선택의문문', '제안/요청', '평서문'] },
    { label: '답변 유형', options: ['직접답변', '우회답변', '부정응답'] },
  ],
  1: [{ label: '함정', options: ['동작함정', '위치함정', '유사발음', '수동태'] }],
  3: [{ label: '유형', options: ['주제', '세부정보', '추론', '의도파악', '다음행동'] }],
  4: [{ label: '담화', options: ['공지', '안내방송', '광고', '회의', '전화메시지'] }, { label: '유형', options: ['주제', '세부정보', '추론'] }],
}

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
  const [userSelectedTags, setUserSelectedTags] = useState([])
  const [timeoutFlag, setTimeoutFlag] = useState(false)

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
      setUserSelectedTags([])
      setTimeoutFlag(false)
    }
  }, [open, initialData])

  if (!open) return null

  const tagsArray = tags
    .split(/[,，\s]+/)
    .map((t) => t.trim())
    .filter(Boolean)

  const toggleUserTag = (tag) => {
    setUserSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    )
  }

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
      grammarCategory: initialData?.grammarCategory ?? null,
      grammarSubType: initialData?.grammarSubType ?? null,
      passageType: initialData?.passageType ?? null,
      questionType: initialData?.questionType ?? null,
      questionPattern: initialData?.questionPattern ?? null,
      answerType: initialData?.answerType ?? null,
      userSelectedTags,
      timeoutFlag,
    })
  }

  const segmentOptions = PART_TAG_OPTIONS[partNumber] || []
  const showTimeoutCheck = partNumber >= 5 && partNumber <= 7

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
              {/* STEP 3: 세부 분류 (Part 5 문법 / Part 7 유형 / Part 2 패턴) */}
              {(initialData?.grammarCategory || initialData?.passageType || initialData?.questionPattern) && (
                <div className="pt-2 border-t border-gray-100">
                  <label className="block text-xs font-medium text-gray-500 mb-1">AI 세부 분류</label>
                  <div className="text-xs text-gray-700 space-y-0.5">
                    {initialData.grammarCategory && (
                      <p>문법: {initialData.grammarCategory}{initialData.grammarSubType ? ` (${initialData.grammarSubType})` : ''}</p>
                    )}
                    {initialData.passageType && <p>지문: {initialData.passageType} · {initialData.questionType || '-'}</p>}
                    {initialData.questionPattern && <p>패턴: {initialData.questionPattern} · {initialData.answerType || '-'}</p>}
                  </div>
                </div>
              )}
            </>
          ) : (
            <>
              {/* STEP 4: 파트별 세부 태그 (여러 개 선택 가능) */}
              {segmentOptions.length > 0 && (
                <div className="space-y-3">
                  <label className="block text-xs font-medium text-gray-500">🏷️ 세부 유형 선택 (여러 개 가능)</label>
                  {segmentOptions.map((group, gi) => (
                    <div key={gi}>
                      <p className="text-xs text-gray-500 mb-1">{group.label}</p>
                      <div className="flex flex-wrap gap-1.5">
                        {group.options.map((opt) => (
                          <button
                            key={opt}
                            type="button"
                            onClick={() => toggleUserTag(opt)}
                            className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                              userSelectedTags.includes(opt)
                                ? 'bg-primary-600 text-white'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                          >
                            {opt}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {showTimeoutCheck && (
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={timeoutFlag}
                    onChange={(e) => setTimeoutFlag(e.target.checked)}
                    className="rounded border-gray-300 text-primary-600"
                  />
                  <span className="text-sm text-gray-700">⏱️ 시간 부족으로 찍음</span>
                </label>
              )}
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
