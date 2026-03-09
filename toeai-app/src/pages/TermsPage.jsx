import { Link } from 'react-router-dom'
import PublicLayout from '../components/PublicLayout'
import { siteBusinessInfo as bi } from '../config/siteBusinessInfo'

const Section = ({ title, children }) => (
  <section style={{ marginBottom: 32 }}>
    <h2 style={{ fontSize: 17, fontWeight: 700, color: '#111827', marginBottom: 10 }}>{title}</h2>
    <div style={{ fontSize: 14, color: '#374151', lineHeight: 1.8 }}>{children}</div>
  </section>
)

export default function TermsPage() {
  return (
    <PublicLayout>
      <h1 style={{ fontSize: 24, fontWeight: 800, color: '#111827', marginBottom: 8 }}>이용약관</h1>
      <p style={{ fontSize: 13, color: '#6B7280', marginBottom: 32 }}>시행일: 2026년 3월 9일</p>

      <Section title="제1조 (목적)">
        <p>
          이 약관은 {bi.serviceName}(이하 "서비스")이 제공하는 교육용 소프트웨어 및 디지털 콘텐츠 서비스의
          이용 조건 및 절차, 기타 필요한 사항을 규정함을 목적으로 합니다.
        </p>
      </Section>

      <Section title="제2조 (서비스 정의)">
        <p>
          {bi.serviceName}은 토익 학습을 돕기 위한 교육용 소프트웨어 및 디지털 콘텐츠 서비스입니다.
          회원은 본 서비스를 이용하여 오답 문제 분석, 약점 진단, 학습 전략 제안 기능을 사용할 수 있습니다.
        </p>
        <p style={{ marginTop: 8 }}>
          본 서비스는 학원 강의, 실시간 교습, 1:1 과외 등 교습 서비스가 아닌
          사용자 입력 데이터를 기반으로 학습 전략을 제안하는 교육용 소프트웨어입니다.
        </p>
      </Section>

      <Section title="제3조 (회원 가입 및 계정 관리)">
        <p>1. 회원 가입은 소셜 로그인(Google 등)을 통해 이루어집니다.</p>
        <p>2. 회원은 자신의 계정 정보를 안전하게 관리할 의무가 있습니다.</p>
        <p>3. 타인의 정보를 이용한 가입 및 서비스 이용은 금지됩니다.</p>
        <p>4. 회원 탈퇴 시 개인정보는 관련 법령에 따라 처리됩니다.</p>
      </Section>

      <Section title="제4조 (서비스 이용 범위)">
        <p>1. 무료 회원: 오답 5문제 체험, 기본 분석 기능 제공</p>
        <p>2. 유료 회원: 이용권 구매 후 무제한 오답 분석, AI 코치, D-day 압축 전략 등 전체 기능 이용 가능</p>
        <p>3. 서비스 이용 범위는 플랜별로 상이하며 사전 고지 후 변경될 수 있습니다.</p>
      </Section>

      <Section title="제5조 (결제 및 이용권)">
        <p>1. 이용권은 결제 완료 즉시 활성화됩니다.</p>
        <p>2. 이용권은 기간제이며 만료 후 자동 갱신되지 않습니다.</p>
        <p>3. 이용권 기간 중 서비스 이용이 불가한 경우 회사에 문의할 수 있습니다.</p>
        <p>4. 환불에 관한 사항은 <Link to="/refund-policy" style={{ color: '#1D4ED8' }}>환불 규정</Link>을 따릅니다.</p>
      </Section>

      <Section title="제6조 (이용 제한)">
        <p>다음 행위는 금지되며, 위반 시 서비스 이용이 제한될 수 있습니다.</p>
        <p>1. 서비스 내 콘텐츠의 무단 복제, 배포, 상업적 이용</p>
        <p>2. 자동화 도구(봇, 크롤러 등)를 이용한 서비스 이용</p>
        <p>3. 타인의 개인정보를 무단으로 수집하거나 이용하는 행위</p>
        <p>4. 서비스의 정상적인 운영을 방해하는 행위</p>
      </Section>

      <Section title="제7조 (서비스 변경 및 중단)">
        <p>
          회사는 서비스의 내용을 변경하거나 중단할 수 있으며, 중요 변경 시 사전에 공지합니다.
          서비스 중단으로 인한 손해에 대해 회사는 고의 또는 중과실이 없는 한 책임을 지지 않습니다.
        </p>
      </Section>

      <Section title="제8조 (면책 조항)">
        <p>
          {bi.serviceName}은 AI 기반 학습 전략 제안 서비스로, 제안된 전략이 실제 시험 점수 향상을
          보장하지 않습니다. 서비스 이용 결과에 대한 책임은 이용자 본인에게 있습니다.
        </p>
      </Section>

      <Section title="제9조 (문의처)">
        <p>이메일: {bi.supportEmail}</p>
        <p>운영시간: 평일 10:00 ~ 18:00</p>
      </Section>

      <Section title="제10조 (준거법 및 관할)">
        <p>
          본 약관은 대한민국 법률에 따라 규율되며, 서비스 이용과 관련한 분쟁은
          서울중앙지방법원을 제1심 관할법원으로 합니다.
        </p>
      </Section>
    </PublicLayout>
  )
}
