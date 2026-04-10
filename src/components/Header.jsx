'use client'

import Link from 'next/link'

const C = {
  bg: '#07070f',
  border: 'rgba(255,255,255,0.08)',
  textPrimary: '#f0f0ff',
  textSecondary: '#a0a0b0',
  purple: '#8b5cf6',
  gray: 'rgba(255,255,255,0.2)',
}

export default function Header() {
  return (
    <header style={{ position: 'sticky', top: 0, zIndex: 100, background: 'rgba(7,7,15,0.94)', backdropFilter: 'blur(14px)', borderBottom: `1px solid ${C.border}` }}>
      <div style={{ maxWidth: 960, margin: '0 auto', padding: '18px 20px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <a href="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
          <div style={{ width: 32, height: 32, borderRadius: 10, background: 'linear-gradient(135deg,#7c3aed,#a855f7)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>✍</div>
          <div style={{ lineHeight: 1.1 }}>
            <div style={{ fontWeight: 900, fontSize: 18, color: C.textPrimary }}>
              <span style={{ color: C.purple }}>SEO</span> <span style={{ fontWeight: 500, fontSize: 16, color: C.textSecondary }}>Blog Writer</span>
            </div>
            <div style={{ fontSize: 11, color: C.gray, letterSpacing: 0.8 }}>AI-powered content in minutes</div>
          </div>
        </a>
      </div>
    </header>
  )
}
