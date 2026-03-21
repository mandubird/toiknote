/**
 * 태그 사전 기반 추천 태그 — 체크만 선택 (자유 입력 없음)
 */
const WeaknessTagSelector = ({ tags, selectedTagIds, onChange, disabled }) => {
  const set = new Set(selectedTagIds || [])

  const toggle = (id) => {
    if (disabled) return
    const n = Number(id)
    const next = new Set(set)
    if (next.has(n)) next.delete(n)
    else next.add(n)
    onChange?.([...next].sort((a, b) => a - b))
  }

  if (!tags?.length) return null

  return (
    <div className="space-y-2">
      <label className="block text-xs font-medium text-gray-500">추천 태그 (선택)</label>
      <p className="text-[11px] text-gray-400 -mt-1">문제 유형에 맞는 원인만 골라 주세요</p>
      <div className="flex flex-col gap-2">
        {tags.map((row) => {
          const id = Number(row.id)
          const checked = set.has(id)
          return (
            <label
              key={id}
              className={`flex items-start gap-2 cursor-pointer rounded-lg border px-3 py-2 text-sm transition-colors ${
                checked ? 'border-primary-500 bg-primary-50' : 'border-gray-200 bg-white hover:bg-gray-50'
              } ${disabled ? 'opacity-50 pointer-events-none' : ''}`}
            >
              <input
                type="checkbox"
                className="mt-0.5 rounded border-gray-300 text-primary-600"
                checked={checked}
                onChange={() => toggle(id)}
              />
              <span className="text-gray-800 leading-snug">{row.tag_name}</span>
            </label>
          )
        })}
      </div>
    </div>
  )
}

export default WeaknessTagSelector
