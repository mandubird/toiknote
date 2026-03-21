import { useMemo, useState, useEffect } from 'react'

/**
 * Part + 문제유형 2단(1차/2차) 선택
 * @param {Array<{ id: number, category_level1: string, category_level2: string }>} problemTypes
 */
const ProblemInputCard = ({
  partNumber,
  onPartNumberChange,
  problemTypes,
  problemTypeId,
  onProblemTypeChange,
  disabled,
}) => {
  const selectedRow = useMemo(
    () => (problemTypes || []).find((r) => Number(r.id) === Number(problemTypeId)),
    [problemTypes, problemTypeId]
  )

  const [draftL1, setDraftL1] = useState('')
  const [draftL2, setDraftL2] = useState('')

  useEffect(() => {
    setDraftL1('')
    setDraftL2('')
  }, [partNumber])

  useEffect(() => {
    if (selectedRow) {
      setDraftL1(selectedRow.category_level1)
      setDraftL2(selectedRow.category_level2)
    }
  }, [selectedRow?.id])

  const level1Options = useMemo(() => {
    const s = new Set()
    for (const row of problemTypes || []) {
      if (row.category_level1) s.add(row.category_level1)
    }
    return [...s].sort()
  }, [problemTypes])

  const activeL1 = selectedRow ? selectedRow.category_level1 : draftL1

  const level2Options = useMemo(() => {
    if (!activeL1) return []
    return (problemTypes || [])
      .filter((r) => r.category_level1 === activeL1)
      .map((r) => r.category_level2)
      .sort()
  }, [problemTypes, activeL1])

  const setLevel1 = (l1) => {
    setDraftL1(l1)
    setDraftL2('')
    onProblemTypeChange(null)
  }

  const setLevel2 = (l2) => {
    setDraftL2(l2)
    const row = (problemTypes || []).find((r) => r.category_level1 === activeL1 && r.category_level2 === l2)
    onProblemTypeChange(row ? row.id : null)
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-gray-50/80 p-4 space-y-3">
      <p className="text-sm font-semibold text-gray-900">문제 유형</p>

      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1">Part (필수)</label>
        <select
          value={partNumber >= 1 && partNumber <= 7 ? partNumber : ''}
          onChange={(e) => {
            const v = e.target.value
            onPartNumberChange(v === '' ? 5 : parseInt(v, 10))
            onProblemTypeChange(null)
          }}
          disabled={disabled}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white"
        >
          <option value="">파트 선택</option>
          <option value={1}>Part 1 (LC)</option>
          <option value={2}>Part 2 (LC)</option>
          <option value={3}>Part 3 (LC)</option>
          <option value={4}>Part 4 (LC)</option>
          <option value={5}>Part 5 (RC)</option>
          <option value={6}>Part 6 (RC)</option>
          <option value={7}>Part 7 (RC)</option>
        </select>
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1">1차 카테고리 (필수)</label>
        <select
          value={activeL1}
          onChange={(e) => setLevel1(e.target.value)}
          disabled={disabled || !problemTypes?.length}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white"
        >
          <option value="">{problemTypes?.length ? '선택' : '유형을 불러오는 중…'}</option>
          {level1Options.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1">2차 문제 유형 (필수)</label>
        <select
          value={selectedRow ? selectedRow.category_level2 : draftL2}
          onChange={(e) => setLevel2(e.target.value)}
          disabled={disabled || !activeL1}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white"
        >
          <option value="">선택</option>
          {level2Options.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      </div>

      {!problemTypes?.length && partNumber >= 1 && partNumber <= 7 && (
        <p className="text-xs text-amber-600">
          이 파트에 등록된 문제 유형이 없어요. DB 마이그레이션(시드) 적용 여부를 확인해 주세요.
        </p>
      )}
    </div>
  )
}

export default ProblemInputCard
