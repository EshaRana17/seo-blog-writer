'use client'
import { useState } from 'react'

const C = {
  bg: '#07070f',
  card: 'rgba(255,255,255,0.04)',
  border: 'rgba(255,255,255,0.08)',
  purple: '#8b5cf6',
  text: '#f0f0ff',
  muted: '#9090a8',
}

export default function AuthModal({ onClose, onSuccess }) {
  const [mode, setMode] = useState('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function submit(e) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const endpoint = mode === 'login' ? '/api/auth/login' : '/api/auth/signup'
    const body = mode === 'login' ? { email, password } : { email, password, name }

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (data.error) { setError(data.error); setLoading(false); return }
      onSuccess(data.user)
    } catch {
      setError('Something went wrong. Try again.')
      setLoading(false)
    }
  }

  return (
    <div style={{ position:'fixed', inset:0, zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center', background:'rgba(0,0,0,0.7)', backdropFilter:'blur(6px)' }}>
      <div style={{ background:'#0f0f1a', border:`1px solid ${C.border}`, borderRadius:20, padding:36, width:'100%', maxWidth:420, position:'relative' }}>
        <button onClick={onClose} style={{ position:'absolute', top:16, right:16, background:'none', border:'none', color:C.muted, fontSize:20, cursor:'pointer' }}>✕</button>

        <div style={{ textAlign:'center', marginBottom:28 }}>
          <div style={{ width:44, height:44, borderRadius:12, background:'linear-gradient(135deg,#7c3aed,#a855f7)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:22, margin:'0 auto 12px' }}>✍</div>
          <h2 style={{ color:C.text, fontSize:22, fontWeight:800, margin:0 }}>
            {mode === 'login' ? 'Welcome back' : 'Create account'}
          </h2>
          <p style={{ color:C.muted, fontSize:14, marginTop:6 }}>
            {mode === 'login' ? 'Sign in to generate blogs' : 'Start writing SEO blogs today'}
          </p>
        </div>

        <form onSubmit={submit} style={{ display:'flex', flexDirection:'column', gap:14 }}>
          {mode === 'signup' && (
            <input
              placeholder="Your name (optional)"
              value={name}
              onChange={e => setName(e.target.value)}
              style={inputStyle}
            />
          )}
          <input
            type="email"
            placeholder="Email address"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            style={inputStyle}
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            style={inputStyle}
          />

          {error && (
            <div style={{ padding:'10px 14px', borderRadius:10, background:'rgba(255,80,80,0.1)', border:'1px solid rgba(255,80,80,0.2)', color:'#ff8080', fontSize:13 }}>
              {error}
            </div>
          )}

          <button type="submit" disabled={loading} style={{ height:48, borderRadius:12, border:'none', background:'linear-gradient(135deg,#7c3aed,#a855f7)', color:'#fff', fontSize:15, fontWeight:700, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1, marginTop:4 }}>
            {loading ? 'Please wait...' : mode === 'login' ? 'Sign In' : 'Create Account'}
          </button>
        </form>

        <div style={{ textAlign:'center', marginTop:20, fontSize:14, color:C.muted }}>
          {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
          <button onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setError('') }} style={{ background:'none', border:'none', color:C.purple, cursor:'pointer', fontWeight:600 }}>
            {mode === 'login' ? 'Sign up free' : 'Sign in'}
          </button>
        </div>

        {mode === 'signup' && (
          <div style={{ marginTop:16, padding:'10px 14px', borderRadius:10, background:'rgba(139,92,246,0.08)', border:'1px solid rgba(139,92,246,0.15)', fontSize:12, color:C.muted, textAlign:'center' }}>
            Free plan: 2 blogs/month. No credit card needed.
          </div>
        )}
      </div>
    </div>
  )
}

const inputStyle = {
  height: 46,
  padding: '0 14px',
  borderRadius: 10,
  background: 'rgba(255,255,255,0.05)',
  border: '1px solid rgba(255,255,255,0.1)',
  color: '#f0f0ff',
  fontSize: 14,
  outline: 'none',
}