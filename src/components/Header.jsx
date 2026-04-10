'use client'

import Link from 'next/link'
import { SignInButton, SignUpButton, UserButton, useUser } from '@clerk/nextjs'

export default function Header() {
  const { isSignedIn } = useUser()

  return (
    <header style={{ position:'sticky', top:0, zIndex:100, background:'rgba(7,7,15,0.94)', backdropFilter:'blur(14px)', borderBottom:'1px solid rgba(255,255,255,0.08)' }}>
      <div style={{ maxWidth:960, margin:'0 auto', padding:'18px 20px', display:'flex', alignItems:'center', gap:12 }}>
        <a href="/" style={{ display:'flex', alignItems:'center', gap:10, textDecoration:'none' }}>
          <div style={{ width:32, height:32, borderRadius:10, background:'linear-gradient(135deg,#7c3aed,#a855f7)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:18 }}>✍</div>
          <div style={{ lineHeight:1.1 }}>
            <div style={{ fontWeight:900, fontSize:18, color:'#f0f0ff' }}><span style={{ color:'#8b5cf6' }}>SEO</span> <span style={{ fontWeight:500, fontSize:16, color:'#a0a0b0' }}>Blog Writer</span></div>
            <div style={{ fontSize:11, color:'rgba(255,255,255,0.2)', letterSpacing:0.8 }}>AI-powered content in minutes</div>
          </div>
        </a>

        <div style={{ marginLeft:'auto', display:'flex', alignItems:'center', gap:10 }}>
          {isSignedIn ? (
            <UserButton afterSignOutUrl="/" />
          ) : (
            <>
              <SignInButton mode="modal">
                <button style={{ padding:'8px 18px', borderRadius:8, border:'1px solid rgba(255,255,255,0.15)', background:'transparent', color:'#f0f0ff', cursor:'pointer', fontSize:13 }}>
                  Sign In
                </button>
              </SignInButton>
              <SignUpButton mode="modal">
                <button style={{ padding:'8px 18px', borderRadius:8, border:'none', background:'linear-gradient(135deg,#7c3aed,#a855f7)', color:'#fff', cursor:'pointer', fontSize:13, fontWeight:700 }}>
                  Sign Up
                </button>
              </SignUpButton>
            </>
          )}
        </div>
      </div>
    </header>
  )
}