'use client'
import { useState } from 'react'
import AuthModal from './AuthModal'

export default function Header({ user, onAuthChange }) {
  const [showAuth, setShowAuth] = useState(false)

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    onAuthChange(null)
  }

  return (
    <>
      <header style={{ position:'sticky', top:0, zIndex:100, background:'rgba(7,7,15,0.94)', backdropFilter:'blur(14px)', borderBottom:'1px solid rgba(255,255,255,0.08)' }}>
        <div style={{ maxWidth:960, margin:'0 auto', padding:'16px 20px', display:'flex', alignItems:'center', gap:12 }}>
          <a href="/" style={{ display:'flex', alignItems:'center', gap:10, textDecoration:'none' }}>
            <div style={{ width:32, height:32, borderRadius:10, background:'linear-gradient(135deg,#7c3aed,#a855f7)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:18 }}>✍</div>
            <div style={{ lineHeight:1.1 }}>
              <div style={{ fontWeight:900, fontSize:18, color:'#f0f0ff' }}><span style={{ color:'#8b5cf6' }}>SEO</span> <span style={{ fontWeight:500, fontSize:16, color:'#a0a0b0' }}>Blog Writer</span></div>
              <div style={{ fontSize:11, color:'rgba(255,255,255,0.2)', letterSpacing:0.8 }}>AI-powered content in minutes</div>
            </div>
          </a>

          <div style={{ marginLeft:'auto', display:'flex', alignItems:'center', gap:10 }}>
            {user ? (
              <>
                <a href="/dashboard" style={{ padding:'8px 16px', borderRadius:8, border:'1px solid rgba(255,255,255,0.1)', background:'rgba(255,255,255,0.04)', color:'#f0f0ff', textDecoration:'none', fontSize:13 }}>
                  Dashboard
                </a>
                <div style={{ display:'flex', alignItems:'center', gap:8, padding:'6px 12px', borderRadius:8, background:'rgba(139,92,246,0.1)', border:'1px solid rgba(139,92,246,0.2)' }}>
                  <div style={{ width:24, height:24, borderRadius:'50%', background:'linear-gradient(135deg,#7c3aed,#a855f7)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, color:'#fff', fontWeight:700 }}>
                    {user.email?.[0]?.toUpperCase()}
                  </div>
                  <span style={{ fontSize:13, color:'#a78bfa' }}>{user.name || user.email?.split('@')[0]}</span>
                  <span style={{ fontSize:11, color:'rgba(255,255,255,0.3)', background:'rgba(255,255,255,0.06)', padding:'2px 7px', borderRadius:20 }}>{user.plan}</span>
                </div>
                <button onClick={logout} style={{ padding:'8px 14px', borderRadius:8, border:'1px solid rgba(255,80,80,0.2)', background:'rgba(255,80,80,0.06)', color:'#ff8080', cursor:'pointer', fontSize:13 }}>
                  Logout
                </button>
              </>
            ) : (
              <>
                <button onClick={() => setShowAuth(true)} style={{ padding:'8px 18px', borderRadius:8, border:'1px solid rgba(255,255,255,0.15)', background:'transparent', color:'#f0f0ff', cursor:'pointer', fontSize:13 }}>
                  Sign In
                </button>
                <button onClick={() => setShowAuth(true)} style={{ padding:'8px 18px', borderRadius:8, border:'none', background:'linear-gradient(135deg,#7c3aed,#a855f7)', color:'#fff', cursor:'pointer', fontSize:13, fontWeight:700 }}>
                  Sign Up Free
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      {showAuth && (
        <AuthModal
          onClose={() => setShowAuth(false)}
          onSuccess={(u) => { onAuthChange(u); setShowAuth(false) }}
        />
      )}
    </>
  )
}