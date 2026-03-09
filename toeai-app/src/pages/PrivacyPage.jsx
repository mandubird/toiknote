import PublicLayout from '../components/PublicLayout'
import { siteBusinessInfo as bi } from '../config/siteBusinessInfo'

const Section = ({ title, children }) => (
  <section style={{ marginBottom: 32 }}>
    <h2 style={{ fontSize: 17, fontWeight: 700, color: '#111827', marginBottom: 10 }}>{title}</h2>
    <div style={{ fontSize: 14, color: '#374151', lineHeight: 1.8 }}>{children}</div>
  </section>
)

export default function PrivacyPage() {
  return (
    <PublicLayout>
      <h1 style={{ fontSize: 24, fontWeight: 800, color: '#111827', marginBottom: 8 }}>개인정보처리방침</h1>
      <p style={{ fontSize: 13, color: '#6B7280', marginBottom: 32 }}>시행일: 2026년 3월 9일</p>

      <p style={{ fontSize: 14, color: '#374151', lineHeight: 1.8, marginBottom: 32 }}>
        {bi.serviceName}(이하 "서비스")은 이용자의 개인정보를 중요시하며,
        「개인정보 보호법」 및 관련 법령을 준수합니다.
      </p>

      <Section title="1. 수집하는 개인정보 항목">
        <p><strong>필수 수집 항목</strong></p>
        <p>- 이메일 주소 (소셜 로그인 통해 수집)</p>
        <p>- 닉네임 또는 이름</p>
        <p>- 서비스 이용 기록(오답 입력 및 학습 데이터)</p>
        <p style={{ marginTop: 8 }}><strong>결제 관련</strong></p>
        <p>- 결제 수단 자체는 PG사(포트원)에서 처리되며, 서비스는 결제 완료 정보(플랜, 결제일, 금액)만 저장합니다.</p>
        <p style={{ marginTop: 8 }}><strong>자동 수집 항목</strong></p>
        <p>- 접속 로그, 접속 기기 정보 (서비스 개선 목적)</p>
      </Section>

      <Section title="2. 수집 방법">
        <p>- 소셜 로그인(Google OAuth) 통한 자동 수집</p>
        <p>- 서비스 이용 과정에서 사용자 직접 입력</p>
        <p>- 결제 완료 후 PG사로부터 결제 결과 수신</p>
      </Section>

      <Section title="3. 이용 목적">
        <p>- 서비스 제공 및 회원 관리</p>
        <p>- 오답 분석, 약점 진단, 학습 전략 제안</p>
        <p>- 이용 요금 청구 및 결제 확인</p>
        <p>- 고객 문의 대응</p>
        <p>- 서비스 개선 및 통계 분석</p>
      </Section>

      <Section title="4. 보관 기간">
        <p>- 회원 탈퇴 시까지 보관 후 지체 없이 삭제</p>
        <p>- 단, 관련 법령에 따라 일정 기간 보관이 필요한 경우 해당 기간 동안 보관</p>
        <p style={{ marginTop: 8 }}>
          전자상거래 등에서의 소비자보호에 관한 법률 기준:
        </p>
        <p>- 계약 또는 청약철회 기록: 5년</p>
        <p>- 대금결제 및 재화 공급 기록: 5년</p>
        <p>- 소비자 불만 및 분쟁처리 기록: 3년</p>
      </Section>

      <Section title="5. 제3자 제공">
        <p>서비스는 이용자의 개인정보를 원칙적으로 제3자에게 제공하지 않습니다.</p>
        <p>단, 아래의 경우에는 예외로 합니다:</p>
        <p>- 이용자가 사전에 동의한 경우</p>
        <p>- 법령에 의거하거나 수사기관의 요청이 있는 경우</p>
      </Section>

      <Section title="6. 처리 위탁">
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: '#F3F4F6' }}>
              <th style={{ padding: '8px 12px', textAlign: 'left', border: '1px solid #E5E7EB' }}>수탁사</th>
              <th style={{ padding: '8px 12px', textAlign: 'left', border: '1px solid #E5E7EB' }}>위탁 업무</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={{ padding: '8px 12px', border: '1px solid #E5E7EB' }}>포트원(주)</td>
              <td style={{ padding: '8px 12px', border: '1px solid #E5E7EB' }}>결제 처리</td>
            </tr>
            <tr>
              <td style={{ padding: '8px 12px', border: '1px solid #E5E7EB' }}>Supabase Inc.</td>
              <td style={{ padding: '8px 12px', border: '1px solid #E5E7EB' }}>데이터베이스 운영</td>
            </tr>
            <tr>
              <td style={{ padding: '8px 12px', border: '1px solid #E5E7EB' }}>Google LLC</td>
              <td style={{ padding: '8px 12px', border: '1px solid #E5E7EB' }}>소셜 로그인(OAuth)</td>
            </tr>
          </tbody>
        </table>
      </Section>

      <Section title="7. 이용자 권리">
        <p>이용자는 언제든지 다음 권리를 행사할 수 있습니다:</p>
        <p>- 개인정보 열람 요청</p>
        <p>- 개인정보 정정·삭제 요청</p>
        <p>- 개인정보 처리 정지 요청</p>
        <p>- 서비스 탈퇴 (계정 내 설정에서 가능)</p>
      </Section>

      <Section title="8. 문의처">
        <p>개인정보 관련 문의: {bi.supportEmail}</p>
        <p>운영시간: 평일 10:00 ~ 18:00</p>
      </Section>
    </PublicLayout>
  )
}
