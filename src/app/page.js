'use client'

import { useState } from 'react'

const PIPELINE_STEPS = [
  { id: 'keywords',  icon: '🔑', label: 'Keyword Research',       desc: 'Generating long-tail & secondary keywords' },
  { id: 'meta',      icon: '🏷️', label: 'Meta Data',              desc: 'Title, description & permalink' },
  { id: 'serp',      icon: '🔍', label: 'SERP Search',            desc: 'Searching Google via Firecrawl' },
  { id: 'scraping',  icon: '🕷️', label: 'Page Scraping',          desc: 'Reading top 10 ranking pages' },
  { id: 'semantic',  icon: '🧠', label: 'Semantic Keywords',       desc: 'LSI & entity extraction' },
  { id: 'structure', icon: '🏗️', label: 'Blog Structure',         desc: '10-section H1/H2/H3 plan' },
  { id: 'writing',   icon: '✍️', label: 'Writing Blog',           desc: '400 words × 10 sections' },
  { id: 'grammar',   icon: '✅', label: 'Quality Check',          desc: 'Grammar, SEO & E-E-A-T polish' },
  { id: 'detection', icon: '🧪', label: 'AI & Plagiarism Check',   desc: 'Estimating AI% and plagiarism risk' },
  { id: 'image',     icon: '🖼️', label: 'Cover Image',            desc: 'AI-generated 16:9 cover' },
]

function mdToHtml(md) {
  if (!md) return ''
  return md
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/^- (.+)$/gm, '<li>$1</li>')
    .replace(/(<li>.*<\/li>\n?)+/g, m => `<ul>${m}</ul>`)
    .split('\n')
    .map(l => l.startsWith('<') || l.trim() === '' ? l : `<p>${l}</p>`)
    .join('\n')
}

const C = {
  bg: '#07070f',
  card: 'rgba(255,255,255,0.03)',
  border: 'rgba(255,255,255,0.07)',
  borderHi: 'rgba(139,92,246,0.4)',
  purple: '#8b5cf6',
  purpleLight: '#a78bfa',
  purpleDim: 'rgba(139,92,246,0.15)',
  green: '#22c55e',
  greenDim: 'rgba(34,197,94,0.12)',
  blue: '#60a5fa',
  textPrimary: '#f0f0ff',
  textSecondary: '#9090a8',
  textDim: 'rgba(255,255,255,0.25)',
}

export default function Home() {
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
    serpData: null, structure: [], finalBlog: '', coverImageUrl: '', imagePrompt: '', imageGeneratedVia: '',
    aiLikelihoodPercent: null, plagiarismRiskPercent: null, qualityReasons: [],
  })
  const [error, setError] = useState('')

  function setStep(id, status, msg) {
    setSteps(p => ({ ...p, [id]: status }))
    if (msg) setStepMsg(p => ({ ...p, [id]: msg }))
  }

  async function run() {
    if (!topic.trim() || running) return

    setRunning(true)
    setError('')
    setSteps({})
    setStepMsg({})
    setSections([])
    setD({ primaryKeyword:'',secondaryKeywords:[],metaTitle:'',metaDescription:'',permalink:'',semanticKeywords:[],serpData:null,structure:[],finalBlog:'',coverImageUrl:'',imagePrompt:'',imageGeneratedVia:'',aiLikelihoodPercent:null,plagiarismRiskPercent:null,qualityReasons:[] })
    setTab('live')

    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic, commercialIntent }),
      })
      const reader = res.body.getReader()
      const dec = new TextDecoder()
      let buf = ''
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buf += dec.decode(value, { stream: true })
        const lines = buf.split('\n'); buf = lines.pop()
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          try {
            const { event, data: p } = JSON.parse(line.slice(6))
            if (event === 'step') setStep(p.id, p.status, p.msg)
            else if (event === 'data') setD(prev => ({ ...prev, ...p }))
            else if (event === 'section_start') setSections(prev => { const n=[...prev]; n[p.index]={h2:p.h2,content:null,writing:true}; return n })
            else if (event === 'section_done') { setSections(prev => { const n=[...prev]; n[p.index]={...n[p.index],content:p.content,writing:false}; return n }) }
            else if (event === 'error') setError(p.message)
            else if (event === 'done') setTab('overview')
          } catch {}
        }
      }
    } catch (e) {
      setError(e.message)
    }
    setRunning(false)
  }

  const doneCount = Object.values(steps).filter(s => s === 'done').length
  const progress = Math.round((doneCount / PIPELINE_STEPS.length) * 100)
  const wordCount = d.finalBlog ? d.finalBlog.split(/\s+/).filter(Boolean).length : 0
  const sectionsWritten = sections.filter(s => !s?.writing && s?.content).length

  function downloadMd() {
    const fm = `---\ntitle: "${d.metaTitle}"\ndescription: "${d.metaDescription}"\nprimary_keyword: "${d.primaryKeyword}"\npermalink: "/${d.permalink}"\nsecondary_keywords: [${d.secondaryKeywords.map(k=>`"${k}"`).join(', ')}]\n---\n\n`
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([fm + d.finalBlog], { type: 'text/markdown' }))
    a.download = (d.permalink || 'blog') + '.md'
    a.click()
  }
  function copy(txt, label='Copied!') { navigator.clipboard.writeText(txt).then(()=>alert(label)) }

  const hasResults = !!d.finalBlog
  const tabs = hasResults
    ? [{ id:'overview', label:'Overview' }, { id:'blog', label:`Blog (${wordCount.toLocaleString()}w)` }, { id:'serp', label:'SERP Data' }, { id:'live', label:'Pipeline' }]
    : [{ id:'live', label:'Pipeline' }]

  return (
    <div style={{ minHeight:'100vh', background: C.bg, paddingBottom: 80 }}>
      <div style={{ maxWidth:920, margin:'0 auto', padding:'40px 20px' }}>
        {/* Hero */}
        <div style={{ textAlign:'center', marginBottom:52 }}>
          <h1 style={{ fontSize:'clamp(30px,5vw,54px)', fontWeight:800, lineHeight:1.1, letterSpacing:'-1.5px', marginBottom:18, color: C.textPrimary }}>
            Real SERP Research.<br />
            <span style={{ background:'linear-gradient(135deg,#7c3aed,#a855f7,#ec4899)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', backgroundClip:'text' }}>
              4000‑Word Blog.
            </span>
          </h1>
          <p style={{ color: C.textSecondary, fontSize:16, maxWidth:500, margin:'0 auto', lineHeight:1.7 }}>
            Firecrawl scrapes Google's top results. Grok writes a fully SEO-optimized blog with real SERP research and competitor analysis.
          </p>

          <div style={{ display:'flex', justifyContent:'center', gap:24, marginTop:32, flexWrap:'wrap' }}>
            {['Real SERP Crawling','Competitor Analysis','Semantic SEO','E-E-A-T Optimized','4000 Words','AI Cover Image'].map(f => (
              <div key={f} style={{ display:'flex', alignItems:'center', gap:6, fontSize:13, color: C.textSecondary }}>
                <span style={{ color: C.green, fontSize:11 }}>✓</span> {f}
              </div>
            ))}
          </div>
        </div>

        {/* Input */}
        <div style={{ background: C.card, border:`1px solid ${C.border}`, borderRadius:16, padding:20, marginBottom:20 }}>
          <label style={{ display:'block', fontSize:11, color: C.textDim, fontWeight:600, letterSpacing:0.8, textTransform:'uppercase', marginBottom:10 }}>
            Blog Topic
          </label>
          <div style={{ display:'flex', gap:10 }}>
            <input
              value={topic}
              onChange={e => setTopic(e.target.value)}
              onKeyDown={e => e.key==='Enter' && run()}
              placeholder="e.g. Best CRM software for small businesses in 2025"
              disabled={running}
              style={{ flex:1, height:48, padding:'0 16px', borderRadius:10, background:'rgba(255,255,255,0.05)', border:`1px solid ${C.border}`, color: C.textPrimary, fontSize:15, transition:'border 0.2s' }}
            />
            <button
              onClick={run}
              disabled={running || !topic.trim()}
              style={{ height:48, padding:'0 26px', borderRadius:10, border:'none', background: running?'rgba(255,255,255,0.07)':'linear-gradient(135deg,#7c3aed,#a855f7)', color:'#fff', fontSize:14, fontWeight:700, cursor: running?'not-allowed':'pointer', whiteSpace:'nowrap', letterSpacing:'-0.2px' }}
            >
              {running ? 'Generating…' : 'Generate →'}
            </button>
          </div>

          {/* Content Type Selection */}
          <div style={{ marginTop: 14, display: 'flex', gap: 12, alignItems: 'center' }}>
            <span style={{ fontSize: 11, color: C.textDim, fontWeight: 600, letterSpacing: 0.8, textTransform: 'uppercase' }}>Content Type:</span>
            {['informational', 'commercial'].map(type => (
              <button
                key={type}
                onClick={() => setCommercialIntent(type)}
                disabled={running}
                style={{
                  padding: '6px 14px',
                  borderRadius: 6,
                  border: `1px solid ${commercialIntent === type ? C.purple : C.border}`,
                  background: commercialIntent === type ? 'rgba(139,92,246,0.15)' : 'rgba(255,255,255,0.02)',
                  color: commercialIntent === type ? C.purpleLight : C.textSecondary,
                  fontSize: 12,
                  cursor: running ? 'not-allowed' : 'pointer',
                }}
              >
                {type === 'commercial' ? 'Commercial' : 'Informational'}
              </button>
            ))}
          </div>

          {error && (
            <div style={{ marginTop: 14, padding: 12, borderRadius: 12, background: 'rgba(255,99,99,0.12)', border: '1px solid rgba(255,99,99,0.2)', color: 'rgba(255,255,255,0.9)', fontSize: 13 }}>
              {error}
            </div>
          )}
        </div>

        {/* Results */}
        {hasResults && (
          <div style={{ marginBottom: 40 }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center', marginBottom: 12 }}>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <div style={{ fontSize: 14, color: C.textSecondary }}>Word count</div>
                <div style={{ fontSize: 14, fontWeight: 700 }}>{wordCount.toLocaleString()}</div>
                <div style={{ fontSize: 14, color: C.textSecondary }}>{sectionsWritten} / 10 sections</div>
              </div>
              <div style={{ marginLeft: 'auto', display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <button onClick={downloadMd} style={{ padding: '10px 16px', borderRadius: 10, border: 'none', background: 'rgba(255,255,255,0.06)', color: '#fff', cursor: 'pointer' }}>
                  Download Markdown
                </button>
              </div>
            </div>

            <div style={{ border: `1px solid ${C.border}`, borderRadius: 18, overflow: 'hidden' }}>
              <div style={{ display: 'flex', gap: 10, borderBottom: `1px solid ${C.border}`, background: 'rgba(255,255,255,0.04)', padding: '10px 12px' }}>
                {tabs.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setTab(t.id)}
                    style={{
                      padding: '8px 12px',
                      borderRadius: 10,
                      border: 'none',
                      background: tab === t.id ? 'rgba(255,255,255,0.08)' : 'transparent',
                      color: tab === t.id ? '#fff' : C.textSecondary,
                      cursor: 'pointer',
                      fontSize: 13,
                      fontWeight: tab === t.id ? 700 : 500,
                    }}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
              <div style={{ padding: 18, minHeight: 260 }}>
                {tab === 'live' && (
                  <div style={{ fontSize: 14, color: C.textSecondary, lineHeight: 1.6 }}>
                    <div style={{ marginBottom: 12 }}>Pipeline progress: {progress}%</div>
                    <div style={{ display: 'grid', gap: 10 }}>
                      {PIPELINE_STEPS.map((s) => (
                        <div key={s.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                          <div style={{ fontSize: 18 }}>{s.icon}</div>
                          <div>
                            <div style={{ fontWeight: 700, color: '#fff' }}>{s.label}</div>
                            <div style={{ fontSize: 12, color: C.textSecondary }}>{stepMsg[s.id] || s.desc}</div>
                          </div>
                          <div style={{ marginLeft: 'auto', color: steps[s.id] === 'done' ? C.green : steps[s.id] === 'error' ? '#f87171' : C.textSecondary, fontWeight: 700 }}>
                            {steps[s.id] === 'done' ? '✓' : steps[s.id] === 'error' ? '!' : '…'}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {tab === 'overview' && (
                  <div style={{ color: C.textSecondary, lineHeight: 1.7 }}>
                    <div style={{ marginBottom: 14 }}>
                      <strong>Meta title:</strong> {d.metaTitle}
                    </div>
                    <div style={{ marginBottom: 14 }}>
                      <strong>Meta description:</strong> {d.metaDescription}
                    </div>
                    <div style={{ marginBottom: 14 }}>
                      <strong>Primary keyword:</strong> {d.primaryKeyword}
                    </div>
                    <div style={{ marginBottom: 14 }}>
                      <strong>Permalink:</strong> /{d.permalink}
                    </div>
                    {(d.aiLikelihoodPercent != null || d.plagiarismRiskPercent != null) && (
                      <div style={{ marginTop: 18, padding: 14, borderRadius: 14, border: `1px solid ${C.border}`, background: 'rgba(255,255,255,0.03)' }}>
                        <div style={{ fontWeight: 800, color: '#fff', marginBottom: 8 }}>Quality signals (estimates)</div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14 }}>
                          {d.aiLikelihoodPercent != null && (
                            <div><strong>AI likelihood:</strong> {d.aiLikelihoodPercent}%</div>
                          )}
                          {d.plagiarismRiskPercent != null && (
                            <div><strong>Plagiarism risk:</strong> {d.plagiarismRiskPercent}%</div>
                          )}
                        </div>
                        {Array.isArray(d.qualityReasons) && d.qualityReasons.length > 0 && (
                          <ul style={{ marginTop: 10, paddingLeft: 18 }}>
                            {d.qualityReasons.slice(0, 4).map((r, i) => (
                              <li key={i} style={{ marginBottom: 6 }}>{r}</li>
                            ))}
                          </ul>
                        )}
                        <div style={{ marginTop: 10, fontSize: 12, color: C.textSecondary }}>
                          Note: these are pattern-based estimates unless a detector API is connected.
                        </div>
                      </div>
                    )}
                  </div>
                )}
                {tab === 'serp' && (
                  <pre style={{ color: C.textSecondary, fontSize: 13, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{JSON.stringify(d.serpData, null, 2)}</pre>
                )}
                {tab === 'blog' && (
                  <div style={{ color: '#fff', lineHeight: 1.7 }} dangerouslySetInnerHTML={{ __html: mdToHtml(d.finalBlog) }} />
                )}
              </div>
            </div>

            <div style={{ marginTop: 18, display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
              <button onClick={downloadMd} style={{ padding: '10px 16px', borderRadius: 999, border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.06)', color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 700 }}>
                Download Markdown
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

