import { useState, useEffect, useCallback } from 'react'
import ProblemInputCard from './ProblemInputCard'
import WeaknessTagSelector from './WeaknessTagSelector'
import { fetchProblemTypesByPart, fetchTagDictionaryByProblemType } from '../services/problemTypeService'

// LC 오답 원인 → 즉각 코치 팁 매핑
const LC_COACH_TIPS = {
  발음혼동: '비슷한 발음의 단어를 혼동하는 패턴이에요. 딕테이션 연습으로 귀를 정확히 훈련해 보세요.',
  집중력분산: '초반 키워드를 놓치는 패턴이에요. 듣기 전 선택지를 미리 훑어보는 습관이 도움돼요.',
  어휘몰라서: '모르는 단어가 정답을 막았어요. 오늘 이 단어를 꼭 단어장에 추가하고 내일 복습하세요.',
  속도못따라감: '원어민 속도 적응이 필요해요. 1.2배속 쉐도잉부터 시작해 점차 속도를 높여보세요.',
  선택지오해: '선택지 해석에서 실수가 났어요. 듣기 전 선택지 키워드를 먼저 체크하는 훈련을 해보세요.',
  노트테이킹실패: 'Part 4는 노트테이킹이 핵심이에요. 숫자·장소·시간 위주로 짧게 메모하는 연습을 해보세요.',
}

/** LC 전용: 코칭 로그용 추가 칩 (명세상 사전 태그와 별도) */
const LC_EXTRA_CHIPS = {
  1: ['발음혼동', '집중력분산', '어휘몰라서'],
  2: ['발음혼동', '속도못따라감', '어휘몰라서', '집중력분산', '선택지오해'],
  3: ['속도못따라감', '집중력분산', '어휘몰라서', '선택지오해'],
  4: ['속도못따라감', '집중력분산', '어휘몰라서', '노트테이킹실패'],
}

const AnalysisConfirmModal = ({
  open,
  onClose,
  initialData,
  imageUrl,
  onSave,
  saving,
  multiTotal = 1,
  multiIndex = 0,
}) => {
  const [part, setPart] = useState('')
  const [question, setQuestion] = useState('')
  const [answer, setAnswer] = useState('')
  const [explanation, setExplanation] = useState('')
  const [lcOrRc, setLcOrRc] = useState('RC')
  const [difficulty, setDifficulty] = useState(2)
  const [partNumber, setPartNumber] = useState(5)
  const [userSelectedTags, setUserSelectedTags] = useState([])
  const [timeoutFlag, setTimeoutFlag] = useState(false)
  const [solvingTime, setSolvingTime] = useState('')
  const [rereadCount, setRereadCount] = useState('')
  const [selectedOption, setSelectedOption] = useState(null)

  const [problemTypes, setProblemTypes] = useState([])
  const [problemTypeId, setProblemTypeId] = useState(null)
  const [dictionaryTags, setDictionaryTags] = useState([])
  const [selectedDictionaryTagIds, setSelectedDictionaryTagIds] = useState([])

  const resetFormFromInitial = useCallback(() => {
    if (!initialData) return
    setPart(initialData.part || '')
    setQuestion(initialData.question || '')
    const rawAnswer = initialData.answer || ''
    setAnswer(rawAnswer === '-' ? '' : rawAnswer)
    setExplanation(initialData.explanation || '')
    setLcOrRc(initialData.lcOrRc === 'LC' ? 'LC' : 'RC')
    setDifficulty([1, 2, 3].includes(Number(initialData.difficulty)) ? Number(initialData.difficulty) : 2)
    setPartNumber(initialData.partNumber >= 1 && initialData.partNumber <= 7 ? initialData.partNumber : 5)
    setUserSelectedTags([])
    setTimeoutFlag(false)
    setSolvingTime('')
    setRereadCount(initialData?.rereadCount != null ? String(initialData.rereadCount) : '')
    setProblemTypeId(null)
    setDictionaryTags([])
    setSelectedDictionaryTagIds([])
    if (initialData.options && typeof initialData.options === 'object' && initialData.answer) {
      const m = String(initialData.answer).trim().match(/^([A-Da-d])/)
      setSelectedOption(m ? m[1].toUpperCase() : null)
    } else {
      setSelectedOption(null)
    }
  }, [initialData])

  useEffect(() => {
    if (open && initialData) {
      resetFormFromInitial()
    }
  }, [open, initialData, resetFormFromInitial])

  useEffect(() => {
    if (!open) return
    setProblemTypes([])
    let cancelled = false
    ;(async () => {
      const rows = await fetchProblemTypesByPart(partNumber)
      if (!cancelled) setProblemTypes(rows)
    })()
    return () => {
      cancelled = true
    }
  }, [open, partNumber])

  useEffect(() => {
    if (!open || problemTypeId == null) {
      setDictionaryTags([])
      setSelectedDictionaryTagIds([])
      return
    }
    let cancelled = false
    ;(async () => {
      const t = await fetchTagDictionaryByProblemType(problemTypeId)
      if (!cancelled) {
        setDictionaryTags(t)
        setSelectedDictionaryTagIds((prev) => prev.filter((id) => t.some((r) => Number(r.id) === Number(id))))
      }
    })()
    return () => {
      cancelled = true
    }
  }, [open, problemTypeId])

  if (!open) return null

  const toggleUserTag = (tag) => {
    setUserSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    )
  }

  const ptRow = (problemTypes || []).find((r) => Number(r.id) === Number(problemTypeId))

  const buildSegmentFields = () => {
    let grammarCategory = initialData?.grammarCategory ?? null
    let grammarSubType = initialData?.grammarSubType ?? null
    let passageType = initialData?.passageType ?? null
    let questionType = initialData?.questionType ?? null
    if (ptRow) {
      if (partNumber === 5 || partNumber === 6) {
        grammarCategory = ptRow.category_level1
        grammarSubType = ptRow.category_level2
      } else if (partNumber === 7) {
        passageType = ptRow.category_level1
        questionType = ptRow.category_level2
      }
    }
    return { grammarCategory, grammarSubType, passageType, questionType }
  }

  const handleSave = () => {
    if (!answer.trim()) {
      alert('정답을 입력하거나 보기에서 선택해 주세요.')
      return
    }
    if (problemTypes.length > 0 && !problemTypeId) {
      alert('문제 유형(1차·2차)을 선택해 주세요.')
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
    const dictNames = dictionaryTags
      .filter((t) => selectedDictionaryTagIds.includes(Number(t.id)))
      .map((t) => t.tag_name)
    const mergedTags = [...new Set([...dictNames, ...vocabTags])]

    const seg = buildSegmentFields()

    onSave({
      imageUrl,
      part: part || `Part ${partNumber}`,
      partNumber,
      lcOrRc,
      question,
      answer: finalAnswer,
      explanation,
      tags: mergedTags,
      difficulty,
      grammarCategory: seg.grammarCategory,
      grammarSubType: seg.grammarSubType,
      passageType: seg.passageType,
      questionType: seg.questionType,
      questionPattern: initialData?.questionPattern ?? null,
      answerType: initialData?.answerType ?? null,
      userSelectedTags,
      timeoutFlag,
      solvingTime: solvingTime.trim() !== '' && /^\d+$/.test(solvingTime.trim()) ? parseInt(solvingTime.trim(), 10) : null,
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
      problemTypeId,
      dictionaryTagIds: selectedDictionaryTagIds,
    })
  }

  const showTimeoutCheck = partNumber >= 5 && partNumber <= 7
  const lcChips = LC_EXTRA_CHIPS[partNumber] || []
  const lcCause = userSelectedTags.find((t) => LC_COACH_TIPS[t])

  const syncPartFromNumber = (n) => {
    setPartNumber(n)
    setPart(`Part ${n}`)
    setLcOrRc(n >= 1 && n <= 4 ? 'LC' : 'RC')
    setProblemTypeId(null)
  }

  return (
    <div className="fixed inset-0 z-[110] flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4">
      <div className="bg-white w-full max-h-[90vh] rounded-t-2xl sm:rounded-2xl shadow-xl flex flex-col max-w-lg mx-auto overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div>
            <h2 className="text-lg font-bold text-gray-900">문제를 분석했습니다</h2>
            <p className="text-xs text-gray-500 mt-0.5">필요한 부분만 확인해 주세요</p>
            {multiTotal > 1 && (
              <span className="text-xs font-normal text-gray-400">
                ({multiIndex + 1}/{multiTotal})
              </span>
            )}
          </div>
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
          <ProblemInputCard
            key={partNumber}
            partNumber={partNumber}
            onPartNumberChange={syncPartFromNumber}
            problemTypes={problemTypes}
            problemTypeId={problemTypeId}
            onProblemTypeChange={setProblemTypeId}
            disabled={saving}
          />

          <WeaknessTagSelector
            tags={dictionaryTags}
            selectedTagIds={selectedDictionaryTagIds}
            onChange={setSelectedDictionaryTagIds}
            disabled={saving}
          />

          {partNumber >= 1 && partNumber <= 4 && lcChips.length > 0 && (
            <div className="space-y-2">
              <label className="block text-xs font-medium text-gray-500">듣기 오답 패턴 (선택, 코칭 연결)</label>
              <div className="flex flex-wrap gap-1.5">
                {lcChips.map((opt) => (
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
          )}

          {lcCause && (
            <div className="p-3 bg-blue-50 rounded-xl border border-blue-100">
              <p className="text-xs font-semibold text-blue-700 mb-1">💡 AI 코치 조언</p>
              <p className="text-xs text-blue-800 leading-relaxed">{LC_COACH_TIPS[lcCause]}</p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
            <div>
              <span className="text-gray-400">난이도</span>{' '}
              <span className="font-medium text-gray-800">
                {difficulty === 1 ? '쉬움' : difficulty === 3 ? '어려움' : '보통'}
              </span>
            </div>
            <div>
              <span className="text-gray-400">구분</span>{' '}
              <span className="font-medium text-gray-800">{lcOrRc}</span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">문제 (필요 시 수정)</label>
            <textarea
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              rows={3}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm resize-none"
              placeholder="문제 텍스트"
            />
          </div>

          {initialData?.options && Object.keys(initialData.options || {}).length > 0 ? (
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">정답 (보기에서 선택)</label>
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
              <label className="block text-xs font-medium text-gray-500 mb-1">정답 (필수)</label>
              <input
                type="text"
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                placeholder="정답"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">해설 (선택)</label>
            <textarea
              value={explanation}
              onChange={(e) => setExplanation(e.target.value)}
              rows={2}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm resize-none"
              placeholder="필요할 때만 수정"
            />
          </div>

          {initialData?.keyVocabulary?.length > 0 && (
            <div className="pt-2 border-t border-gray-100">
              <label className="block text-xs font-medium text-amber-700 mb-1">📖 핵심 단어/표현</label>
              <div className="flex flex-wrap gap-1">
                {initialData.keyVocabulary.map((v, i) => (
                  <span
                    key={i}
                    className="text-xs px-2 py-1 bg-amber-50 text-amber-800 border border-amber-200 rounded-full"
                  >
                    {v}
                  </span>
                ))}
              </div>
              <p className="text-xs text-gray-400 mt-1">저장 시 태그에 반영돼요</p>
            </div>
          )}

          {(initialData?.grammarCategory ||
            initialData?.passageType ||
            initialData?.questionPattern ||
            initialData?.part1ImageTrapType) && (
            <details className="text-xs text-gray-600 border border-gray-100 rounded-lg p-2">
              <summary className="cursor-pointer font-medium text-gray-500">AI 추정 분류 (참고)</summary>
              <div className="mt-2 space-y-0.5 text-gray-600">
                {initialData.part1ImageTrapType && (
                  <p>
                    Part 1: {initialData.part1ImageTrapType}
                    {initialData.part1KeywordMissed ? ` · ${initialData.part1KeywordMissed}` : ''}
                  </p>
                )}
                {initialData.questionPattern && (
                  <p>
                    Part 2: {initialData.questionPattern} · {initialData.answerType || '-'}
                  </p>
                )}
                {initialData.grammarCategory && (
                  <p>
                    문법 추정: {initialData.grammarCategory}
                    {initialData.grammarSubType ? ` (${initialData.grammarSubType})` : ''}
                  </p>
                )}
                {(initialData.passageType || initialData.questionType) && (
                  <p>
                    독해 추정: {[initialData.passageType, initialData.questionType].filter(Boolean).join(' · ')}
                  </p>
                )}
              </div>
            </details>
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
        </div>

        <div className="p-4 border-t border-gray-200 flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 px-4 rounded-lg border border-gray-300 text-gray-700 text-sm font-medium"
          >
            취소
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="flex-1 py-2.5 px-4 rounded-lg bg-primary-600 text-white text-sm font-medium hover:bg-primary-700 disabled:opacity-50"
          >
            {saving ? '저장 중…' : '분석 저장하기'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default AnalysisConfirmModal
