import OpenAI from 'openai'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
export const maxDuration = 300
export const dynamic = 'force-dynamic'
const grok = new OpenAI({ apiKey: process.env.GROK_API_KEY, baseURL: 'https://api.groq.com/openai/v1' })
const FC = process.env.FIRECRAWL_API_KEY
async function ask(system, user, maxTokens) {
  const res = await grok.chat.completions.create({ model: 'llama-3.3-70b-versatile', max_tokens: maxTokens || 2000, messages: [{ role: 'system', content: system }, { role: 'user', content: user }] })
  return res.choices[0].message.content
}
function safeJson(raw) {
  const c = raw.replace(/```json/g, '').replace(/```/g, '').trim()
  const m = c.match(/(\{[\s\S]*\}|\[[\s\S]*\])/)
  try { return JSON.parse(m ? m[0] : c) } catch { throw new Error('Bad JSON: ' + raw.substring(0, 200)) }
}
async function fcSearch(query, limit) {
  const res = await fetch('https://api.firecrawl.dev/v1/search', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + FC }, body: JSON.stringify({ query, limit: limit || 10, scrapeOptions: { formats: ['markdown'] } }) })
  if (!res.ok) throw new Error('Firecrawl failed: ' + res.status)
  const d = await res.json(); return d.data || []
}
async function fcScrape(url) {
  try {
    const res = await fetch('https://api.firecrawl.dev/v1/scrape', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + FC }, body: JSON.stringify({ url, formats: ['markdown'], onlyMainContent: true }) })
    if (!res.ok) return null
    const d = await res.json(); return d.data && d.data.markdown ? d.data.markdown : null
  } catch { return null }
}
export async function POST(req) {
  const session = await getSession()
  if (!session) return new Response('Unauthorized', { status: 401 })
  const body = await req.json()
  const topic = body.topic
  const intent = body.commercialIntent || 'informational'
  const enc = new TextEncoder()
  const stream = new ReadableStream({
    async start(ctrl) {
      function send(event, data) { ctrl.enqueue(enc.encode('data: ' + JSON.stringify({ event, data }) + '\n\n')) }
      try {
        let user = await prisma.user.findUnique({ where: { firebaseId: session.userId } })
        if (!user) user = await prisma.user.create({ data: { firebaseId: session.userId, email: session.email || '', name: session.name || '' } })
        if (user.plan === 'free' && user.blogsUsed >= 2) { send('error', { message: 'Free plan limit reached. Upgrade to Pro.' }); ctrl.close(); return }
        send('step', { id: 'keywords', status: 'active', msg: 'Researching keywords...' })
        const topicSerp = await fcSearch(topic, 6)
        const serpBrief = topicSerp.slice(0, 6).map((r, i) => (i+1) + '. ' + ((r.metadata && r.metadata.title) || 'Untitled') + '\n' + (r.markdown || r.content || '').replace(/\s+/g, ' ').substring(0, 200)).join('\n\n')
        const kw = safeJson(await ask('SEO expert. Respond ONLY valid JSON, no markdown.', 'Topic: ' + topic + '\nIntent: ' + intent + '\nSERP:\n' + serpBrief + '\nReturn: {"primaryKeyword":"4-6 word keyword","secondaryKeywords":["kw1","kw2","kw3","kw4"]}', 300))
        send('data', { primaryKeyword: kw.primaryKeyword, secondaryKeywords: kw.secondaryKeywords })
        send('step', { id: 'keywords', status: 'done' })
        send('step', { id: 'meta', status: 'active', msg: 'Writing meta data...' })
        const meta = safeJson(await ask('SEO copywriter. Respond ONLY valid JSON, no markdown.', 'Keyword: ' + kw.primaryKeyword + '\nTopic: ' + topic + '\nReturn: {"metaTitle":"50-60 chars","metaDescription":"140-155 chars","permalink":"3-5-word-slug"}', 400))
        send('data', { metaTitle: meta.metaTitle, metaDescription: meta.metaDescription, permalink: meta.permalink })
        send('step', { id: 'meta', status: 'done' })
        send('step', { id: 'serp', status: 'active', msg: 'Searching SERP...' })
        const serpResults = await fcSearch(kw.primaryKeyword, 10)
        send('step', { id: 'scraping', status: 'active', msg: 'Scraping top 10 pages...' })
        const pages = []
        for (let i = 0; i < Math.min(serpResults.length, 10); i++) {
          const r = serpResults[i]
          const url = r.url || (r.metadata && r.metadata.sourceURL)
          const title = (r.metadata && r.metadata.title) || r.title || url
          send('step', { id: 'scraping', status: 'active', msg: 'Scraping ' + (i+1) + '/10: ' + String(title).substring(0, 40) })
          let content = r.markdown || r.content || ''
          if (!content && url) content = (await fcScrape(url)) || ''
          pages.push({ rank: i+1, title, url, content: content.substring(0, 3000) })
        }
        const serpSummary = pages.map(p => ({ rank: p.rank, title: p.title, url: p.url, snippet: p.content.substring(0, 400) }))
        send('data', { serpData: { results: serpSummary } })
        send('step', { id: 'serp', status: 'done' })
        send('step', { id: 'scraping', status: 'done' })
        send('step', { id: 'semantic', status: 'active', msg: 'Extracting semantic keywords...' })
        const combined = pages.map(p => p.content).join(' ').substring(0, 6000)
        const sem = safeJson(await ask('NLP expert. Respond ONLY valid JSON, no markdown.', 'Keyword: ' + kw.primaryKeyword + '\nContent:\n' + combined + '\nReturn: {"semanticKeywords":["kw1","kw2"]}', 600))
        send('data', { semanticKeywords: sem.semanticKeywords })
        send('step', { id: 'semantic', status: 'done' })
        send('step', { id: 'structure', status: 'active', msg: 'Planning blog structure...' })
        const angles = pages.slice(0, 5).map(p => 'Rank ' + p.rank + ': ' + p.content.substring(0, 250)).join('\n\n')
        const struct = safeJson(await ask('SEO strategist. Respond ONLY valid JSON, no markdown.', 'Keyword: ' + kw.primaryKeyword + '\nTitle: ' + meta.metaTitle + '\nIntent: ' + intent + '\nCompetitors:\n' + angles + '\n10 sections: 1=intro,2-7=body,8=conclusion,9=cta,10=faq\nReturn: {"sections":[{"num":1,"h2":"...","h3s":["..."],"angle":"...","type":"intro"}]}', 1800))
        send('data', { structure: struct.sections })
        send('step', { id: 'structure', status: 'done' })
        send('step', { id: 'writing', status: 'active', msg: 'Writing blog sections...' })
        const allSections = []
        const refContent = pages.map(p => p.content.substring(0, 500)).join('\n---\n').substring(0, 5000)
        for (let j = 0; j < struct.sections.length; j++) {
          const sec = struct.sections[j]
          send('section_start', { index: j, h2: sec.h2 })
          send('step', { id: 'writing', status: 'active', msg: 'Writing ' + (j+1) + '/10: ' + String(sec.h2).substring(0, 40) })
          const h3s = (sec.h3s || []).map(h => '### ' + h).join('\n')
          const isFaq = String(sec.type).toLowerCase().indexOf('faq') > -1
          const isCta = String(sec.type).toLowerCase().indexOf('cta') > -1
          let prompt = 'Write EXACTLY 400 words.\nTitle: ' + meta.metaTitle + '\nKeyword: ' + kw.primaryKeyword + '\nRef: ' + refContent.substring(0, 1000) + '\nSECTION:\n## ' + sec.h2 + '\n' + h3s + '\nAngle: ' + (sec.angle || 'practical') + '\nRules: 400 words, include headings, first person I, short paragraphs'
          if (isFaq) prompt += '\nFAQ: 6 questions as ### headings, 50-70 words each'
          if (isCta) prompt += '\nCTA: persuasive, personal, clear action'
          const secContent = await ask('World-class SEO writer. Simple English, first person I, E-E-A-T.', prompt, 950)
          allSections.push(secContent)
          send('section_done', { index: j, content: secContent })
        }
        send('step', { id: 'writing', status: 'done' })
        send('step', { id: 'grammar', status: 'active', msg: 'Grammar check...' })
        const polished = await ask('Professional editor. Fix only errors. Return full markdown.', 'Fix grammar, typos, awkward sentences, unnecessary commas/dashes. Keep first person I.\nBLOG:\n' + allSections.join('\n\n'), 6000)
        send('data', { finalBlog: polished })
        send('step', { id: 'grammar', status: 'done' })
        send('step', { id: 'detection', status: 'active', msg: 'Checking AI likelihood...' })
        const detect = safeJson(await ask('Content auditor. Respond ONLY valid JSON, no markdown.', 'Return: {"aiLikelihoodPercent":0,"plagiarismRiskPercent":0,"reasons":[],"riskySentences":[]}\nBLOG:\n' + polished.substring(0, 8000), 600))
        send('data', { aiLikelihoodPercent: detect.aiLikelihoodPercent, plagiarismRiskPercent: detect.plagiarismRiskPercent, qualityReasons: detect.reasons })
        send('step', { id: 'detection', status: 'done' })
        send('step', { id: 'image', status: 'active', msg: 'Generating cover image...' })
        const imgRaw = await ask('Creative director. One image prompt only, no quotes, 50-100 words.', 'Cover 16:9 for: ' + meta.metaTitle + '. Modern, professional, no text overlays.', 200)
        const imgPrompt = imgRaw.trim().replace(/"/g, '')
        const coverImageUrl = 'https://image.pollinations.ai/prompt/' + encodeURIComponent(imgPrompt) + '?width=1200&height=675&nologo=true'
        send('data', { coverImageUrl, imagePrompt: imgPrompt })
        send('step', { id: 'image', status: 'done' })
        await prisma.blog.create({ data: { userId: user.id, topic, primaryKeyword: kw.primaryKeyword, secondaryKeywords: kw.secondaryKeywords, metaTitle: meta.metaTitle, metaDescription: meta.metaDescription, permalink: meta.permalink, semanticKeywords: sem.semanticKeywords || [], serpData: { results: serpSummary }, structure: struct.sections, finalBlog: polished, coverImageUrl, imagePrompt: imgPrompt, aiLikelihood: detect.aiLikelihoodPercent, plagiarismRisk: detect.plagiarismRiskPercent, qualityReasons: detect.reasons || [] } })
        await prisma.user.update({ where: { id: user.id }, data: { blogsUsed: { increment: 1 } } })
        send('done', { success: true })
      } catch (err) {
        console.error(err)
        send('error', { message: err.message || 'Something went wrong.' })
      }
      ctrl.close()
    }
  })
  return new Response(stream, { headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', 'Connection': 'keep-alive' } })
}
