import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { getSubscription } from '../services/subscription'
import { analyzeStrategy } from '../services/analyzeStrategy'

const CACHE_MS = 24 * 60 * 60 * 1000

function formatLastAnalyzed(iso) {
  if (!iso) return ''
  const ms = Date.now() - new Date(iso).getTime()
  if (ms < 60 * 1000) return '방금 전'
  if (ms < 60 * 60 * 1000) return `${Math.floor(ms / 60000)}분 전`
  if (ms < 24 * 60 * 60 * 1000) return `${Math.floor(ms / 3600000)}시간 전`
  return `${Math.floor(ms / 86400000)}일 전`
}

const StrategyPage = () => {
  const { user } = useAuth()
  const [subscribed, setSubscribed] = useState(false)
  const [loading, setLoading] = useState(true)
  const [analyzing, setAnalyzing] = useState(false)
  const [strategy, setStrategy] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!user) {
      setSubscribed(false)
      setStrategy(null)
      setLoading(false)
      return
    }
    const uid = user.id
    Promise.all([
      getSubscription(uid),
      supabase.from('score_analytics').select('*').eq('user_id', uid).maybeSingle(),
    ]).then(([sub, { data: d }]) => {
      setSubscribed(sub.paid)
      if (sub.paid && d) {
        const lastAt = d.last_analyzed_at ? new Date(d.last_analyzed_at).getTime() : 0
        if (lastAt && Date.now() - lastAt < CACHE_MS) {
          setStrategy({
            priorityFocus: d.priority_focus,
            dailyPlan: d.daily_plan,
            weeklyGoal: d.weekly_goal,
            expectedImprovement: d.expected_improvement,
            specificTips: Array.isArray(d.specific_tips) ? d.specific_tips : [],
            rcTimeAllocation: d.rc_time_allocation || { part5: 15, part6: 8, part7: 52 },
            rcStrategyText: d.rc_strategy_text || '',
            grammarWeaknessSummary: d.grammar_weakness_summary || '',
            weakGrammarTop3: Array.isArray(d.weak_grammar_top3) ? d.weak_grammar_top3 : [],
            avgPart7TimeSeconds: d.avg_part7_time ?? null,
            lastAnalyzedAt: d.last_analyzed_at,
          })
        }
      }
      setLoading(false)
    })
  }, [user])

  const handleAnalyze = async () => {
    if (!user || !subscribed) return
    setError(null)
    setAnalyzing(true)
    try {
      const result = await analyzeStrategy(user.id)
      setStrategy(result)
    } catch (err) {
      setError(err?.message || '전략 분석에 실패했어요.')
    } finally {
      setAnalyzing(false)
    }
  }

  if (loading) {
    return (
      <div className="p-4 flex justify-center py-12">
        <div className="animate-spin w-8 h-8 border-2 border-primary-200 border-t-primary-600 rounded-full" />
      </div>
    )
  }

  if (!subscribed) {
    return (
      <div className="p-4">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">AI 추천 학습 전략</h2>
        <p className="text-sm text-gray-600 mb-4">점수 상승을 위한 맞춤 전략은 프리미엄 회원만 이용할 수 있어요.</p>
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 text-center">
          <p className="font-medium text-amber-800">전략 분석은 유료 구독 후 이용 가능해요</p>
          <p className="text-sm text-amber-700 mt-2">일 30개 입력 제한, 세부 분석·AI 전략은 유료 회원만 이용할 수 있어요. 설정에서 구독하기</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4">
      <h2 className="text-2xl font-bold text-gray-900 mb-2">AI 추천 학습 전략</h2>
      <p className="text-sm text-gray-600 mb-1">나의 약점을 분석한 맞춤 전략이에요</p>
      <p className="text-xs text-gray-500 mb-4">
        AI가 당신 데이터를 바탕으로 추천한 학습 방향이에요.
      </p>

      {strategy?.lastAnalyzedAt && (
        <p className="text-xs text-gray-500 mb-2">
          마지막 분석: {formatLastAnalyzed(strategy.lastAnalyzedAt)}
        </p>
      )}
      <button
        type="button"
        onClick={handleAnalyze}
        disabled={analyzing}
        className="w-full py-3 px-4 rounded-xl bg-primary-600 text-white font-medium mb-6 disabled:opacity-50"
      >
        {analyzing ? '분석 중…' : '전략 새로고침'}
      </button>

      {error && <p className="text-sm text-red-600 mb-4">{error}</p>}

      {strategy && (
        <div className="space-y-4">
          {strategy.grammarWeaknessSummary && (
            <div className="bg-amber-50 rounded-lg border border-amber-200 p-4">
              <p className="text-xs font-medium text-amber-800 mb-1">Part 5 세부 문법 약점</p>
              <p className="text-amber-900 font-medium">{strategy.grammarWeaknessSummary}</p>
            </div>
          )}
          {strategy.priorityFocus && (
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <p className="text-xs font-medium text-gray-500 mb-1">우선 공략 영역</p>
              <p className="text-gray-900 font-medium">{strategy.priorityFocus}</p>
            </div>
          )}
          {strategy.rcTimeAllocation && (
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <p className="text-xs font-medium text-gray-500 mb-2">RC 시간 배분 전략</p>
              {strategy.rcStrategyText && (
                <p className="text-sm text-gray-800 mb-3">{strategy.rcStrategyText}</p>
              )}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-700 w-14">Part 5</span>
                  <div className="flex-1 h-5 bg-gray-100 rounded overflow-hidden">
                    <div
                      className="h-full bg-primary-500"
                      style={{ width: `${(strategy.rcTimeAllocation.part5 / 75) * 100}%` }}
                    />
                  </div>
                  <span className="text-sm font-medium text-gray-900 w-10">{strategy.rcTimeAllocation.part5}분</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-700 w-14">Part 6</span>
                  <div className="flex-1 h-5 bg-gray-100 rounded overflow-hidden">
                    <div
                      className="h-full bg-primary-400"
                      style={{ width: `${(strategy.rcTimeAllocation.part6 / 75) * 100}%` }}
                    />
                  </div>
                  <span className="text-sm font-medium text-gray-900 w-10">{strategy.rcTimeAllocation.part6}분</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-700 w-14">Part 7</span>
                  <div className="flex-1 h-5 bg-gray-100 rounded overflow-hidden">
                    <div
                      className="h-full bg-primary-600"
                      style={{ width: `${(strategy.rcTimeAllocation.part7 / 75) * 100}%` }}
                    />
                  </div>
                  <span className="text-sm font-medium text-gray-900 w-10">{strategy.rcTimeAllocation.part7}분</span>
                </div>
              </div>
              {!strategy.rcStrategyText && (
                <p className="text-xs text-gray-500 mt-2">Part 5·6에서 시간 확보 후 Part 7에 충분히 쓰세요.</p>
              )}
            </div>
          )}
          {strategy.dailyPlan && (
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <p className="text-xs font-medium text-gray-500 mb-1">하루 학습 루틴</p>
              <p className="text-gray-800 text-sm whitespace-pre-wrap">{strategy.dailyPlan}</p>
            </div>
          )}
          {strategy.weeklyGoal && (
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <p className="text-xs font-medium text-gray-500 mb-1">주간 목표</p>
              <p className="text-gray-800 text-sm">{strategy.weeklyGoal}</p>
            </div>
          )}
          {strategy.expectedImprovement && (
            <div className="bg-primary-50 rounded-lg border border-primary-100 p-4">
              <p className="text-xs font-medium text-primary-700 mb-1">예상 개선</p>
              <p className="text-primary-900 font-medium">{strategy.expectedImprovement}</p>
            </div>
          )}
          {strategy.specificTips && strategy.specificTips.length > 0 && (
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <p className="text-xs font-medium text-gray-500 mb-2">구체적 팁</p>
              <ul className="list-disc list-inside space-y-1 text-sm text-gray-800">
                {strategy.specificTips.map((tip, i) => (
                  <li key={i}>{tip}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {!strategy && !analyzing && subscribed && (
        <p className="text-sm text-gray-500 text-center py-8">위 버튼을 눌러 전략을 분석해 보세요</p>
      )}
    </div>
  )
}

export default StrategyPage
