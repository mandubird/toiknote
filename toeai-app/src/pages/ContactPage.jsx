import { useState } from 'react'
import PublicLayout from '../components/PublicLayout'
import { siteBusinessInfo as bi } from '../config/siteBusinessInfo'

const INQUIRY_TYPES = ['서비스 이용 문의', '결제/환불 문의', '기술 지원', '기타']

export default function ContactPage() {
  const [form, setForm] = useState({ name: '', email: '', type: '', orderId: '', content: '' })

  function handleChange(e) {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }))
  }

  function handleSubmit(e) {
    e.preventDefault()
    const subject = encodeURIComponent(`[${form.type || '문의'}] ${form.name}`)
    const body = encodeURIComponent(
      `이름: ${form.name}\n이메일: ${form.email}\n문의유형: ${form.type}\n주문번호: ${form.orderId || '없음'}\n\n내용:\n${form.content}`
    )
    window.location.href = `mailto:${bi.supportEmail}?subject=${subject}&body=${body}`
  }

  const inputStyle = {
    width: '100%', padding: '10px 12px', borderRadius: 8,
    border: '1.5px solid #E5E7EB', fontSize: 14, outline: 'none',
    boxSizing: 'border-box',
  }

  return (
    <PublicLayout>
      <h1 style={{ fontSize: 24, fontWeight: 800, color: '#111827', marginBottom: 8 }}>고객문의</h1>
      <p style={{ fontSize: 14, color: '#6B7280', marginBottom: 28, lineHeight: 1.7 }}>
        토답 이용 중 궁금한 점이나 결제·환불·서비스 관련 문의는 아래 채널로 문의해 주세요.
      </p>

      {/* 연락처 정보 */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 32 }}>
        {[
          { icon: '📧', label: '이메일', value: bi.supportEmail, href: `mailto:${bi.supportEmail}` },
          { icon: '🕐', label: '운영시간', value: '평일 10:00 ~ 18:00', href: null },
        ].map((item) => (
          <div key={item.label} style={{
            background: '#F9FAFB', borderRadius: 12, padding: '16px 18px',
            border: '1px solid #E5E7EB',
          }}>
            <div style={{ fontSize: 20, marginBottom: 6 }}>{item.icon}</div>
            <div style={{ fontSize: 11, color: '#9CA3AF', marginBottom: 2 }}>{item.label}</div>
            {item.href ? (
              <a href={item.href} style={{ fontSize: 13, color: '#1D4ED8', fontWeight: 600, wordBreak: 'break-all' }}>
                {item.value}
              </a>
            ) : (
              <div style={{ fontSize: 13, color: '#374151', fontWeight: 600 }}>{item.value}</div>
            )}
          </div>
        ))}
      </div>

      {/* 문의 폼 */}
      <div style={{ background: '#fff', border: '1.5px solid #E5E7EB', borderRadius: 16, padding: '24px 20px' }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 20 }}>문의 폼</h2>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={{ fontSize: 12, color: '#6B7280', display: 'block', marginBottom: 4 }}>이름 *</label>
              <input name="name" required value={form.name} onChange={handleChange}
                placeholder="홍길동" style={inputStyle} />
            </div>
            <div>
              <label style={{ fontSize: 12, color: '#6B7280', display: 'block', marginBottom: 4 }}>이메일 *</label>
              <input name="email" type="email" required value={form.email} onChange={handleChange}
                placeholder="example@email.com" style={inputStyle} />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={{ fontSize: 12, color: '#6B7280', display: 'block', marginBottom: 4 }}>문의 유형 *</label>
              <select name="type" required value={form.type} onChange={handleChange} style={inputStyle}>
                <option value="">선택하세요</option>
                {INQUIRY_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: 12, color: '#6B7280', display: 'block', marginBottom: 4 }}>주문번호 (선택)</label>
              <input name="orderId" value={form.orderId} onChange={handleChange}
                placeholder="결제 관련 문의 시 입력" style={inputStyle} />
            </div>
          </div>

          <div>
            <label style={{ fontSize: 12, color: '#6B7280', display: 'block', marginBottom: 4 }}>문의 내용 *</label>
            <textarea name="content" required value={form.content} onChange={handleChange}
              rows={5} placeholder="문의 내용을 자세히 작성해 주세요."
              style={{ ...inputStyle, resize: 'vertical' }} />
          </div>

          <button type="submit" style={{
            padding: '12px', borderRadius: 10, background: '#1D4ED8', color: '#fff',
            border: 'none', fontSize: 14, fontWeight: 700, cursor: 'pointer',
          }}>
            이메일로 문의하기
          </button>
        </form>
      </div>
    </PublicLayout>
  )
}
