export default function PriorityWeaknessCard({ rank, tag, count, reason, action }) {
  return (
    <div className="bg-red-50 rounded-xl p-4 mb-3">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-red-500 font-bold text-base">{rank}</span>
        <span className="font-semibold text-gray-900 text-base">{tag}</span>
        <span className="text-red-400 text-sm">({count}개)</span>
      </div>
      <p className="text-red-500 text-sm leading-relaxed mb-1">
        {reason}
      </p>
      <p className="text-gray-600 text-sm leading-relaxed">
        → {action}
      </p>
    </div>
  )
}

