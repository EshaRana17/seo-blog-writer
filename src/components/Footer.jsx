'use client'

import Link from 'next/link'

export default function Footer() {
  return (
    <footer style={{ padding: '32px 20px 40px', textAlign: 'center', color: 'rgba(255,255,255,0.6)', fontSize: 13, marginTop: 60 }}>
      <div style={{ maxWidth: 960, margin: '0 auto' }}>
        <div style={{ marginBottom: 8 }}>Developed by <a href="https://www.linkedin.com/in/esha-sabir-machinelearningengineer/" target="_blank" rel="noreferrer" style={{ color: 'rgba(255,255,255,0.85)', textDecoration: 'underline' }}>esha sabir</a></div>
        <div>© {new Date().getFullYear()} SEO Blog Writer</div>
      </div>
    </footer>
  )
}
