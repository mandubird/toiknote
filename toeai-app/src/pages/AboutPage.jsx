import { useNavigate } from 'react-router-dom'
import PublicLayout from '../components/PublicLayout'

export default function AboutPage() {
  const navigate = useNavigate()
  return (
    <PublicLayout>
      <h1 style={{ fontSize: 24, fontWeight: 800, color: '#111827', marginBottom: 8 }}>토답 소개</h1>
      <p style={{ fontSize: 14, color: '#6B7280', marginBottom: 32 }}>교육용 소프트웨어 · 디지털 콘텐츠 서비스</p>

      <div style={{ fontSize: 15, color: '#374151', lineHeight: 1.9, marginBottom: 28 }}>
        <p>
          토답은 토익 오답 문제를 보다 구조적으로 정리하고,
          사용자의 약점을 파악해 학습 전략을 제안하는 교육용 소프트웨어입니다.
        </p>
        <p style={{ marginTop: 16 }}>
          많은 수험생이 오답은 쌓이지만<br />
          무엇을 먼저 고쳐야 하는지 모른 채 시간을 낭비합니다.
        </p>
        <p style={{ marginTop: 16 }}>
          토답은 이 문제를 해결하기 위해<br />
          오답 태그, 약점 분석, 시험일까지의 전략 제안 기능을 제공합니다.
        </p>
      </div>

      {/* 핵심 기능 카드 */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 32 }}>
        {[
          { icon: '📸', title: '오답 사진 업로드', desc: '카메라 한 장으로 AI가 유형·파트·태그 자동 분류' },
          { icon: '🔍', title: '약점 진단', desc: '오답 패턴 분석으로 핵심 약점 자동 도출' },
          { icon: '📅', title: 'D-day 압축 전략', desc: '시험일까지 남은 기간에 맞춘 학습 우선순위 제안' },
          { icon: '🤖', title: 'AI 코치', desc: 'D-day 기반 4블록 맞춤 코칭 멘트 제공' },
        ].map((item) => (
          <div key={item.title} style={{
            background: '#F9FAFB', borderRadius: 12, padding: '16px 14px',
            border: '1px solid #E5E7EB',
          }}>
            <div style={{ fontSize: 24, marginBottom: 8 }}>{item.icon}</div>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#111827', marginBottom: 4 }}>{item.title}</div>
            <div style={{ fontSize: 12, color: '#6B7280', lineHeight: 1.6 }}>{item.desc}</div>
          </div>
        ))}
      </div>

      {/* 포지셔닝 명확화 */}
      <div style={{ background: '#FEF3C7', borderRadius: 12, padding: '16px 18px', marginBottom: 28, fontSize: 13, color: '#92400E', lineHeight: 1.8 }}>
        <strong>⚠️ 서비스 성격 안내</strong><br />
        토답은 학원/교습 서비스가 아니라,
        사용자가 자기 학습을 더 효율적으로 할 수 있도록 돕는 <strong>디지털 학습 도구</strong>입니다.
        강사·튜터가 개입하지 않으며, 학습 결과는 사용자의 자율적 학습에 달려 있습니다.
      </div>

      <button
        onClick={() => navigate('/')}
        style={{
          width: '100%', padding: '14px', borderRadius: 12, background: '#1D4ED8',
          color: '#fff', border: 'none', fontSize: 15, fontWeight: 700, cursor: 'pointer',
        }}
      >
        지금 시작하기 →
      </button>
    </PublicLayout>
  )
}
