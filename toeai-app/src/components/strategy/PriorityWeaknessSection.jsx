import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { buildLocalPriorityCards } from '../../services/priorityWeaknessFallback'
import PriorityWeaknessCard from './PriorityWeaknessCard'

export default function PriorityWeaknessSection({ userId }) {
  const [cards, setCards] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!userId) {
      setCards([])
      setLoading(false)
      return
    }

    let cancelled = false
    setLoading(true)
    setError(null)

    supabase.functions
      .invoke('strategy-priority-cards', {
        body: { userId },
      })
      .then(async ({ data, error: fnError }) => {
        if (cancelled) return
        if (fnError) {
          console.error('strategy-priority-cards error:', fnError)
          const local = await buildLocalPriorityCards(userId)
          if (cancelled) return
          if (local.length) {
            setCards(local)
            setError(null)
            return
          }
          setError('약점 코칭 카드를 불러오지 못했어요.')
          setCards([])
          return
        }
        const list = Array.isArray(data?.priority_cards) ? data.priority_cards : []
        setCards(list)
      })
      .catch(async (e) => {
        if (cancelled) return
        console.error('strategy-priority-cards invoke 예외:', e)
        const local = await buildLocalPriorityCards(userId)
        if (cancelled) return
        if (local.length) {
          setCards(local)
          setError(null)
          return
        }
        setError('약점 코칭 카드를 불러오지 못했어요.')
        setCards([])
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [userId])

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-4 mt-2">
        <p className="text-sm text-gray-500 text-center py-3">약점 코칭 카드를 불러오는 중…</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-4 mt-2">
        <p className="text-sm text-gray-500 text-center py-3">{error}</p>
      </div>
    )
  }

  if (!cards.length) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-4 mt-2">
        <p className="text-sm text-gray-400 text-center py-3">
          오답을 10개 이상 등록하면 우선 교정할 약점이 분석돼요.
        </p>
      </div>
    )
  }

  return (
    <section className="mt-2">
      <h3 className="font-semibold text-gray-900 mb-3">지금 우선 교정할 약점</h3>
      {cards.slice(0, 3).map((card, index) => (
        <PriorityWeaknessCard
          key={card.tag || index}
          rank={index + 1}
          tag={card.tag}
          count={card.count}
          reason={card.reason}
          action={card.action}
        />
      ))}
    </section>
  )
}

