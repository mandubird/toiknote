const borderColors = {
  1: 'border-l-accent-500',
  2: 'border-l-primary-400',
  3: 'border-l-surface-300',
}

export default function PriorityWeaknessCard({ rank, tag, count, reason, action }) {
  return (
    <div className={`flex items-start gap-3 p-3 rounded-xl bg-surface-50 border border-surface-200 border-l-4 ${borderColors[rank] || 'border-l-surface-300'}`}>
      <span className={`font-black text-lg w-5 shrink-0 leading-none mt-0.5 ${rank === 1 ? 'text-accent-500' : 'text-surface-400'}`}>
        {rank}
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-surface-900">{tag}</p>
        <p className="text-xs text-surface-500 mt-0.5 leading-snug">{reason}</p>
        <p className="text-xs font-semibold text-primary-600 mt-1.5">→ {action}</p>
      </div>
      <span className="text-xs text-surface-400 shrink-0 mt-0.5">{count}회</span>
    </div>
  )
}
