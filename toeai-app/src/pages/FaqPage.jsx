import { useState } from 'react'
import { Link } from 'react-router-dom'
import PublicLayout from '../components/PublicLayout'

const FAQ_LIST = [
  {
    q: '토답은 어떤 서비스인가요?',
    a: '토답은 사용자의 토익 오답 문제와 학습 데이터를 기반으로 예상 점수, 약점 영역, 학습 전략을 제안하는 교육용 소프트웨어입니다. 실시간 강의나 1:1 과외/교습 서비스는 제공하지 않습니다.',
  },
  {
    q: '이용권(15일/30일/60일)은 무엇인가요?',
    a: '결제일 기준 각 15일, 30일, 60일 동안 사용할 수 있는 디지털 이용권입니다. 시험일을 입력하면 남은 기간에 맞춰 전략이 압축됩니다. 만료 후 자동 갱신되지 않습니다.',
  },
  {
    q: '토답은 학원인가요?',
    a: '아닙니다. 토답은 사용자가 직접 학습에 활용하는 교육용 소프트웨어/디지털 콘텐츠 서비스입니다. 강사나 튜터가 개입하지 않습니다.',
  },
  {
    q: '결제 후 바로 이용할 수 있나요?',
    a: '네. 결제 완료 후 즉시 이용 가능합니다. 별도의 승인 절차가 없습니다.',
  },
  {
    q: '환불은 어떻게 되나요?',
    a: null,  // 환불 규정 링크 처리
  },
  {
    q: '시험일은 변경할 수 있나요?',
    a: '가능합니다. 설정 메뉴에서 시험일을 변경하면 D-day 압축 전략이 자동으로 다시 계산됩니다.',
  },
  {
    q: 'LC 오답 원인은 어떻게 분석하나요?',
    a: 'LC는 오디오 기반 특성상 AI가 직접 원인을 파악하기 어렵습니다. 오답 등록 시 사용자가 오답 원인(발음혼동, 우회답변 등)을 직접 선택하면, 이를 기반으로 LC 취약 패턴이 분석됩니다.',
  },
]

function FaqItem({ item, index }) {
  const [open, setOpen] = useState(false)
  return (
    <div style={{ borderBottom: '1px solid #E5E7EB' }}>
      <button
        onClick={() => setOpen((v) => !v)}
        style={{
          width: '100%', textAlign: 'left', padding: '16px 4px',
          background: 'none', border: 'none', cursor: 'pointer',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}
      >
        <span style={{ fontSize: 14, fontWeight: 600, color: '#111827', paddingRight: 12 }}>
          Q{index + 1}. {item.q}
        </span>
        <span style={{ color: '#6B7280', fontSize: 16, flexShrink: 0 }}>{open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <div style={{ padding: '0 4px 16px', fontSize: 14, color: '#374151', lineHeight: 1.8 }}>
          {item.a ? item.a : (
            <>
              환불 정책은 <Link to="/refund-policy" style={{ color: '#1D4ED8' }}>환불 규정 페이지</Link>를 확인해 주세요.
              결제 후 7일 이내 미이용 시 전액 환불이 가능합니다.
            </>
          )}
        </div>
      )}
    </div>
  )
}

export default function FaqPage() {
  return (
    <PublicLayout>
      <h1 style={{ fontSize: 24, fontWeight: 800, color: '#111827', marginBottom: 8 }}>자주 묻는 질문</h1>
      <p style={{ fontSize: 14, color: '#6B7280', marginBottom: 28 }}>
        결제 전 불안한 점을 미리 확인해 보세요.
      </p>

      <div style={{ border: '1.5px solid #E5E7EB', borderRadius: 14, padding: '0 20px', overflow: 'hidden' }}>
        {FAQ_LIST.map((item, i) => (
          <FaqItem key={i} item={item} index={i} />
        ))}
      </div>

      <div style={{ marginTop: 24, padding: '16px 18px', background: '#EFF6FF', borderRadius: 12, fontSize: 14, color: '#1E40AF' }}>
        해결되지 않은 문의는 <Link to="/contact" style={{ color: '#1D4ED8', fontWeight: 600 }}>고객문의</Link> 페이지를 이용해 주세요.
      </div>
    </PublicLayout>
  )
}
