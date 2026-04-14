'use client'
import { useState, useEffect } from 'react'

const C = {
  bg: '#07070f',
  card: 'rgba(255,255,255,0.03)',
  border: 'rgba(255,255,255,0.07)',
  purple: '#8b5cf6',
  purpleLight: '#a78bfa',
  green: '#22c55e',
  textPrimary: '#f0f0ff',
  textSecondary: '#9090a8',
  textDim: 'rgba(255,255,255,0.25)',
}

export default function LandingPage() {
  const [user, setUser] = useState(null)
  const [topic, setTopic] = useState('')
  const [intent, setIntent] = useState('Informational')
  const [msg, setMsg] = useState('')

  useEffect(() => {
    fetch('/api/auth/me').then(r => r.json()).then(data => {
      if (data.user) setUser(data.user)
    })
  }, [])

  const handleCreate = () => {
    if (!user) {
      setMsg('Please sign in to start creating your blog.')
      setTimeout(() => setMsg(''), 4000)
      return
    }
    window.location.href = '/dashboard'
  }

  return (
    <div style={{ minHeight: '100vh', background: C.bg, color: C.textPrimary, fontFamily: 'Inter, sans-serif' }}>
      {/* Header */}
      <nav style={{ borderBottom: `1px solid ${C.border}`, backdropFilter: 'blur(10px)', position: 'sticky', top: 0, zIndex: 10 }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontWeight: 900, fontSize: 20 }}>✍️ <span style={{ color: C.purple }}>SEO</span> Blog Writer</div>
          <div style={{ display: 'flex', gap: 20, alignItems: 'center' }}>
            {user ? (
              <a href="/dashboard" style={{ color: C.purpleLight, textDecoration: 'none', fontWeight: 600 }}>{user.email}</a>
            ) : (
              <button onClick={() => window.location.href = '/login'} style={{ background: 'transparent', border: 'none', color: C.textSecondary, cursor: 'pointer', fontWeight: 600 }}>Sign In</button>
            )}
            <button onClick={() => window.location.href = user ? '/dashboard' : '/login'} style={{ background: C.purple, color: '#fff', border: 'none', padding: '8px 20px', borderRadius: 8, fontWeight: 700, cursor: 'pointer' }}>
              {user ? 'My Account' : 'Sign Up'}
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <main style={{ maxWidth: 900, margin: '80px auto', textAlign: 'center', padding: '0 20px' }}>
        <h1 style={{ fontSize: '3.5rem', fontWeight: 900, marginBottom: 16, background: 'linear-gradient(to right, #fff, #8b5cf6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          Automate Your Content Engine
        </h1>
        <p style={{ color: C.textSecondary, fontSize: '1.1rem', marginBottom: 48, maxWidth: 600, margin: '0 auto 48px' }}>
          Generate SEO-optimized, human-grade blogs in seconds. Select your intent, enter your topic, and let AI do the heavy lifting.
        </p>

        {/* The Action Bar */}
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 24, padding: '32px', boxShadow: '0 20px 50px rgba(0,0,0,0.5)', position: 'relative' }}>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <input 
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="Enter your blog topic (e.g. Best SEO Tools 2026)" 
              style={{ flex: 2, background: 'rgba(0,0,0,0.2)', border: `1px solid ${C.border}`, padding: '16px 20px', borderRadius: 12, color: '#fff', outline: 'none' }}
            />
            <select 
              value={intent}
              onChange={(e) => setIntent(e.target.value)}
              style={{ flex: 1, background: 'rgba(0,0,0,0.2)', border: `1px solid ${C.border}`, padding: '16px 20px', borderRadius: 12, color: '#fff', outline: 'none' }}
            >
              <option>Informational</option>
              <option>Commercial</option>
              <option>Transactional</option>
            </select>
            <button 
              onClick={handleCreate}
              style={{ flex: 1, background: `linear-gradient(135deg, ${C.purple}, ${C.purpleLight})`, border: 'none', padding: '16px', borderRadius: 12, color: '#fff', fontWeight: 800, cursor: 'pointer' }}
            >
              Create Blog →
            </button>
          </div>
          
          {msg && (
            <div style={{ marginTop: 16, color: C.purpleLight, fontSize: 14, fontWeight: 500, animation: 'fadeIn 0.3s' }}>
              ✨ {msg}
            </div>
          )}
        </div>

        <div style={{ marginTop: 60, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24 }}>
          {['AI Bypass', 'SEO Optimized', 'WP Integration'].map(feature => (
            <div key={feature} style={{ padding: '20px', background: C.card, borderRadius: 16, border: `1px solid ${C.border}`, fontSize: 14, color: C.textSecondary }}>
              {feature}
            </div>
          ))}
        </div>
      </main>

      <style jsx>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  )
}