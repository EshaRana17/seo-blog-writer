'use client'
import { useState } from 'react'
import { auth, googleProvider } from '@/lib/firebase'
import { signInWithPopup, createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile } from 'firebase/auth'

const inp = { height: 46, padding: '0 14px', borderRadius: 10, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#f0f0ff', fontSize: 14, outline: 'none', width: '100%', boxSizing: 'border-box' }

async function saveSession(user) {
  const token = await user.getIdToken()
  await fetch('/api/auth/session', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token }) })
  const meRes = await fetch('/api/auth/me')
  const meData = await meRes.json()
  return meData.user
}

export default function AuthModal({ onClose, onSuccess }) {
  const [mode, setMode] = useState('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleGoogle() {
    setLoading(true); setError('')
    try {
      const result = await signInWithPopup(auth, googleProvider)
      const dbUser = await saveSession(result.user)
      onSuccess(dbUser)
    } catch (e) { setError(e.message) }
    setLoading(false)
  }

  async function handleEmail(e) {
    e.preventDefault(); setLoading(true); setError('')
    try {
      let result
      if (mode === 'signup') {
        result = await createUserWithEmailAndPassword(auth, email, password)
        if (name) await updateProfile(result.user, { displayName: name })
      } else {
        result = await signInWithEmailAndPassword(auth, email, password)
      }
      const dbUser = await saveSession(result.user)
      onSuccess(dbUser)
    } catch (e) {
      const msg = e.code === 'auth/email-already-in-use' ? 'Email already registered' :
        e.code === 'auth/wrong-password' || e.code === 'auth/user-not-found' ? 'Invalid email or password' :
        e.code === 'auth/weak-password' ? 'Password must be at least 6 characters' : e.message
      setError(msg)
    }
    setLoading(false)
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)' }}>
      <div style={{ background: '#0f0f1a', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 20, padding: 36, width: '100%', maxWidth: 420, position: 'relative' }}>
        <button onClick={onClose} style={{ position: 'absolute', top: 16, right: 16, background: 'none', border: 'none', color: '#9090a8', fontSize: 20, cursor: 'pointer' }}>✕</button>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: 'linear-gradient(135deg,#7c3aed,#a855f7)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, margin: '0 auto 12px' }}>✍</div>
          <h2 style={{ color: '#f0f0ff', fontSize: 22, fontWeight: 800, margin: 0 }}>{mode === 'login' ? 'Welcome back' : 'Create account'}</h2>
          <p style={{ color: '#9090a8', fontSize: 14, marginTop: 6 }}>{mode === 'login' ? 'Sign in to generate blogs' : 'Start writing SEO blogs today'}</p>
        </div>

        <button onClick={handleGoogle} disabled={loading} style={{ width: '100%', height: 46, borderRadius: 10, border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.05)', color: '#f0f0ff', fontSize: 14, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 16 }}>
          <svg width='18' height='18' viewBox='0 0 24 24'><path fill='#4285F4' d='M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z'/><path fill='#34A853' d='M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z'/><path fill='#FBBC05' d='M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z'/><path fill='#EA4335' d='M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z'/></svg>
          Continue with Google
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
          <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.08)' }} />
          <span style={{ color: '#9090a8', fontSize: 12 }}>or</span>
          <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.08)' }} />
        </div>

        <form onSubmit={handleEmail} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {mode === 'signup' && <input placeholder='Your name (optional)' value={name} onChange={e => setName(e.target.value)} style={inp} />}
          <input type='email' placeholder='Email address' value={email} onChange={e => setEmail(e.target.value)} required style={inp} />
          <input type='password' placeholder='Password' value={password} onChange={e => setPassword(e.target.value)} required style={inp} />
          {error && <div style={{ padding: '10px 14px', borderRadius: 10, background: 'rgba(255,80,80,0.1)', border: '1px solid rgba(255,80,80,0.2)', color: '#ff8080', fontSize: 13 }}>{error}</div>}
          <button type='submit' disabled={loading} style={{ height: 48, borderRadius: 12, border: 'none', background: 'linear-gradient(135deg,#7c3aed,#a855f7)', color: '#fff', fontSize: 15, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1 }}>
            {loading ? 'Please wait...' : mode === 'login' ? 'Sign In' : 'Create Account'}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: 20, fontSize: 14, color: '#9090a8' }}>
          {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
          <button onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setError('') }} style={{ background: 'none', border: 'none', color: '#8b5cf6', cursor: 'pointer', fontWeight: 600 }}>
            {mode === 'login' ? 'Sign up free' : 'Sign in'}
          </button>
        </div>
      </div>
    </div>
  )
}
