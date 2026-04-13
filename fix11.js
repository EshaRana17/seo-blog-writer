const fs = require('fs')

// Fix 1: next.config.js - fix COOP for Google popup
fs.writeFileSync('next.config.js', `/** @type {import('next').NextConfig} */
const nextConfig = {
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'Cross-Origin-Opener-Policy', value: 'same-origin-allow-popups' },
          { key: 'Cross-Origin-Embedder-Policy', value: 'unsafe-none' },
        ],
      },
    ]
  },
}
module.exports = nextConfig
`, 'utf8')
console.log('OK next.config.js')

// Fix 2: layout.js - check if it's rendering Header causing double header
const layoutContent = `import './globals.css'

export const metadata = {
  title: 'SEO Blog Writer - AI-Powered Content in Minutes',
  description: 'Generate 4000-word SEO-optimized blogs with real SERP research and competitor analysis.',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, padding: 0, background: '#07070f', fontFamily: '-apple-system, BlinkMacSystemFont, Segoe UI, sans-serif' }}>
        {children}
      </body>
    </html>
  )
}
`
fs.writeFileSync('src/app/layout.js', layoutContent, 'utf8')
console.log('OK layout.js - removed any duplicate header')

// Fix 3: Full polished page.js
const homePage = `'use client'
import { useState, useEffect } from 'react'
import Header from '@/components/Header'
import AuthModal from '@/components/AuthModal'

const STEPS = [
  { id: 'keywords',  icon: '🔑', label: 'Keyword Research',      desc: 'Generating long-tail & secondary keywords' },
  { id: 'meta',      icon: '🏷️',  label: 'Meta Data',             desc: 'Title, description & permalink' },
  { id: 'serp',      icon: '🔍', label: 'SERP Search',            desc: 'Scraping Google top results' },
  { id: 'scraping',  icon: '🕷️',  label: 'Page Scraping',         desc: 'Reading top 10 ranking pages' },
  { id: 'semantic',  icon: '🧠', label: 'Semantic Keywords',      desc: 'LSI & entity extraction' },
  { id: 'structure', icon: '🏗️',  label: 'Blog Structure',        desc: '10-section H1/H2/H3 plan' },
  { id: 'writing',   icon: '✍️',  label: 'Writing Blog',          desc: '400 words × 10 sections' },
  { id: 'grammar',   icon: '✅', label: 'Quality Check',          desc: 'Grammar, SEO & E-E-A-T polish' },
  { id: 'detection', icon: '🧪', label: 'AI Detection',           desc: 'Checking AI% and plagiarism risk' },
  { id: 'image',     icon: '🖼️',  label: 'Cover Image',           desc: 'AI-generated 16:9 cover' },
]

function mdToHtml(md) {
  if (!md) return ''
  return md
    .replace(/^### (.+)$/gm, '<h3 style="color:#a78bfa;font-size:16px;margin:20px 0 8px">$1</h3>')
    .replace(/^## (.+)$/gm, '<h2 style="color:#f0f0ff;font-size:20px;margin:28px 0 10px">$1</h2>')
    .replace(/^# (.+)$/gm, '<h1 style="color:#f0f0ff;font-size:26px;margin:0 0 16px">$1</h1>')
    .replace(/\\*\\*(.+?)\\*\\*/g, '<strong>$1</strong>')
    .replace(/^- (.+)$/gm, '<li style="margin:4px 0">$1</li>')
    .replace(/(<li[^>]*>.*<\\/li>\\n?)+/g, m => '<ul style="padding-left:20px;margin:12px 0">' + m + '</ul>')
    .split('\\n').map(l => l.startsWith('<') || !l.trim() ? l : '<p style="margin:0 0 14px;line-height:1.8">' + l + '</p>').join('\\n')
}

export default function Home() {
  const [user, setUser] = useState(null)
  const [showAuth, setShowAuth] = useState(false)
  const [topic, setTopic] = useState('')
  const [intent, setIntent] = useState('informational')
  const [running, setRunning] = useState(false)
  const [tab, setTab] = useState('live')
  const [steps, setSteps] = useState({})
  const [stepMsg, setStepMsg] = useState({})
  const [sections, setSections] = useState([])
  const [result, setResult] = useState({
    primaryKeyword: '', secondaryKeywords: [], metaTitle: '', metaDescription: '',
    permalink: '', semanticKeywords: [], serpData: null, structure: [],
    finalBlog: '', coverImageUrl: '', imagePrompt: '',
    aiLikelihoodPercent: null, plagiarismRiskPercent: null, qualityReasons: [],
  })
  const [error, setError] = useState('')

  useEffect(() => {
    fetch('/api/auth/me').then(r => r.json()).then(d => { if (d.user) setUser(d.user) }).catch(() => {})
  }, [])

  async function run() {
    if (!topic.trim()) return
    if (!user) { setShowAuth(true); return }
    if (running) return
    setRunning(true); setError(''); setSteps({}); setStepMsg({}); setSections([])
    setResult({ primaryKeyword: '', secondaryKeywords: [], metaTitle: '', metaDescription: '', permalink: '', semanticKeywords: [], serpData: null, structure: [], finalBlog: '', coverImageUrl: '', imagePrompt: '', aiLikelihoodPercent: null, plagiarismRiskPercent: null, qualityReasons: [] })
    setTab('live')
    try {
      const res = await fetch('/api/generate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ topic, commercialIntent: intent }) })
      if (res.status === 401) { setShowAuth(true); setRunning(false); return }
      if (!res.ok) { setError('Server error. Try again.'); setRunning(false); return }
      const reader = res.body.getReader(); const dec = new TextDecoder(); let buf = ''
      while (true) {
        const { done, value } = await reader.read(); if (done) break
        buf += dec.decode(value, { stream: true })
        const lines = buf.split('\\n'); buf = lines.pop()
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          try {
            const { event, data: p } = JSON.parse(line.slice(6))
            if (event === 'step') { setSteps(prev => ({ ...prev, [p.id]: p.status })); if (p.msg) setStepMsg(prev => ({ ...prev, [p.id]: p.msg })) }
            else if (event === 'data') setResult(prev => ({ ...prev, ...p }))
            else if (event === 'section_start') setSections(prev => { const n = [...prev]; n[p.index] = { h2: p.h2, writing: true }; return n })
            else if (event === 'section_done') setSections(prev => { const n = [...prev]; n[p.index] = { ...n[p.index], content: p.content, writing: false }; return n })
            else if (event === 'error') setError(p.message)
            else if (event === 'done') setTab('overview')
          } catch {}
        }
      }
    } catch (e) { setError(e.message || 'Something went wrong.') }
    setRunning(false)
  }

  const done = Object.values(steps).filter(s => s === 'done').length
  const progress = Math.round((done / STEPS.length) * 100)
  const wordCount = result.finalBlog ? result.finalBlog.split(/\\s+/).filter(Boolean).length : 0
  const hasResults = !!result.finalBlog

  function downloadMd() {
    const content = '---\\ntitle: "' + result.metaTitle + '"\\ndescription: "' + result.metaDescription + '"\\nprimary_keyword: "' + result.primaryKeyword + '"\\npermalink: "/' + result.permalink + '"\\n---\\n\\n' + result.finalBlog
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([content], { type: 'text/markdown' })); a.download = (result.permalink || 'blog') + '.md'; a.click()
  }

  const tabs = hasResults
    ? [{ id: 'overview', label: '📊 Overview' }, { id: 'blog', label: '📝 Blog (' + wordCount.toLocaleString() + 'w)' }, { id: 'keywords', label: '🔑 Keywords' }, { id: 'serp', label: '🔍 SERP' }, { id: 'live', label: '⚡ Pipeline' }]
    : [{ id: 'live', label: '⚡ Pipeline' }]

  return (
    <div style={{ minHeight: '100vh', background: '#07070f', color: '#f0f0ff', fontFamily: '-apple-system, BlinkMacSystemFont, Segoe UI, sans-serif' }}>
      <Header user={user} onAuthChange={setUser} />

      <div style={{ maxWidth: 860, margin: '0 auto', padding: '48px 20px 80px' }}>

        {/* Hero */}
        <div style={{ textAlign: 'center', marginBottom: 56 }}>
          <div style={{ display: 'inline-block', padding: '6px 16px', borderRadius: 99, background: 'rgba(139,92,246,0.12)', border: '1px solid rgba(139,92,246,0.25)', fontSize: 12, color: '#a78bfa', fontWeight: 600, letterSpacing: 0.5, marginBottom: 24 }}>
            🚀 AI-Powered SEO Blog Generator
          </div>
          <h1 style={{ fontSize: 'clamp(32px,5vw,58px)', fontWeight: 900, lineHeight: 1.05, letterSpacing: '-2px', margin: '0 0 20px', color: '#f0f0ff' }}>
            Real SERP Research.<br />
            <span style={{ background: 'linear-gradient(135deg,#7c3aed,#a855f7,#ec4899)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>4000-Word Blog.</span>
          </h1>
          <p style={{ color: '#9090a8', fontSize: 17, maxWidth: 480, margin: '0 auto 32px', lineHeight: 1.7 }}>
            Firecrawl scrapes Google's top 10 results. Groq writes a fully SEO-optimized, human-like blog — ready to publish.
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 20, flexWrap: 'wrap' }}>
            {['Real SERP Crawling', 'Competitor Analysis', 'Semantic SEO', 'E-E-A-T Optimized', '4000 Words', 'Cover Image'].map(f => (
              <span key={f} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#9090a8' }}>
                <span style={{ color: '#22c55e', fontSize: 10 }}>✓</span>{f}
              </span>
            ))}
          </div>
        </div>

        {/* Sign in banner */}
        {!user && (
          <div style={{ marginBottom: 16, padding: '16px 22px', borderRadius: 14, background: 'linear-gradient(135deg,rgba(124,58,237,0.12),rgba(168,85,247,0.08))', border: '1px solid rgba(139,92,246,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#f0f0ff', marginBottom: 2 }}>Start generating for free</div>
              <div style={{ fontSize: 13, color: '#9090a8' }}>2 blogs free. No credit card required.</div>
            </div>
            <button onClick={() => setShowAuth(true)} style={{ padding: '10px 24px', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg,#7c3aed,#a855f7)', color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}>
              Sign Up Free →
            </button>
          </div>
        )}

        {/* Input card */}
        <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 18, padding: '24px', marginBottom: 24 }}>
          <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
            <input
              value={topic} onChange={e => setTopic(e.target.value)} onKeyDown={e => e.key === 'Enter' && run()}
              placeholder="e.g. Best project management tools for remote teams in 2025"
              disabled={running}
              style={{ flex: 1, height: 52, padding: '0 18px', borderRadius: 12, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#f0f0ff', fontSize: 15, outline: 'none', transition: 'border-color 0.2s' }}
            />
            <button onClick={run} disabled={running} style={{ height: 52, padding: '0 28px', borderRadius: 12, border: 'none', background: running ? 'rgba(255,255,255,0.07)' : 'linear-gradient(135deg,#7c3aed,#a855f7)', color: '#fff', fontSize: 15, fontWeight: 700, cursor: running ? 'not-allowed' : 'pointer', whiteSpace: 'nowrap', minWidth: 160, transition: 'opacity 0.2s' }}>
              {running ? '⟳ Generating...' : user ? '✦ Generate' : 'Sign In to Generate'}
            </button>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', fontWeight: 600, letterSpacing: 0.5, textTransform: 'uppercase' }}>Intent:</span>
            {['informational', 'commercial'].map(t => (
              <button key={t} onClick={() => setIntent(t)} disabled={running} style={{ padding: '5px 14px', borderRadius: 6, border: '1px solid ' + (intent === t ? 'rgba(139,92,246,0.5)' : 'rgba(255,255,255,0.08)'), background: intent === t ? 'rgba(139,92,246,0.15)' : 'transparent', color: intent === t ? '#a78bfa' : '#9090a8', fontSize: 12, cursor: 'pointer', fontWeight: intent === t ? 700 : 400, transition: 'all 0.2s' }}>
                {t === 'commercial' ? '💰 Commercial' : '📚 Informational'}
              </button>
            ))}
          </div>
          {error && (
            <div style={{ marginTop: 14, padding: '12px 16px', borderRadius: 10, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#fca5a5', fontSize: 14 }}>
              ⚠️ {error}
            </div>
          )}
        </div>

        {/* Results panel */}
        {(running || hasResults) && (
          <div>
            {running && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#9090a8', marginBottom: 8 }}>
                  <span>Pipeline running...</span><span style={{ color: '#a78bfa', fontWeight: 700 }}>{progress}%</span>
                </div>
                <div style={{ height: 4, background: 'rgba(255,255,255,0.06)', borderRadius: 99, overflow: 'hidden' }}>
                  <div style={{ height: 4, background: 'linear-gradient(90deg,#7c3aed,#a855f7,#ec4899)', width: progress + '%', transition: 'width 0.6s ease', borderRadius: 99 }} />
                </div>
              </div>
            )}

            {hasResults && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
                <div style={{ fontSize: 14, color: '#9090a8' }}>
                  <span style={{ color: '#f0f0ff', fontWeight: 700 }}>{wordCount.toLocaleString()}</span> words · {sections.filter(s => s && !s.writing).length}/10 sections
                  {result.aiLikelihoodPercent != null && (
                    <span style={{ marginLeft: 12, color: result.aiLikelihoodPercent > 50 ? '#f87171' : result.aiLikelihoodPercent > 25 ? '#fbbf24' : '#22c55e' }}>
                      AI: {result.aiLikelihoodPercent}%
                    </span>
                  )}
                </div>
                <button onClick={downloadMd} style={{ padding: '8px 18px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.05)', color: '#f0f0ff', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
                  ↓ Download .md
                </button>
              </div>
            )}

            <div style={{ border: '1px solid rgba(255,255,255,0.08)', borderRadius: 18, overflow: 'hidden' }}>
              <div style={{ display: 'flex', gap: 2, borderBottom: '1px solid rgba(255,255,255,0.07)', background: 'rgba(255,255,255,0.02)', padding: '8px 10px', overflowX: 'auto' }}>
                {tabs.map(t => (
                  <button key={t.id} onClick={() => setTab(t.id)} style={{ padding: '8px 16px', borderRadius: 8, border: 'none', background: tab === t.id ? 'rgba(139,92,246,0.2)' : 'transparent', color: tab === t.id ? '#a78bfa' : '#9090a8', cursor: 'pointer', fontSize: 13, fontWeight: tab === t.id ? 700 : 400, whiteSpace: 'nowrap', transition: 'all 0.2s' }}>
                    {t.label}
                  </button>
                ))}
              </div>

              <div style={{ padding: 24, minHeight: 300 }}>

                {/* Pipeline tab */}
                {tab === 'live' && (
                  <div style={{ display: 'grid', gap: 8 }}>
                    {STEPS.map(s => {
                      const status = steps[s.id]
                      const isDone = status === 'done'
                      const isActive = status === 'active'
                      const isError = status === 'error'
                      return (
                        <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 16px', borderRadius: 12, background: isActive ? 'rgba(139,92,246,0.08)' : 'rgba(255,255,255,0.02)', border: '1px solid ' + (isActive ? 'rgba(139,92,246,0.2)' : 'rgba(255,255,255,0.05)'), transition: 'all 0.3s' }}>
                          <div style={{ fontSize: 22, width: 28, textAlign: 'center' }}>{s.icon}</div>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: 700, fontSize: 14, color: isDone ? '#22c55e' : isActive ? '#a78bfa' : '#f0f0ff' }}>{s.label}</div>
                            <div style={{ fontSize: 12, color: '#9090a8', marginTop: 2 }}>{stepMsg[s.id] || s.desc}</div>
                          </div>
                          <div style={{ width: 24, height: 24, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 800, background: isDone ? 'rgba(34,197,94,0.15)' : isActive ? 'rgba(139,92,246,0.15)' : 'transparent', color: isDone ? '#22c55e' : isError ? '#f87171' : isActive ? '#a78bfa' : 'rgba(255,255,255,0.2)' }}>
                            {isDone ? '✓' : isError ? '✕' : isActive ? '⟳' : '·'}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}

                {/* Overview tab */}
                {tab === 'overview' && (
                  <div>
                    {result.coverImageUrl && (
                      <img src={result.coverImageUrl} alt="Cover" style={{ width: '100%', borderRadius: 14, marginBottom: 24, aspectRatio: '16/9', objectFit: 'cover' }} />
                    )}
                    <div style={{ display: 'grid', gap: 12 }}>
                      {[
                        { label: 'Meta Title', value: result.metaTitle, color: '#f0f0ff' },
                        { label: 'Meta Description', value: result.metaDescription, color: '#d0d0e8' },
                        { label: 'Permalink', value: result.permalink ? '/' + result.permalink : '', color: '#a78bfa' },
                      ].filter(i => i.value).map(item => (
                        <div key={item.label} style={{ padding: '14px 18px', borderRadius: 12, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
                          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 6 }}>{item.label}</div>
                          <div style={{ fontSize: 14, color: item.color, lineHeight: 1.5 }}>{item.value}</div>
                        </div>
                      ))}
                    </div>
                    {result.aiLikelihoodPercent != null && (
                      <div style={{ marginTop: 16, padding: '16px 18px', borderRadius: 12, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: '#f0f0ff', marginBottom: 12 }}>Quality Signals</div>
                        <div style={{ display: 'flex', gap: 24 }}>
                          <div>
                            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 4 }}>AI Likelihood</div>
                            <div style={{ fontSize: 28, fontWeight: 900, color: result.aiLikelihoodPercent > 50 ? '#f87171' : result.aiLikelihoodPercent > 25 ? '#fbbf24' : '#22c55e' }}>{result.aiLikelihoodPercent}%</div>
                          </div>
                          {result.plagiarismRiskPercent != null && (
                            <div>
                              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 4 }}>Plagiarism Risk</div>
                              <div style={{ fontSize: 28, fontWeight: 900, color: result.plagiarismRiskPercent > 30 ? '#f87171' : '#22c55e' }}>{result.plagiarismRiskPercent}%</div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Keywords tab */}
                {tab === 'keywords' && (
                  <div style={{ display: 'grid', gap: 16 }}>
                    {result.primaryKeyword && (
                      <div style={{ padding: '14px 18px', borderRadius: 12, background: 'rgba(139,92,246,0.1)', border: '1px solid rgba(139,92,246,0.2)' }}>
                        <div style={{ fontSize: 10, color: '#a78bfa', fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 6 }}>Primary Keyword</div>
                        <div style={{ fontSize: 18, fontWeight: 800, color: '#f0f0ff' }}>{result.primaryKeyword}</div>
                      </div>
                    )}
                    {result.secondaryKeywords && result.secondaryKeywords.length > 0 && (
                      <div style={{ padding: '14px 18px', borderRadius: 12, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
                        <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 10 }}>Secondary Keywords</div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                          {result.secondaryKeywords.map((k, i) => <span key={i} style={{ padding: '5px 14px', borderRadius: 99, background: 'rgba(139,92,246,0.12)', border: '1px solid rgba(139,92,246,0.2)', color: '#a78bfa', fontSize: 13 }}>{k}</span>)}
                        </div>
                      </div>
                    )}
                    {result.semanticKeywords && result.semanticKeywords.length > 0 && (
                      <div style={{ padding: '14px 18px', borderRadius: 12, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
                        <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 10 }}>Semantic / LSI Keywords</div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                          {result.semanticKeywords.slice(0, 30).map((k, i) => <span key={i} style={{ padding: '4px 10px', borderRadius: 99, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', color: '#9090a8', fontSize: 12 }}>{k}</span>)}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* SERP tab */}
                {tab === 'serp' && result.serpData && (
                  <div style={{ display: 'grid', gap: 10 }}>
                    {(result.serpData.results || []).slice(0, 10).map((r, i) => (
                      <div key={i} style={{ padding: '12px 16px', borderRadius: 10, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                          <span style={{ fontSize: 11, fontWeight: 800, color: '#a78bfa', background: 'rgba(139,92,246,0.15)', padding: '2px 8px', borderRadius: 6, whiteSpace: 'nowrap' }}>#{r.rank}</span>
                          <div>
                            <div style={{ fontSize: 14, fontWeight: 600, color: '#f0f0ff', marginBottom: 4 }}>{r.title}</div>
                            <div style={{ fontSize: 12, color: '#9090a8', lineHeight: 1.5 }}>{r.snippet ? r.snippet.substring(0, 180) + '...' : ''}</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Blog tab */}
                {tab === 'blog' && (
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16, gap: 8 }}>
                      <button onClick={() => navigator.clipboard.writeText(result.finalBlog).then(() => alert('Copied!'))} style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', color: '#9090a8', cursor: 'pointer', fontSize: 12 }}>Copy Raw</button>
                      <button onClick={downloadMd} style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid rgba(139,92,246,0.3)', background: 'rgba(139,92,246,0.1)', color: '#a78bfa', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>↓ Download .md</button>
                    </div>
                    <div style={{ color: '#d0d0e8', lineHeight: 1.8, fontSize: 15 }} dangerouslySetInnerHTML={{ __html: mdToHtml(result.finalBlog) }} />
                  </div>
                )}

              </div>
            </div>
          </div>
        )}
      </div>

      {showAuth && <AuthModal onClose={() => setShowAuth(false)} onSuccess={u => { setUser(u); setShowAuth(false) }} />}
    </div>
  )
}
`

fs.writeFileSync('src/app/page.js', homePage, 'utf8')
console.log('OK src/app/page.js - polished UI, single header')

console.log('\nAll done! Run: npm run dev')
