/**
 * v4.27 #8: ScoreBandStrategyMode
 * 현재 점수대에 맞는 집중 전략을 한눈에 표시
 * 600-700 / 700-800 / 800-900 구간별 차별화
 */

const BAND_CONFIG = {
  '600-700': {
    label: '600-700점대',
    color: 'bg-violet-50 border-violet-200',
    badgeColor: 'bg-violet-100 text-violet-700',
    icon: '📐',
    headline: '기초 문법 확립이 최우선',
    focus: [
      'Part 5 기초 문법 반복 (수일치·시제·품사)',
      'LC 발음 적응 + 우회답변 패턴 인식',
      '오답 태그 집중 — 단 3개만 선택해 반복',
    ],
    caution: 'Part 7 시간보다 Part 5 정확도를 먼저 잡으세요',
  },
  '700-800': {
    label: '700-800점대',
    color: 'bg-blue-50 border-blue-200',
    badgeColor: 'bg-blue-100 text-blue-700',
    icon: '⏱',
    headline: 'Part 7 시간 단축이 핵심',
    focus: [
      'Part 7 지문별 책정 시간 훈련 (단일 90초 / 복수 150초)',
      'Part 5 고빈출 함정 유형 마스터',
      'RC 전체 75분 배분 전략 체화',
    ],
    caution: '문제를 다 맞히려 하지 말고, 빠르게 판단하는 연습을 하세요',
  },
  '800-900': {
    label: '800-900점대',
    color: 'bg-amber-50 border-amber-200',
    badgeColor: 'bg-amber-100 text-amber-700',
    icon: '🎯',
    headline: '함정 제거 + 실전 최적화',
    focus: [
      'Part 2 우회답변·발음함정 집중 제거',
      'Part 7 inference/paraphrase 정답률 향상',
      '실전 모의고사로 감각 유지 + 마지막 10문항 정확도',
    ],
    caution: '오답 원인 분석 없이 양만 늘리면 정체돼요. 약점 태그에만 집중하세요',
  },
}

function getScoreBand(score) {
  if (!score) return null
  if (score >= 800) return '800-900'
  if (score >= 700) return '700-800'
  if (score >= 600) return '600-700'
  return '600-700'
}

export default function ScoreBandStrategyCard({ currentScore }) {
  const band = getScoreBand(currentScore)
  if (!band) return null

  const cfg = BAND_CONFIG[band]

  return (
    <div className={`rounded-xl border p-4 mb-4 ${cfg.color}`}>
      <div className="flex items-center gap-2 mb-3">
        <span className="text-lg">{cfg.icon}</span>
        <div>
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${cfg.badgeColor}`}>
            {cfg.label}
          </span>
          <p className="text-sm font-bold text-gray-900 mt-1">{cfg.headline}</p>
        </div>
      </div>

      <ul className="space-y-1.5 mb-3">
        {cfg.focus.map((item) => (
          <li key={item} className="flex items-start gap-2 text-sm text-gray-700">
            <span className="text-gray-400 mt-0.5 shrink-0">▸</span>
            {item}
          </li>
        ))}
      </ul>

      <p className="text-xs text-gray-500 border-t border-gray-200 pt-2 mt-2">
        ⚠️ {cfg.caution}
      </p>
    </div>
  )
}
