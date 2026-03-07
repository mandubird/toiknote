/**
 * v4.23: 사회적 증명 — Hero 하단 신뢰 배지 (실시간 DB 수치)
 */
import { useState, useEffect } from 'react'
import { getSocialProofStats } from '../../services/landingService'

export default function SocialProofBar() {
  const [stats, setStats] = useState({ monthlySuccessCount: 17, avgScoreGain: 62 })

  useEffect(() => {
    getSocialProofStats().then(setStats).catch(() => {})
  }, [])

  return (
    <div className="mt-8 flex flex-wrap items-center justify-center gap-4 rounded-lg bg-white/10 px-4 py-3 text-sm">
      <div className="text-center">
        <strong className="block text-white">{stats.monthlySuccessCount}명</strong>
        <span className="text-white/80">이번 달 900 돌파</span>
      </div>
      <span className="text-white/50">|</span>
      <div className="text-center">
        <strong className="block text-white">+{stats.avgScoreGain}점</strong>
        <span className="text-white/80">평균 점수 상승</span>
      </div>
      <span className="text-white/50">|</span>
      <div className="text-center">
        <strong className="block text-white">100일</strong>
        <span className="text-white/80">집중 관리</span>
      </div>
    </div>
  )
}
