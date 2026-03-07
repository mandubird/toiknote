import { useState, useEffect } from 'react'

// LC 오답 원인 → 즉각 코치 팁 매핑
const LC_COACH_TIPS = {
  발음혼동: '비슷한 발음의 단어를 혼동하는 패턴이에요. 딕테이션 연습으로 귀를 정확히 훈련해 보세요.',
  집중력분산: '초반 키워드를 놓치는 패턴이에요. 듣기 전 선택지를 미리 훑어보는 습관이 도움돼요.',
  어휘몰라서: '모르는 단어가 정답을 막았어요. 오늘 이 단어를 꼭 단어장에 추가하고 내일 복습하세요.',
  속도못따라감: '원어민 속도 적응이 필요해요. 1.2배속 쉐도잉부터 시작해 점차 속도를 높여보세요.',
  선택지오해: '선택지 해석에서 실수가 났어요. 듣기 전 선택지 키워드를 먼저 체크하는 훈련을 해보세요.',
  노트테이킹실패: 'Part 4는 노트테이킹이 핵심이에요. 숫자·장소·시간 위주로 짧게 메모하는 연습을 해보세요.',
}

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
    { label: '오답 원인', options: ['발음혼동', '속도못따라감', '어휘몰라서', '집중력분산'] },
  ],
  1: [
    { label: '함정', options: ['동작함정', '위치함정', '유사발음', '수동태'] },
    { label: '오답 원인', options: ['발음혼동', '집중력분산', '어휘몰라서'] },
  ],
  3: [
    { label: '유형', options: ['주제', '세부정보', '추론', '의도파악', '다음행동'] },
    { label: '오답 원인', options: ['속도못따라감', '집중력분산', '어휘몰라서', '선택지오해'] },
  ],
  4: [
    { label: '담화', options: ['공지', '안내방송', '광고', '회의', '전화메시지'] },
    { label: '유형', options: ['주제', '세부정보', '추론'] },
    { label: '오답 원인', options: ['속도못따라감', '집중력분산', '어휘몰라서', '노트테이킹실패'] },
  ],
}

const AnalysisConfirmModal = ({ open, onClose, initialData, imageUrl, onSave, saving, multiTotal = 1, multiIndex = 0 }) => {
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
  const [solvingTime, setSolvingTime] = useState('')
  const [rereadCount, setRereadCount] = useState('')
  const [selectedOption, setSelectedOption] = useState(null)

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
      setSolvingTime('')
      setRereadCount(initialData?.rereadCount != null ? String(initialData.rereadCount) : '')
      // 정답이 "B. which" 형태면 선택된 보기로 반영
      if (initialData.options && typeof initialData.options === 'object' && initialData.answer) {
        const m = String(initialData.answer).trim().match(/^([A-Da-d])/)
        setSelectedOption(m ? m[1].toUpperCase() : null)
      } else {
        setSelectedOption(null)
      }
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
    if (!answer.trim()) {
      alert('정답을 입력해 주세요.')
      return
    }
    const rereadVal =
      rereadCount.trim() !== '' && /^\d+$/.test(rereadCount.trim())
        ? parseInt(rereadCount.trim(), 10)
        : initialData?.rereadCount ?? null

    let finalAnswer = answer.trim()
    if (
      /^[A-Da-d]$/.test(finalAnswer) &&
      initialData?.options &&
      typeof initialData.options === 'object'
    ) {
      const letter = finalAnswer.toUpperCase()
      const optText = initialData.options[letter]
      if (optText) {
        finalAnswer = `${letter}. ${optText}`
      }
    }

    const vocabTags = (initialData?.keyVocabulary || []).map((v) => `어휘:${v}`)
    const mergedTags = [...new Set([...tagsArray, ...vocabTags])]

    onSave({
      imageUrl,
      part,
      partNumber,
      lcOrRc,
      question,
      answer: finalAnswer,
      explanation,
      tags: mergedTags,
      difficulty,
      grammarCategory: initialData?.grammarCategory ?? null,
      grammarSubType: initialData?.grammarSubType ?? null,
      passageType: initialData?.passageType ?? null,
      questionType: initialData?.questionType ?? null,
      questionPattern: initialData?.questionPattern ?? null,
      answerType: initialData?.answerType ?? null,
      userSelectedTags,
      timeoutFlag,
      solvingTime: solvingTime.trim() !== '' && /^\d+$/.test(solvingTime.trim()) ? parseInt(solvingTime.trim(), 10) : null,
      // v4.01 전파트
      part1ImageTrapType: initialData?.part1ImageTrapType ?? null,
      part1KeywordMissed: initialData?.part1KeywordMissed ?? null,
      part1PassiveVoiceError: initialData?.part1PassiveVoiceError,
      part3QuestionType: initialData?.part3QuestionType ?? null,
      part3SetPosition: initialData?.part3SetPosition ?? null,
      part3PreviewRead: initialData?.part3PreviewRead,
      part3ConcentrationDrop: initialData?.part3ConcentrationDrop,
      part4LectureType: initialData?.part4LectureType ?? null,
      part4QuestionType: initialData?.part4QuestionType ?? null,
      part4NoteTaking: initialData?.part4NoteTaking,
      part6BlankType: initialData?.part6BlankType ?? null,
      part6ContextFailReason: initialData?.part6ContextFailReason ?? null,
      rereadCount: rereadVal,
      options: initialData?.options ?? null,
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
            {multiTotal > 1 && (
              <span className="ml-2 text-xs font-normal text-gray-500">
                ({multiIndex + 1}/{multiTotal})
              </span>
            )}
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
                <label className="block text-xs font-medium text-gray-500 mb-1">정답 (필수)</label>
                <p className="text-gray-900 font-medium">{answer || '-'}</p>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">해설</label>
                <p className="text-gray-800 text-sm whitespace-pre-wrap">{explanation || '-'}</p>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">태그</label>
                <div className="flex flex-wrap gap-1">
                  {tagsArray.length
                    ? tagsArray.map((t, i) => (
                        <span
                          key={i}
                          className="text-xs px-2 py-1 bg-primary-100 text-primary-700 rounded"
                        >
                          #{t}
                        </span>
                      ))
                    : '-'}
                </div>
              </div>
              {initialData?.options && (
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">보기</label>
                  <div className="text-sm text-gray-800 space-y-0.5">
                    {['A', 'B', 'C', 'D'].map((key) => {
                      const text = initialData.options?.[key]
                      if (!text) return null
                      const isCorrect =
                        answer &&
                        (answer.trim().toUpperCase() === key ||
                          answer.trim().toUpperCase().startsWith(key + '.'))
                      return (
                        <p
                          key={key}
                          className={isCorrect ? 'font-semibold text-primary-700' : ''}
                        >
                          {key}. {text}
                          {isCorrect ? ' ← 정답 후보' : ''}
                        </p>
                      )
                    })}
                  </div>
                </div>
              )}
              {/* 핵심 어휘 (어휘 문제일 때만) */}
              {initialData?.keyVocabulary?.length > 0 && (
                <div className="pt-2 border-t border-gray-100">
                  <label className="block text-xs font-medium text-amber-700 mb-1">📖 핵심 단어/표현</label>
                  <div className="flex flex-wrap gap-1">
                    {initialData.keyVocabulary.map((v, i) => (
                      <span key={i} className="text-xs px-2 py-1 bg-amber-50 text-amber-800 border border-amber-200 rounded-full">
                        {v}
                      </span>
                    ))}
                  </div>
                  <p className="text-xs text-gray-400 mt-1">저장 시 단어장에 자동 추가돼요</p>
                </div>
              )}
              {/* STEP 3 + v4.01: 세부 분류 (전파트) */}
              {(initialData?.grammarCategory || initialData?.passageType || initialData?.questionPattern || initialData?.part1ImageTrapType || initialData?.part3QuestionType || initialData?.part4LectureType || initialData?.part6BlankType || initialData?.rereadCount != null) && (
                <div className="pt-2 border-t border-gray-100">
                  <label className="block text-xs font-medium text-gray-500 mb-1">AI 세부 분류</label>
                  <div className="text-xs text-gray-700 space-y-0.5">
                    {initialData.part1ImageTrapType && <p>Part 1 함정: {initialData.part1ImageTrapType}{initialData.part1KeywordMissed ? ` · 놓친 키워드: ${initialData.part1KeywordMissed}` : ''}{initialData.part1PassiveVoiceError ? ' · 수동태 오류' : ''}</p>}
                    {initialData.questionPattern && <p>Part 2: {initialData.questionPattern} · {initialData.answerType || '-'}</p>}
                    {initialData.part3QuestionType && <p>Part 3: {initialData.part3QuestionType}{initialData.part3SetPosition ? ` (${initialData.part3SetPosition}번 문제)` : ''}{initialData.part3ConcentrationDrop ? ' · 집중력 저하 추정' : ''}</p>}
                    {initialData.part4LectureType && <p>Part 4: {initialData.part4LectureType} · {initialData.part4QuestionType || '-'}{initialData.part4NoteTaking ? ' · 노트테이킹' : ''}</p>}
                    {initialData.grammarCategory && <p>Part 5 문법: {initialData.grammarCategory}{initialData.grammarSubType ? ` (${initialData.grammarSubType})` : ''}</p>}
                    {initialData.part6BlankType && <p>Part 6: {initialData.part6BlankType}{initialData.part6ContextFailReason ? ` · ${initialData.part6ContextFailReason}` : ''}</p>}
                    {(initialData.passageType || initialData.questionType || initialData.rereadCount != null) && (
                      <p>Part 7: {[initialData.passageType, initialData.questionType].filter(Boolean).join(' · ') || '-'}{initialData.rereadCount != null ? ` · 재읽기 ${initialData.rereadCount}회` : ''}</p>
                    )}
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
              {/* LC 오답 원인 코치 팁 */}
              {partNumber >= 1 && partNumber <= 4 && (() => {
                const lcCause = userSelectedTags.find((t) => LC_COACH_TIPS[t])
                if (!lcCause) return null
                return (
                  <div className="p-3 bg-blue-50 rounded-xl border border-blue-100">
                    <p className="text-xs font-semibold text-blue-700 mb-1">💡 AI 코치 조언</p>
                    <p className="text-xs text-blue-800 leading-relaxed">{LC_COACH_TIPS[lcCause]}</p>
                  </div>
                )
              })()}
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
              {(partNumber === 5 || partNumber === 6 || partNumber === 7) && (
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">풀이 시간 (초, 선택)</label>
                  <input
                    type="number"
                    min={0}
                    max={600}
                    value={solvingTime}
                    onChange={(e) => setSolvingTime(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                    placeholder="예: 90"
                  />
                </div>
              )}
              {partNumber === 7 && (
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">지문 재읽기 횟수 (선택)</label>
                  <input
                    type="number"
                    min={0}
                    max={10}
                    value={rereadCount}
                    onChange={(e) => setRereadCount(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                    placeholder="예: 1"
                  />
                </div>
              )}
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">파트</label>
                <select
                  value={part}
                  onChange={(e) => {
                    const v = e.target.value
                    setPart(v)
                    const numMatch = v.match(/(\d+)/)
                    if (numMatch) {
                      const n = parseInt(numMatch[1], 10)
                      if (n >= 1 && n <= 7) setPartNumber(n)
                    }
                  }}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white"
                >
                  <option value="">파트 선택</option>
                  <option value="Part 1">Part 1 (LC)</option>
                  <option value="Part 2">Part 2 (LC)</option>
                  <option value="Part 3">Part 3 (LC)</option>
                  <option value="Part 4">Part 4 (LC)</option>
                  <option value="Part 5">Part 5 (RC)</option>
                  <option value="Part 6">Part 6 (RC)</option>
                  <option value="Part 7">Part 7 (RC)</option>
                </select>
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
              {initialData?.options && Object.keys(initialData.options || {}).length > 0 ? (
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">
                    정답 (보기에서 선택)
                  </label>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {['A', 'B', 'C', 'D'].map((key) => {
                      const text = initialData.options?.[key]
                      if (!text) return null
                      const isSelected = selectedOption === key
                      return (
                        <button
                          key={key}
                          type="button"
                          onClick={() => {
                            setSelectedOption(key)
                            setAnswer(`${key}. ${text}`)
                          }}
                          className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                            isSelected
                              ? 'bg-primary-600 text-white border-primary-600'
                              : 'bg-gray-100 text-gray-700 border-gray-200 hover:bg-gray-200'
                          }`}
                        >
                          {key}. {text}
                        </button>
                      )
                    })}
                  </div>
                </div>
              ) : (
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
              )}
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
