const fs = require('fs')

const homePage = `'use client'
import { useState, useEffect } from 'react'
import Header from '@/components/Header'
import AuthModal from '@/components/AuthModal'

const PIPELINE_STEPS = [
  { id: 'keywords',  icon: '🔑', label: 'Keyword Research',     desc: 'Generating long-tail & secondary keywords' },
  { id: 'meta',      icon: '🏷️', label: 'Meta Data',            desc: 'Title, description & permalink' },
  { id: 'serp',      icon: '🔍', label: 'SERP Search',          desc: 'Searching Google via Firecrawl' },
  { id: 'scraping',  icon: '🕷️', label: 'Page Scraping',        desc: 'Reading top 10 ranking pages' },
  { id: 'semantic',  icon: '🧠', label: 'Semantic Keywords',     desc: 'LSI & entity extraction' },
  { id: 'structure', icon: '🏗️', label: 'Blog Structure',       desc: '10-section H1/H2/H3 plan' },
  { id: 'writing',   icon: '✍️', label: 'Writing Blog',         desc: '400 words x 10 sections' },
  { id: 'grammar',   icon: '✅', label: 'Quality Check',        desc: 'Grammar, SEO & E-E-A-T polish' },
  { id: 'detection', icon: '🧪', label: 'AI & Plagiarism Check', desc: 'Estimating AI% and plagiarism risk' },
  { id: 'image',     icon: '🖼️', label: 'Cover Image',          desc: 'AI-generated 16:9 cover' },
]

function mdToHtml(md) {
  if (!md) return ''
  return md
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    .replace(/\\*\\*(.+?)\\*\\*/g, '<strong>$1</strong>')
    .replace(/\\*(.+?)\\*/g, '<em>$1</em>')
    .replace(/^- (.+)$/gm, '<li>$1</li>')
    .split('\\n')
    .map(l => l.startsWith('<') || l.trim() === '' ? l : '<p>' + l + '</p>')
    .join('\\n')
}

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

export default function Home() {
  const [user, setUser] = useState(null)
  const [showAuth, setShowAuth] = useState(false)
  const [topic, setTopic] = useState('')
  const [commercialIntent, setCommercialIntent] = useState('informational')
  const [running, setRunning] = useState(false)
  const [tab, setTab] = useState('live')
  const [steps, setSteps] = useState({})
  const [stepMsg, setStepMsg] = useState({})
  const [sections, setSections] = useState([])
  const [d, setD] = useState({
    primaryKeyword: '', secondaryKeywords: [], metaTitle: '',
    metaDescription: '', permalink: '', semanticKeywords: [],
    serpData: null, structure: [], finalBlog: '', coverImageUrl: '',
    imagePrompt: '', aiLikelihoodPercent: null, plagiarismRiskPercent: null, qualityReasons: [],
  })
  const [error, setError] = useState('')

  useEffect(() => {
    fetch('/api/auth/me')
      .then(r => r.json())
      .then(data => { if (data.user) setUser(data.user) })
      .catch(() => {})
  }, [])

  function setStep(id, status, msg) {
    setSteps(p => ({ ...p, [id]: status }))
    if (msg) setStepMsg(p => ({ ...p, [id]: msg }))
  }

  async function run() {
    if (!topic.trim()) return
    if (!user) { setShowAuth(true); return }
    if (running) return
    setRunning(true)
    setError('')
    setSteps({})
    setStepMsg({})
    setSections([])
    setD({ primaryKeyword: '', secondaryKeywords: [], metaTitle: '', metaDescription: '', permalink: '', semanticKeywords: [], serpData: null, structure: [], finalBlog: '', coverImageUrl: '', imagePrompt: '', aiLikelihoodPercent: null, plagiarismRiskPercent: null, qualityReasons: [] })
    setTab('live')
    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic, commercialIntent }),
      })
      if (res.status === 401) { setShowAuth(true); setRunning(false); return }
      if (!res.ok) { setError('Server error. Please try again.'); setRunning(false); return }
      const reader = res.body.getReader()
      const dec = new TextDecoder()
      let buf = ''
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buf += dec.decode(value, { stream: true })
        const lines = buf.split('\\n')
        buf = lines.pop()
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          try {
            const { event, data: p } = JSON.parse(line.slice(6))
            if (event === 'step') setStep(p.id, p.status, p.msg)
            else if (event === 'data') setD(prev => ({ ...prev, ...p }))
            else if (event === 'section_start') setSections(prev => { const n = [...prev]; n[p.index] = { h2: p.h2, content: null, writing: true }; return n })
            else if (event === 'section_done') setSections(prev => { const n = [...prev]; n[p.index] = { ...n[p.index], content: p.content, writing: false }; return n })
            else if (event === 'error') setError(p.message)
            else if (event === 'done') setTab('overview')
          } catch {}
        }
      }
    } catch (e) {
      setError(e.message || 'Something went wrong.')
    }
    setRunning(false)
  }

  const doneCount = Object.values(steps).filter(s => s === 'done').length
  const progress = Math.round((doneCount / PIPELINE_STEPS.length) * 100)
  const wordCount = d.finalBlog ? d.finalBlog.split(/\\s+/).filter(Boolean).length : 0
  const hasResults = !!d.finalBlog

  function downloadMd() {
    const fm = '---\\ntitle: "' + d.metaTitle + '"\\ndescription: "' + d.metaDescription + '"\\nprimary_keyword: "' + d.primaryKeyword + '"\\npermalink: "/' + d.permalink + '"\\n---\\n\\n'
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([fm + d.finalBlog], { type: 'text/markdown' }))
    a.download = (d.permalink || 'blog') + '.md'
    a.click()
  }

  const tabs = hasResults
    ? [{ id: 'overview', label: 'Overview' }, { id: 'blog', label: 'Blog (' + wordCount.toLocaleString() + 'w)' }, { id: 'serp', label: 'SERP Data' }, { id: 'live', label: 'Pipeline' }]
    : [{ id: 'live', label: 'Pipeline' }]

  return (
    <div style={{ minHeight: '100vh', background: C.bg, paddingBottom: 80 }}>
      <Header user={user} onAuthChange={setUser} />
      <div style={{ maxWidth: 920, margin: '0 auto', padding: '40px 20px' }}>

        <div style={{ textAlign: 'center', marginBottom: 52 }}>
          <h1 style={{ fontSize: 'clamp(30px,5vw,54px)', fontWeight: 800, lineHeight: 1.1, letterSpacing: '-1.5px', marginBottom: 18, color: C.textPrimary }}>
            Real SERP Research.<br />
            <span style={{ background: 'linear-gradient(135deg,#7c3aed,#a855f7,#ec4899)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>4000-Word Blog.</span>
          </h1>
          <p style={{ color: C.textSecondary, fontSize: 16, maxWidth: 500, margin: '0 auto', lineHeight: 1.7 }}>
            Firecrawl scrapes Google top results. Groq writes a fully SEO-optimized blog with real competitor analysis.
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 24, marginTop: 32, flexWrap: 'wrap' }}>
            {['Real SERP Crawling', 'Competitor Analysis', 'Semantic SEO', 'E-E-A-T Optimized', '4000 Words', 'AI Cover Image'].map(f => (
              <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: C.textSecondary }}>
                <span style={{ color: C.green, fontSize: 11 }}>✓</span> {f}
              </div>
            ))}
          </div>
        </div>

        {!user && (
          <div style={{ marginBottom: 20, padding: '14px 20px', borderRadius: 12, background: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
            <span style={{ color: C.textSecondary, fontSize: 14 }}>Sign in to start generating SEO blogs for free.</span>
            <button onClick={() => setShowAuth(true)} style={{ padding: '8px 20px', borderRadius: 8, border: 'none', background: 'linear-gradient(135deg,#7c3aed,#a855f7)', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>Sign Up Free</button>
          </div>
        )}

        <div style={{ background: C.card, border: '1px solid ' + C.border, borderRadius: 16, padding: 20, marginBottom: 20 }}>
          <label style={{ display: 'block', fontSize: 11, color: C.textDim, fontWeight: 600, letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 10 }}>Blog Topic</label>
          <div style={{ display: 'flex', gap: 10 }}>
            <input
              value={topic}
              onChange={e => setTopic(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && run()}
              placeholder="e.g. Best CRM software for small businesses in 2025"
              disabled={running}
              style={{ flex: 1, height: 48, padding: '0 16px', borderRadius: 10, background: 'rgba(255,255,255,0.05)', border: '1px solid ' + C.border, color: C.textPrimary, fontSize: 15, outline: 'none' }}
            />
            <button onClick={run} disabled={running} style={{ height: 48, padding: '0 26px', borderRadius: 10, border: 'none', background: running ? 'rgba(255,255,255,0.07)' : 'linear-gradient(135deg,#7c3aed,#a855f7)', color: '#fff', fontSize: 14, fontWeight: 700, cursor: running ? 'not-allowed' : 'pointer', whiteSpace: 'nowrap' }}>
              {running ? 'Generating...' : user ? 'Generate' : 'Sign In to Generate'}
            </button>
          </div>
          <div style={{ marginTop: 14, display: 'flex', gap: 12, alignItems: 'center' }}>
            <span style={{ fontSize: 11, color: C.textDim, fontWeight: 600, letterSpacing: 0.8, textTransform: 'uppercase' }}>Content Type:</span>
            {['informational', 'commercial'].map(type => (
              <button key={type} onClick={() => setCommercialIntent(type)} disabled={running} style={{ padding: '6px 14px', borderRadius: 6, border: '1px solid ' + (commercialIntent === type ? C.purple : C.border), background: commercialIntent === type ? 'rgba(139,92,246,0.15)' : 'rgba(255,255,255,0.02)', color: commercialIntent === type ? C.purpleLight : C.textSecondary, fontSize: 12, cursor: running ? 'not-allowed' : 'pointer' }}>
                {type === 'commercial' ? 'Commercial' : 'Informational'}
              </button>
            ))}
          </div>
          {error && <div style={{ marginTop: 14, padding: 12, borderRadius: 12, background: 'rgba(255,99,99,0.12)', border: '1px solid rgba(255,99,99,0.2)', color: 'rgba(255,255,255,0.9)', fontSize: 13 }}>⚠️ {error}</div>}
        </div>

        {(running || hasResults) && (
          <div style={{ marginBottom: 40 }}>
            {running && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: C.textSecondary, marginBottom: 6 }}>
                  <span>Pipeline progress</span><span>{progress}%</span>
                </div>
                <div style={{ height: 4, background: 'rgba(255,255,255,0.06)', borderRadius: 99 }}>
                  <div style={{ height: 4, borderRadius: 99, background: 'linear-gradient(90deg,#7c3aed,#a855f7)', width: progress + '%', transition: 'width 0.5s ease' }} />
                </div>
              </div>
            )}

            <div style={{ border: '1px solid ' + C.border, borderRadius: 18, overflow: 'hidden' }}>
              <div style={{ display: 'flex', gap: 4, borderBottom: '1px solid ' + C.border, background: 'rgba(255,255,255,0.03)', padding: '10px 12px' }}>
                {tabs.map(t => (
                  <button key={t.id} onClick={() => setTab(t.id)} style={{ padding: '8px 14px', borderRadius: 8, border: 'none', background: tab === t.id ? 'rgba(255,255,255,0.08)' : 'transparent', color: tab === t.id ? '#fff' : C.textSecondary, cursor: 'pointer', fontSize: 13, fontWeight: tab === t.id ? 700 : 500 }}>
                    {t.label}
                  </button>
                ))}
              </div>

              <div style={{ padding: 20, minHeight: 260 }}>
                {tab === 'live' && (
                  <div style={{ display: 'grid', gap: 10 }}>
                    {PIPELINE_STEPS.map(s => {
                      const status = steps[s.id]
                      return (
                        <div key={s.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '10px 14px', borderRadius: 10, background: status === 'active' ? 'rgba(139,92,246,0.07)' : 'transparent', border: '1px solid ' + (status === 'active' ? 'rgba(139,92,246,0.2)' : 'transparent'), transition: 'all 0.3s' }}>
                          <div style={{ fontSize: 20, marginTop: 1 }}>{s.icon}</div>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: 700, color: status === 'done' ? C.green : status === 'active' ? C.purpleLight : '#fff', fontSize: 14 }}>{s.label}</div>
                            <div style={{ fontSize: 12, color: C.textSecondary, marginTop: 2 }}>{stepMsg[s.id] || s.desc}</div>
                          </div>
                          <div style={{ fontSize: 16, fontWeight: 800, color: status === 'done' ? C.green : status === 'error' ? '#f87171' : status === 'active' ? C.purpleLight : C.textDim }}>
                            {status === 'done' ? '✓' : status === 'error' ? '✕' : status === 'active' ? '⟳' : '·'}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}

                {tab === 'overview' && (
                  <div style={{ color: C.textSecondary, lineHeight: 1.8 }}>
                    {d.coverImageUrl && <img src={d.coverImageUrl} alt="Cover" style={{ width: '100%', borderRadius: 12, marginBottom: 20, aspectRatio: '16/9', objectFit: 'cover' }} />}
                    <div style={{ display: 'grid', gap: 12 }}>
                      {[{ label: 'Meta Title', value: d.metaTitle }, { label: 'Meta Description', value: d.metaDescription }, { label: 'Primary Keyword', value: d.primaryKeyword }, { label: 'Permalink', value: d.permalink ? '/' + d.permalink : '' }].map(item => item.value && (
                        <div key={item.label} style={{ padding: '12px 16px', borderRadius: 10, background: 'rgba(255,255,255,0.03)', border: '1px solid ' + C.border }}>
                          <div style={{ fontSize: 11, color: C.textDim, fontWeight: 600, letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 4 }}>{item.label}</div>
                          <div style={{ color: '#fff', fontSize: 14 }}>{item.value}</div>
                        </div>
                      ))}
                    </div>
                    {d.secondaryKeywords && d.secondaryKeywords.length > 0 && (
                      <div style={{ marginTop: 16, padding: '12px 16px', borderRadius: 10, background: 'rgba(255,255,255,0.03)', border: '1px solid ' + C.border }}>
                        <div style={{ fontSize: 11, color: C.textDim, fontWeight: 600, letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 8 }}>Secondary Keywords</div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                          {d.secondaryKeywords.map((k, i) => <span key={i} style={{ padding: '4px 12px', borderRadius: 99, background: 'rgba(139,92,246,0.12)', border: '1px solid rgba(139,92,246,0.2)', color: C.purpleLight, fontSize: 13 }}>{k}</span>)}
                        </div>
                      </div>
                    )}
                    {(d.aiLikelihoodPercent != null || d.plagiarismRiskPercent != null) && (
                      <div style={{ marginTop: 16, padding: '14px 16px', borderRadius: 10, background: 'rgba(255,255,255,0.03)', border: '1px solid ' + C.border }}>
                        <div style={{ fontWeight: 800, color: '#fff', marginBottom: 10, fontSize: 14 }}>Quality Signals</div>
                        <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
                          {d.aiLikelihoodPercent != null && <div><div style={{ fontSize: 11, color: C.textDim, marginBottom: 2 }}>AI LIKELIHOOD</div><div style={{ fontSize: 22, fontWeight: 800, color: d.aiLikelihoodPercent > 50 ? '#f87171' : d.aiLikelihoodPercent > 25 ? '#fbbf24' : C.green }}>{d.aiLikelihoodPercent}%</div></div>}
                          {d.plagiarismRiskPercent != null && <div><div style={{ fontSize: 11, color: C.textDim, marginBottom: 2 }}>PLAGIARISM RISK</div><div style={{ fontSize: 22, fontWeight: 800, color: d.plagiarismRiskPercent > 30 ? '#f87171' : C.green }}>{d.plagiarismRiskPercent}%</div></div>}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {tab === 'serp' && (
                  <pre style={{ color: C.textSecondary, fontSize: 12, whiteSpace: 'pre-wrap', wordBreak: 'break-word', lineHeight: 1.6 }}>
                    {JSON.stringify(d.serpData, null, 2)}
                  </pre>
                )}

                {tab === 'blog' && (
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
                      <button onClick={() => { navigator.clipboard.writeText(d.finalBlog); alert('Copied!') }} style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.05)', color: '#fff', cursor: 'pointer', fontSize: 12 }}>Copy Markdown</button>
                    </div>
                    <div style={{ color: '#e0e0f0', lineHeight: 1.8, fontSize: 15 }} dangerouslySetInnerHTML={{ __html: mdToHtml(d.finalBlog) }} />
                  </div>
                )}
              </div>
            </div>

            {hasResults && (
              <div style={{ marginTop: 16 }}>
                <button onClick={downloadMd} style={{ padding: '10px 20px', borderRadius: 99, border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.06)', color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 700 }}>Download Markdown</button>
              </div>
            )}
          </div>
        )}
      </div>

      {showAuth && <AuthModal onClose={() => setShowAuth(false)} onSuccess={(u) => { setUser(u); setShowAuth(false) }} />}
    </div>
  )
}
`

fs.writeFileSync('src/app/page.js', homePage, 'utf8')
const check = fs.readFileSync('src/app/page.js', 'utf8')
console.log('Written page.js:', check.length, 'bytes')
console.log('Has Dashboard:', check.includes('export default function Dashboard'))
console.log('Has Home:', check.includes('export default function Home'))
console.log('\nNow run: npx prisma migrate dev --name init')
console.log('Then run: npm run dev')
