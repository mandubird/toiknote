import PublicLayout from '../components/PublicLayout'
import { siteBusinessInfo as bi } from '../config/siteBusinessInfo'

const Rule = ({ num, title, children }) => (
  <div style={{ marginBottom: 20, padding: '16px 18px', background: '#F9FAFB', borderRadius: 10, borderLeft: '3px solid #3B82F6' }}>
    <p style={{ fontWeight: 700, fontSize: 14, color: '#1D4ED8', marginBottom: 6 }}>{num}. {title}</p>
    <div style={{ fontSize: 14, color: '#374151', lineHeight: 1.8 }}>{children}</div>
  </div>
)

export default function RefundPolicyPage() {
  return (
    <PublicLayout>
      <h1 style={{ fontSize: 24, fontWeight: 800, color: '#111827', marginBottom: 8 }}>교환 / 환불 / 취소 규정</h1>
      <p style={{ fontSize: 13, color: '#6B7280', marginBottom: 24 }}>시행일: 2026년 3월 9일</p>

      <div style={{ background: '#FEF3C7', borderRadius: 10, padding: '14px 18px', marginBottom: 28, fontSize: 14, color: '#92400E', lineHeight: 1.7 }}>
        <strong>중요 안내</strong><br />
        {bi.serviceName}은 교육용 소프트웨어 및 디지털 콘텐츠 서비스입니다.
        결제와 동시에 디지털 콘텐츠 제공이 시작되므로, 이용 개시 여부에 따라 환불 가능 범위가 달라집니다.
      </div>

      <Rule num="1" title="전액 환불 가능">
        결제 후 <strong>7일 이내</strong>이며, 프로그램 이용(오답 저장, AI 분석 등)을 시작하지 않은 경우
        전액 환불이 가능합니다.
      </Rule>

      <Rule num="2" title="이용 개시 후 부분 환불">
        결제 후 프로그램 이용이 시작된 경우, 이미 제공된 디지털 콘텐츠(분석 리포트, 학습 전략, AI 코치 멘트 등) 및
        이용 기간을 고려하여 환불 가능 여부와 금액이 결정됩니다.
        <br /><br />
        부분 환불 계산 기준:<br />
        잔여 이용 일수 / 전체 이용 일수 × 결제 금액 (단, 서비스 이용에 따른 일정 금액 공제 가능)
      </Rule>

      <Rule num="3" title="환불 불가 또는 제한">
        다음의 경우 환불이 제한될 수 있습니다:
        <br />- 이용 개시 후 단순 변심에 의한 환불 요청
        <br />- 결제일로부터 7일 초과 후 환불 요청
        <br />- 디지털 콘텐츠의 상당 부분이 이미 제공된 경우
      </Rule>

      <Rule num="4" title="청약철회 특례">
        전자상거래 등에서의 소비자보호에 관한 법률 제17조에 따라,
        디지털 콘텐츠의 경우 콘텐츠 제공이 개시된 경우 청약철회 권리가 제한될 수 있습니다.
        결제 시 이 사실을 충분히 인지하고 동의한 후 결제해 주시기 바랍니다.
      </Rule>

      <div style={{ background: '#EFF6FF', borderRadius: 10, padding: '16px 18px', marginTop: 8, fontSize: 14, color: '#1E40AF', lineHeight: 1.8 }}>
        <strong>환불 문의 방법</strong><br />
        아래 이메일로 문의해 주시면 영업일 기준 1~2일 이내 답변드립니다.<br />
        이메일: <a href={`mailto:${bi.supportEmail}`} style={{ color: '#1D4ED8' }}>{bi.supportEmail}</a><br />
        운영시간: 평일 10:00 ~ 18:00
      </div>
    </PublicLayout>
  )
}
