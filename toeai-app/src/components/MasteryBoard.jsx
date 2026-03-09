import { useState, useEffect, useCallback } from 'react'
import { getMasteryBoard, setUserOverride } from '../services/masteryService'

// ── 상태별 UI 설정 ────────────────────────────────────────
const STATUS_CONFIG = {
  not_started: { label: '미시작',    bg: '#F3F4F6', text: '#6B7280', bar: '#D1D5DB' },
  in_progress: { label: '진행 중',   bg: '#EFF6FF', text: '#2563EB', bar: '#3B82F6' },
  stabilizing: { label: '안정화 중', bg: '#FFFBEB', text: '#D97706', bar: '#F59E0B' },
  mastered:    { label: '완료',      bg: '#F0FDF4', text: '#16A34A', bar: '#22C55E' },
  recheck:     { label: '재확인 필요', bg: '#FEF2F2', text: '#DC2626', bar: '#EF4444' },
}

const OVERRIDE_BUTTONS = [
  { value: 'uncertain',    label: '아직 불안해요',        emoji: '😅' },
  { value: 'confident',    label: '어느 정도 잡았어요',   emoji: '💪' },
  { value: 'needs_review', label: '다시 봐야 해요',       emoji: '🔄' },
]

// ── MasteryCard (개별 카드) ──────────────────────────────
function MasteryCard({ item, userId, onOverrideChange }) {
  const [expanded, setExpanded] = useState(false)
  const [saving, setSaving]     = useState(false)
  const cfg = STATUS_CONFIG[item.status] ?? STATUS_CONFIG.not_started

  async function handleOverride(value) {
    if (saving) return
    setSaving(true)
    try {
      const next = item.userOverride === value ? null : value  // 토글
      await setUserOverride(userId, item.code, item.name, next)
      onOverrideChange()
    } catch (e) {
      console.error('마스터리 저장 실패:', e)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      style={{
        background: cfg.bg,
        border: `1.5px solid ${item.status === 'recheck' ? '#FCA5A5' : '#E5E7EB'}`,
        borderRadius: 14,
        marginBottom: 10,
        overflow: 'hidden',
        transition: 'box-shadow 0.15s',
      }}
    >
      {/* 카드 헤더 */}
      <button
        onClick={() => setExpanded((v) => !v)}
        style={{
          width: '100%', textAlign: 'left', background: 'none',
          border: 'none', padding: '14px 16px', cursor: 'pointer',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {/* 상태 배지 */}
            <span style={{
              fontSize: 11, fontWeight: 700, padding: '3px 8px',
              borderRadius: 20, color: cfg.text,
              background: item.status === 'recheck' ? '#FEE2E2'
                : item.status === 'mastered'    ? '#DCFCE7'
                : item.status === 'stabilizing' ? '#FEF3C7'
                : item.status === 'in_progress' ? '#DBEAFE'
                : '#F3F4F6',
            }}>
              {cfg.label}
            </span>
            <span style={{ fontSize: 15, fontWeight: 600, color: '#111827' }}>{item.name}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {item.totalAttempts > 0 && (
              <span style={{ fontSize: 13, color: '#6B7280' }}>
                {Math.round(item.accuracyRate * 100)}%
              </span>
            )}
            <span style={{ fontSize: 12, color: '#9CA3AF' }}>{expanded ? '▲' : '▼'}</span>
          </div>
        </div>

        {/* 진행 바 */}
        {item.totalAttempts >= 3 && (
          <div style={{ marginTop: 8, background: '#E5E7EB', borderRadius: 4, height: 5 }}>
            <div style={{
              width: `${item.autoScore}%`, background: cfg.bar,
              borderRadius: 4, height: '100%', transition: 'width 0.4s',
            }} />
          </div>
        )}
        {item.totalAttempts > 0 && (
          <div style={{ marginTop: 4, fontSize: 11, color: '#9CA3AF' }}>
            총 {item.totalAttempts}회 시도 · 정확도 {Math.round(item.accuracyRate * 100)}%
          </div>
        )}
      </button>

      {/* 확장 영역 */}
      {expanded && (
        <div style={{ padding: '0 16px 14px', borderTop: '1px solid #E5E7EB' }}>
          {/* 코치 힌트 */}
          <p style={{
            margin: '12px 0 14px', fontSize: 13, color: '#374151',
            lineHeight: 1.5, background: '#F9FAFB', borderRadius: 8,
            padding: '10px 12px',
          }}>
            💬 {item.coachHint}
          </p>

          {/* 수동 체크 버튼 */}
          <p style={{ fontSize: 11, color: '#6B7280', marginBottom: 8 }}>내 체감 상태</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {OVERRIDE_BUTTONS.map((btn) => {
              const active = item.userOverride === btn.value
              return (
                <button
                  key={btn.value}
                  onClick={() => handleOverride(btn.value)}
                  disabled={saving}
                  style={{
                    padding: '9px 14px', borderRadius: 10, cursor: 'pointer',
                    fontSize: 13, fontWeight: active ? 700 : 400,
                    textAlign: 'left',
                    background: active ? '#1D4ED8' : '#F3F4F6',
                    color:      active ? '#fff'    : '#374151',
                    border: active ? '1.5px solid #1D4ED8' : '1.5px solid transparent',
                    transition: 'all 0.15s',
                  }}
                >
                  {btn.emoji} {btn.label}
                  {active && <span style={{ float: 'right', fontSize: 11 }}>✓ 선택됨</span>}
                </button>
              )
            })}
            {item.userOverride && (
              <button
                onClick={() => handleOverride(item.userOverride)}  // 토글 해제
                disabled={saving}
                style={{
                  padding: '7px 14px', borderRadius: 10, cursor: 'pointer',
                  fontSize: 12, color: '#6B7280', background: 'none',
                  border: '1px dashed #D1D5DB', textAlign: 'center',
                }}
              >
                선택 초기화
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ── MasteryBoard (메인) ──────────────────────────────────
export default function MasteryBoard({ userId }) {
  const [items, setItems]   = useState([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!userId) return
    setLoading(true)
    const data = await getMasteryBoard(userId)
    setItems(data)
    setLoading(false)
  }, [userId])

  useEffect(() => { load() }, [load])

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: 48, color: '#6B7280', fontSize: 14 }}>
        체크리스트 불러오는 중…
      </div>
    )
  }

  if (!items.length) {
    return (
      <div style={{ textAlign: 'center', padding: 48 }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>📋</div>
        <p style={{ color: '#6B7280', fontSize: 14, lineHeight: 1.6 }}>
          아직 오답 데이터가 없어요.<br />
          오답을 3개 이상 등록하면 체크리스트가 생성돼요!
        </p>
      </div>
    )
  }

  const masteredCount = items.filter((i) => i.status === 'mastered').length
  const recheckCount  = items.filter((i) => i.status === 'recheck').length

  return (
    <div style={{ padding: '0 4px' }}>
      {/* 진행 요약 */}
      <div style={{
        background: '#F9FAFB', borderRadius: 14, padding: '14px 18px',
        marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div>
          <div style={{ fontSize: 13, color: '#6B7280', marginBottom: 2 }}>약점 마스터 현황</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: '#111827' }}>
            {masteredCount}
            <span style={{ fontSize: 14, fontWeight: 400, color: '#6B7280' }}>
              &nbsp;/ {items.length}개 완료
            </span>
          </div>
        </div>
        {recheckCount > 0 && (
          <div style={{
            background: '#FEE2E2', borderRadius: 20, padding: '6px 12px',
            fontSize: 12, fontWeight: 700, color: '#DC2626',
          }}>
            ⚠️ 재확인 {recheckCount}개
          </div>
        )}
      </div>

      {/* 마스터리 카드 목록 */}
      {items.map((item) => (
        <MasteryCard
          key={item.code}
          item={item}
          userId={userId}
          onOverrideChange={load}
        />
      ))}

      <p style={{ fontSize: 11, color: '#9CA3AF', textAlign: 'center', marginTop: 12 }}>
        상태는 오답 데이터 기반 자동 판정 + 내 체감 상태로 결정돼요
      </p>
    </div>
  )
}
