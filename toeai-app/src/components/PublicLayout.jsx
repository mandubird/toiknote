import { Link, useNavigate } from 'react-router-dom'
import { siteBusinessInfo as bi } from '../config/siteBusinessInfo'

const NAV_LINKS = [
  { to: '/faq',     label: 'FAQ' },
  { to: '/about',   label: '소개' },
  { to: '/contact', label: '고객문의' },
]

const LEGAL_LINKS = [
  { to: '/terms',         label: '이용약관' },
  { to: '/privacy',       label: '개인정보처리방침' },
  { to: '/refund-policy', label: '환불규정' },
  { to: '/faq',           label: 'FAQ' },
  { to: '/about',         label: '소개' },
  { to: '/contact',       label: '고객문의' },
]

function PublicHeader() {
  const navigate = useNavigate()
  return (
    <header style={{
      position: 'sticky', top: 0, zIndex: 50,
      background: '#fff', borderBottom: '1px solid #E5E7EB',
      padding: '0 20px',
    }}>
      <div style={{
        maxWidth: 800, margin: '0 auto', height: 56,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        {/* 로고 */}
        <Link to="/landing" style={{ textDecoration: 'none' }}>
          <span style={{ fontSize: 20, fontWeight: 800, color: '#1D4ED8' }}>토답</span>
        </Link>

        {/* 메뉴 */}
        <nav style={{ display: 'flex', gap: 20 }}>
          {NAV_LINKS.map((l) => (
            <Link key={l.to} to={l.to} style={{
              fontSize: 13, color: '#374151', textDecoration: 'none', fontWeight: 500,
            }}>
              {l.label}
            </Link>
          ))}
        </nav>

        {/* CTA */}
        <button
          onClick={() => navigate('/')}
          style={{
            padding: '7px 14px', borderRadius: 8, background: '#1D4ED8',
            color: '#fff', border: 'none', fontSize: 13, fontWeight: 600, cursor: 'pointer',
          }}
        >
          AI 진단 시작
        </button>
      </div>
    </header>
  )
}

function PublicFooter() {
  return (
    <footer style={{
      background: '#F9FAFB', borderTop: '1px solid #E5E7EB',
      padding: '32px 20px 24px',
    }}>
      <div style={{ maxWidth: 800, margin: '0 auto' }}>
        {/* 법적 링크 */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px 16px', marginBottom: 20 }}>
          {LEGAL_LINKS.map((l) => (
            <Link key={l.to} to={l.to} style={{
              fontSize: 12, color: '#6B7280', textDecoration: 'none',
            }}>
              {l.label}
            </Link>
          ))}
        </div>

        {/* 구분선 */}
        <div style={{ borderTop: '1px solid #E5E7EB', marginBottom: 16 }} />

        {/* 사업자 정보 */}
        <div style={{ fontSize: 11, color: '#9CA3AF', lineHeight: 1.8 }}>
          <div>상호: {bi.businessName} | 대표자: {bi.ceoName}</div>
          <div>사업자등록번호: {bi.businessRegNo} | 통신판매업 신고번호: {bi.ecommerceLicenseNo}</div>
          <div>이메일: {bi.supportEmail} | 연락처: {bi.supportPhone}</div>
          <div>주소: {bi.businessAddress}</div>
          <div style={{ marginTop: 8 }}>
            © {new Date().getFullYear()} {bi.serviceName}. All rights reserved.
          </div>
        </div>
      </div>
    </footer>
  )
}

/**
 * 대외 공개 페이지용 레이아웃 (이용약관, 개인정보, 환불규정, 고객문의, FAQ, 소개)
 */
export default function PublicLayout({ children }) {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: '#fff' }}>
      <PublicHeader />
      <main style={{ flex: 1, maxWidth: 800, margin: '0 auto', width: '100%', padding: '32px 20px' }}>
        {children}
      </main>
      <PublicFooter />
    </div>
  )
}

export { PublicFooter }
