'use client'
import { useState, useEffect } from 'react'

export default function LandingPage() {
  const [user, setUser] = useState(null)

  useEffect(() => {
    fetch('/api/auth/me')
      .then(r => r.json())
      .then(data => { if (data.user) setUser(data.user) })
  }, [])

  return (
    <div style={{ minHeight: '100vh', background: '#07070f', color: '#f0f0ff', fontFamily: 'sans-serif' }}>
      {/* Navigation */}
      <nav style={{ padding: '20px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontWeight: 900, fontSize: 20 }}>✍️ <span style={{ color: '#8b5cf6' }}>SEO</span> Blog Writer</div>
          {user ? (
            <a href="/dashboard" style={{ background: '#8b5cf6', padding: '10px 20px', borderRadius: 8, textDecoration: 'none', color: '#fff', fontWeight: 600 }}>Go to Dashboard</a>
          ) : (
            <a href="/login" style={{ color: '#a78bfa', textDecoration: 'none', fontWeight: 600 }}>Sign In</a>
          )}
        </div>
      </nav>

      {/* Hero Section */}
      <main style={{ maxWidth: 800, margin: '100px auto', textAlign: 'center', padding: '0 20px' }}>
        <h1 style={{ fontSize: '3.5rem', fontWeight: 900, marginBottom: 20, lineHeight: 1.1 }}>
          Create SEO-Optimized Blogs <br/> <span style={{ color: '#8b5cf6' }}>In Seconds.</span>
        </h1>
        <p style={{ color: '#9090a8', fontSize: '1.2rem', marginBottom: 40 }}>
          Generate high-quality, long-form content that ranks. Automated research, AI detection bypass, and 1-click WordPress publishing.
        </p>
        <a href="/dashboard" style={{ background: 'linear-gradient(135deg,#7c3aed,#a855f7)', padding: '16px 40px', borderRadius: 12, fontSize: '1.1rem', textDecoration: 'none', color: '#fff', fontWeight: 700, boxShadow: '0 10px 20px rgba(124,58,237,0.3)' }}>
          Start Writing for Free →
        </a>
      </main>
    </div>
  )
}