import OpenAI from 'openai'
import { prisma as prismaClient } from '@/lib/prisma' 
import { getSession } from '@/lib/auth'

export const maxDuration = 300
export const dynamic = 'force-dynamic'

// ... everything else follows ...

const grok = new OpenAI({
  apiKey: process.env.GROK_API_KEY,
  baseURL: 'https://api.groq.com/openai/v1',
})

const FIRECRAWL_KEY = process.env.FIRECRAWL_API_KEY
const GOOGLE_AI_API_KEY = process.env.GOOGLE_AI_API_KEY
function getPrisma() {
  return prismaClient // This uses the import from @/lib/prisma
}

function countWords(text) {
  if (!text) return 0
  // rough but stable across markdown
  const cleaned = text
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/[#>*_`~]/g, ' ')
    .replace(/\[(.*?)\]\((.*?)\)/g, '$1')
    .replace(/[^\p{L}\p{N}\s']/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  if (!cleaned) return 0
  return cleaned.split(' ').filter(Boolean).length
}

// ── Grok AI call ──────────────────────────────────────────────────────────────
async function askGrok(system, user, maxTokens = 2000) {
  const res = await grok.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    max_tokens: maxTokens,
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ],
  })
  return res.choices[0].message.content
}

// ── Safe JSON parse ───────────────────────────────────────────────────────────
function safeJson(raw) {
  try {
    const cleaned = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
    const match = cleaned.match(/(\{[\s\S]*\}|\[[\s\S]*\])/)
    return JSON.parse(match ? match[0] : cleaned)
  } catch {
    throw new Error('Failed to parse AI response as JSON. Raw: ' + raw.substring(0, 200))
  }
}

// ── Firecrawl: Search Google SERP ────────────────────────────────────────────
async function firecrawlSearch(query, limit = 10) {
  const res = await fetch('https://api.firecrawl.dev/v1/search', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${FIRECRAWL_KEY}`,
    },
    body: JSON.stringify({
      query,
      limit,
      scrapeOptions: { formats: ['markdown'] },
    }),
  })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Firecrawl search failed: ${res.status} — ${err}`)
  }
  const data = await res.json()
  return data.data || []
}

// ── Firecrawl: Scrape a single URL ────────────────────────────────────────────
async function firecrawlScrape(url) {
  try {
    const res = await fetch('https://api.firecrawl.dev/v1/scrape', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${FIRECRAWL_KEY}`,
      },
      body: JSON.stringify({
        url,
        formats: ['markdown'],
        onlyMainContent: true,
      }),
    })
    if (!res.ok) return null
    const data = await res.json()
    return data.data?.markdown || null
  } catch {
    return null
  }
}

async function firecrawlScrapeSerpOverview(query) {
  // Best-effort: may fail depending on Google blocking. We keep it optional.
  const url = `https://www.google.com/search?q=${encodeURIComponent(query)}&hl=en`
  try {
    const res = await fetch('https://api.firecrawl.dev/v1/scrape', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${FIRECRAWL_KEY}`,
      },
      body: JSON.stringify({
        url,
        formats: ['markdown'],
        onlyMainContent: false,
      }),
    })
    if (!res.ok) return null
    const data = await res.json()
    const md = data.data?.markdown || ''
    if (!md) return null

    // crude extraction: find an "AI Overview" section if present in markdown
    const idx = md.toLowerCase().indexOf('ai overview')
    if (idx === -1) return null
    return md.substring(Math.max(0, idx - 200), Math.min(md.length, idx + 2200))
  } catch {
    return null
  }
}

async function enforceExactWordCountMarkdown(draft, targetWords, contextLabel) {
  let current = draft || ''
  for (let attempt = 1; attempt <= 4; attempt++) {
    const wc = countWords(current)
    if (wc === targetWords) return current

    const direction = wc > targetWords ? 'shorten' : 'expand'
    const adjustRaw = await askGrok(
      'You are a precise editor. Return ONLY clean markdown. Preserve headings exactly. Do not add new sections.',
      `Task: ${direction} this markdown to EXACTLY ${targetWords} words.
Context: ${contextLabel}

STRICT:
- Output must include the same ## and ### headings already present (do not rename headings)
- Keep meaning and intent
- Keep first-person "I" voice
- Remove unnecessary commas and dashes
- DO NOT add disclaimers or meta commentary

Current word count (approx): ${wc}
TARGET: ${targetWords}

MARKDOWN TO FIX:
${current}`,
      1400
    )

    current = adjustRaw?.trim() || current
  }

  // Last resort: return best effort (we also surface count in logs)
  console.warn(`Word count enforcement failed for ${contextLabel}. Final wc=${countWords(current)} target=${targetWords}`)
  return current
}

// ── MAIN HANDLER ──────────────────────────────────────────────────────────────
export async function POST(req) {
  const userId = 'anonymous'
  const { topic, commercialIntent = 'informational' } = await req.json()
  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      function send(event, data) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ event, data })}\n\n`))
      }

      try {
        const prismaClient = getPrisma()
        if (!prismaClient) {
          send('error', { message: 'Database not configured' })
          controller.close()
          return
        }

        // Ensure user exists in DB
        let user = await prismaClient.user.findUnique({ where: { clerkId: userId } })
        if (!user) {
          // Get email from Clerk
          const clerkUser = await fetch(`https://api.clerk.dev/v1/users/${userId}`, {
            headers: { Authorization: `Bearer ${process.env.CLERK_SECRET_KEY}` },
          }).then(r => r.json())
          user = await prismaClient.user.create({
            data: {
              clerkId: userId,
              email: clerkUser.email_addresses[0]?.email_address || '',
            },
          })
        }

        // ── STEP 0: Topic SERP context (used for keyword/meta generation) ─────
        send('step', { id: 'serp', status: 'active', msg: `Checking SERP context for topic "${topic}"...` })
        const topicSerp = await firecrawlSearch(topic, 8)
        const topicSerpBrief = topicSerp
          .slice(0, 8)
          .map((r, i) => {
            const title = r.metadata?.title || r.title || 'Untitled'
            const url = r.url || r.metadata?.sourceURL || ''
            const snippet = (r.markdown || r.content || '').replace(/\s+/g, ' ').trim().substring(0, 220)
            return `${i + 1}. ${title}\n${url}\nSnippet: ${snippet}`
          })
          .join('\n\n')

        // ── STEP 1: Generate long-tail keyword ───────────────────────────────
        send('step', { id: 'keywords', status: 'active', msg: 'Generating long-tail keyword...' })

        const intentContext = commercialIntent === 'commercial' 
          ? 'Focus on keywords with commercial intent (product/service comparisons, pricing, buying guides, reviews).'
          : 'Focus on informational keywords (how-to, guides, tutorials, educational content).'

        const kwRaw = await askGrok(
          'You are an expert SEO strategist. Respond ONLY with valid JSON. No markdown, no explanation, no code blocks.',
          `Topic: "${topic}"
Content Type: ${commercialIntent === 'commercial' ? 'COMMERCIAL (selling product/service)' : 'INFORMATIONAL (educational)'}
${intentContext}

Here are real SERP results for the topic (titles/snippets). Use them to choose a long-tail keyword that matches what is ranking:
${topicSerpBrief || '(no SERP snippets available)'}

Generate the BEST SEO long-tail keyword strategy.

PRIMARY KEYWORD RULES (most important):
- Must be 4-6 words EXACTLY (long-tail format)
- Must include specific modifiers: location, type, use-case, pain point, or qualifier
- Must have high search intent and low competition
- Examples of good long-tail: "Best CRM software for small businesses UK", "How to choose project management tools 2025"
- Examples of BAD (too generic): "CRM software", "Best services", "UK tools"
- The keyword should answer a specific question or solve a specific problem

SECONDARY KEYWORDS (4 related long-tail keywords):
- Each 3-5 words with different angles
- Complement the primary keyword
- Should cover: comparisons, features, pricing, implementation, reviews

Return ONLY this JSON:
{"primaryKeyword":"MUST BE 4-6 WORDS WITH SPECIFIC MODIFIERS","secondaryKeywords":["...","...","...","..."]}`,
          300
        )
        const kw = safeJson(kwRaw)
        send('data', { primaryKeyword: kw.primaryKeyword, secondaryKeywords: kw.secondaryKeywords })
        send('step', { id: 'keywords', status: 'done' })

        // ── STEP 2: Meta data ─────────────────────────────────────────────────
        send('step', { id: 'meta', status: 'active', msg: 'Writing meta title, description & permalink...' })

        const metaRaw = await askGrok(
          'You are an expert SEO copywriter. Respond ONLY with valid JSON. No markdown.',
          `Primary keyword: "${kw.primaryKeyword}"
Topic: "${topic}"
Secondary keywords: ${kw.secondaryKeywords.join(', ')}

Real SERP titles/snippets for the topic (use this for wording patterns and intent matching):
${topicSerpBrief || '(no SERP snippets available)'}

Create:
- metaTitle: 50-60 chars, primary keyword near start, compelling
- metaDescription: 140-155 chars, include primary keyword, end with a CTA
- permalink: 3-5 word slug (lowercase, hyphens only, include main keyword)

Return ONLY: {"metaTitle":"...","metaDescription":"...","permalink":"..."}`,
          400
        )
        const meta = safeJson(metaRaw)
        send('data', { metaTitle: meta.metaTitle, metaDescription: meta.metaDescription, permalink: meta.permalink })
        send('step', { id: 'meta', status: 'done' })

        // ── STEP 3: Firecrawl SERP Search (primary keyword) ──────────────────
        send('step', { id: 'serp', status: 'active', msg: `Searching Google for primary keyword "${kw.primaryKeyword}"...` })
        const serpResults = await firecrawlSearch(kw.primaryKeyword, 10)
        const aiOverview = await firecrawlScrapeSerpOverview(kw.primaryKeyword)
        send('step', { id: 'serp', status: 'active', msg: `Found ${serpResults.length} results. Scraping top pages...` })

        // ── STEP 4: Scrape top 10 pages ───────────────────────────────────────
        send('step', { id: 'scraping', status: 'active', msg: 'Scraping content from top 10 pages...' })

        const scrapedPages = []
        for (let i = 0; i < Math.min(serpResults.length, 10); i++) {
          const result = serpResults[i]
          const url = result.url || result.metadata?.sourceURL
          const title = result.metadata?.title || result.title || url
          send('step', { id: 'scraping', status: 'active', msg: `Scraping page ${i + 1}/10: ${title?.substring(0, 50)}...` })

          // Use content already returned by search, OR scrape separately
          let content = result.markdown || result.content || ''
          if (!content && url) {
            content = await firecrawlScrape(url) || ''
          }

          scrapedPages.push({
            rank: i + 1,
            title,
            url,
            content: content.substring(0, 3000), // cap per page
          })
        }

        const serpSummary = scrapedPages.map(p => ({
          rank: p.rank,
          title: p.title,
          url: p.url,
          snippet: p.content.substring(0, 400),
        }))
        send('data', { serpData: { aiOverview: aiOverview || null, results: serpSummary } })
        send('step', { id: 'serp', status: 'done' })
        send('step', { id: 'scraping', status: 'done' })

        // ── STEP 5: Semantic keywords ─────────────────────────────────────────
        send('step', { id: 'semantic', status: 'active', msg: 'Extracting semantic & LSI keywords...' })

        const combinedContent = scrapedPages.map(p => p.content).join(' ').substring(0, 6000)
        const semRaw = await askGrok(
          'You are an NLP and semantic SEO expert. Respond ONLY with valid JSON. No markdown.',
          `Primary keyword: "${kw.primaryKeyword}"
Meta title: "${meta.metaTitle}"
Content from top 10 ranking pages (real scraped data):
${combinedContent}

Extract 25-35 semantic keywords, LSI keywords, and entities that must appear in a comprehensive blog post on this topic. Include: related questions, sub-topics, tools/brands, action phrases, statistical terms.

Return ONLY: {"semanticKeywords":["...","...",...]}`,
          600
        )
        const sem = safeJson(semRaw)
        send('data', { semanticKeywords: sem.semanticKeywords })
        send('step', { id: 'semantic', status: 'done' })

        // ── STEP 6: Blog structure ────────────────────────────────────────────
        send('step', { id: 'structure', status: 'active', msg: 'Planning 10-section blog structure...' })

        const competitorAngles = scrapedPages.slice(0, 6).map(p => `Rank ${p.rank} - "${p.title}": ${p.content.substring(0, 300)}`).join('\n\n')

        const ctaPrompt = commercialIntent === 'commercial' 
          ? 'Include a strong call-to-action: "Contact us for details", "Available worldwide", "Book a free consultation", or "Try it today"'
          : 'Include a helpful CTA: "Learn more", "Get started", "Join our community", or "Stay informed"'

        const structRaw = await askGrok(
          'You are an expert SEO content strategist. Respond ONLY with valid JSON. No markdown.',
          `Primary keyword: "${kw.primaryKeyword}"
Secondary keywords: ${kw.secondaryKeywords.join(', ')}
Semantic keywords: ${(sem.semanticKeywords || []).slice(0, 20).join(', ')}
Meta title: "${meta.metaTitle}"
Content Intent: ${commercialIntent === 'commercial' ? 'COMMERCIAL (Promote product/service)' : 'INFORMATIONAL (Educational guide)'}

What top competitors cover:
${competitorAngles}

Create a 10-section blog structure that SURPASSES all competitors in SEO depth, E-E-A-T, and user value.

MANDATORY EXACT SECTION STRUCTURE:
1. Introduction (type: "intro")
2-7. Body sections (type: "body") - each with unique competitor-beating angle
8. Conclusion (type: "conclusion")
9. Call-to-Action / Ready to Take Action (type: "cta") - ${commercialIntent === 'commercial' ? 'Promote your product/service' : 'Encourage next steps'}
10. Frequently Asked Questions (type: "faq") - EXACTLY 6 questions

CRITICAL REQUIREMENTS:
- Section 9 MUST be type "cta" with a clear call-to-action (not just discussion)
- Section 10 MUST be type "faq" - this is MANDATORY
- Section 10 H2 should be "Frequently Asked Questions About [keyword]" or similar
- Each H3 in section 10 will be: ### Question 1?, ### Question 2?, etc.
- H2 keywords must naturally include primary or secondary keywords
- H3s must be specific, detailed, and address competitor gaps

Return ONLY:
{"sections":[{"num":1,"h2":"...","h3s":["...","...","..."],"angle":"...","type":"intro|body|conclusion|cta|faq"}]}

Return all 10 sections with types correctly labeled.`,
          1800
        )
        const struct = safeJson(structRaw)
        send('data', { structure: struct.sections })
        send('step', { id: 'structure', status: 'done' })

        // ── STEP 7: Write 10 sections ─────────────────────────────────────────
        send('step', { id: 'writing', status: 'active', msg: 'Writing blog sections...' })

        const allSections = []
        const relevantContent = scrapedPages.map(p => p.content.substring(0, 800)).join('\n---\n').substring(0, 8000)

        // Log section structure for debugging
        console.log('Section structure:', JSON.stringify(struct.sections, null, 2))

        for (let i = 0; i < struct.sections.length; i++) {
          const sec = struct.sections[i]
          send('section_start', { index: i, h2: sec.h2 })

          const h3Block = (sec.h3s || []).map(h => `### ${h}`).join('\n')
          const isFaq = sec.type === 'faq' || sec.type?.toLowerCase().includes('faq')
          const isCta = sec.type === 'cta' || sec.type?.toLowerCase().includes('cta')
          
          if (isFaq) {
            send('step', { id: 'writing', status: 'active', msg: `Writing section ${i + 1}/10: FAQs...` })
          } else if (isCta) {
            send('step', { id: 'writing', status: 'active', msg: `Writing section ${i + 1}/10: Call-to-Action...` })
          }

          let sectionPrompt = `Write EXACTLY 400 words for this blog section.

Blog title: "${meta.metaTitle}"
Primary keyword: "${kw.primaryKeyword}"
Secondary keywords (weave in naturally): ${kw.secondaryKeywords.join(', ')}
Semantic keywords to include: ${(sem.semanticKeywords || []).slice(0, 10).join(', ')}
Content Intent: ${commercialIntent === 'commercial' ? 'COMMERCIAL - promote product/service benefits' : 'INFORMATIONAL - provide educational value'}

Real competitor content for reference (do NOT copy, use for context only):
${relevantContent.substring(0, 2000)}

SECTION TO WRITE:
## ${sec.h2}
${h3Block}

Angle/focus: ${sec.angle || 'practical, experience-based insights'}

STRICT RULES FOR ALL SECTIONS:
- EXACTLY 400 words — count carefully
- Include the ## H2 and ### H3 headings in your output
- Write in first person "I" as if personally tested everything
- Short paragraphs (2-4 sentences max)
- Use bullet points where helpful (max 5 items)
- NO phrases: "In conclusion", "It's worth noting", "Delve into", "As an AI", "Leverage", "Furthermore", "Moreover", "In essence"
- NO unnecessary commas or em-dashes
- Make content specific, practical, actionable`

          if (isFaq) {
            sectionPrompt += `
CRITICAL FAQ FORMAT:
- Write EXACTLY 6 FAQ questions (each as a separate ### heading)
- Format: ### Question 1? (or use natural question phrasing)
- Each answer must be EXACTLY 50-70 words, clear and direct
- Questions should be semantically related to: ${(sem.semanticKeywords || []).slice(0, 5).join(', ')}
- Address common pain points, objections, and misconceptions
- Use natural, conversational tone
- Include primary keyword "${kw.primaryKeyword}" in at least 2 answers naturally

EXAMPLE FORMAT:
### What is ${kw.primaryKeyword.split(' ')[0]}?
Answer here...

### How do I choose the best option?
Answer here...`
          } else if (isCta) {
            sectionPrompt += `
CRITICAL CTA SECTION FORMAT:
- Write a distinct, persuasive call-to-action section
- Include: problem statement (why this matters), solution, benefits, clear action
- ${commercialIntent === 'commercial' 
              ? 'CTA options: "Contact us for a free consultation", "Get in touch with our team", "Request a personalized quote", "Start your project today", "See what others are building"' 
              : 'CTA options: "Learn more by exploring our resources", "Get started on your journey", "Join our community", "Stay informed", "Take the next step"'}
- Make it feel personal, genuine, and non-pushy
- Include 1-2 trust signals if appropriate (testimonials, guarantees, credentials)
- Use power words: Transform, accelerate, achieve, unlock, discover
- Include a specific benefit or outcome`
          }

          const sectionContent = await askGrok(
            `You are a world-class SEO content writer. You write like a real human with personal, hands-on experience. Simple English. Active voice. First person "I". Zero AI filler. Extremely high quality, specific, and actionable content. E-E-A-T principles: Expertise, Experience, Authority, Trustworthiness.`,
            sectionPrompt,
            950
          )

          const fixed400 = await enforceExactWordCountMarkdown(
            sectionContent,
            400,
            `Section ${i + 1}/10 — ${sec.type || 'section'} — ${sec.h2}`
          )

          allSections.push(fixed400)
          send('section_done', { index: i, content: fixed400 })
        }

        send('step', { id: 'writing', status: 'done' })

        // ── STEP 8: Grammar + SEO polish ──────────────────────────────────────
        send('step', { id: 'grammar', status: 'active', msg: 'Running grammar & SEO quality check...' })

        const fullDraft = allSections.join('\n\n')
        const polished = await askGrok(
          'You are a professional editor and SEO specialist. Be surgical — fix ONLY what is broken. Return the complete corrected blog in clean markdown.',
          `Review this blog (approximately 4000 words with 10 sections). Fix ONLY:
1. Grammar errors and typos
2. Awkward or robotic-sounding sentences
3. Unnecessary commas and em-dashes  
4. Any inconsistency in first-person "I" voice
5. Sections missing the primary keyword "${kw.primaryKeyword}" — add it once naturally

CRITICAL - DO NOT CHANGE:
- Do NOT rewrite good sentences
- Do NOT change structure or headings
- Do NOT modify FAQ sections (preserve all ### Q? and ### Answer format)
- Do NOT modify CTA sections (preserve action-oriented language and CTAs)
- Do NOT remove or condense any content
- PRESERVE ALL 10 SECTIONS including CTA (Section 9) and FAQs (Section 10)

Return the COMPLETE corrected blog in clean markdown. Preserve all headings and structure exactly as provided.

BLOG:
${fullDraft}`,
          6000
        )
        send('data', { finalBlog: polished })
        send('step', { id: 'grammar', status: 'done' })

        // ── STEP 8.5: AI + plagiarism scoring (best-effort estimates) ─────────
        send('step', { id: 'detection', status: 'active', msg: 'Estimating AI % and plagiarism risk...' })

        const detectRaw = await askGrok(
          'You are a content quality auditor. Respond ONLY with valid JSON. No markdown.',
          `Estimate (best-effort) the likelihood this content will be flagged as AI-written and the risk of plagiarism.

IMPORTANT:
- You do NOT have access to the web. This is an estimate based on writing patterns only.
- Be conservative and helpful.

Return ONLY:
{
  "aiLikelihoodPercent": 0-100,
  "plagiarismRiskPercent": 0-100,
  "reasons": ["...","..."],
  "riskySentences": ["sentence 1","sentence 2","sentence 3"]
}

BLOG:
${polished.substring(0, 18000)}`,
          800
        )
        const detect = safeJson(detectRaw)
        send('data', {
          aiLikelihoodPercent: detect.aiLikelihoodPercent,
          plagiarismRiskPercent: detect.plagiarismRiskPercent,
          qualityReasons: detect.reasons,
        })

        // Optional: if AI estimate is high, do a surgical humanization pass
        let finalAfterHumanize = polished
        if (typeof detect.aiLikelihoodPercent === 'number' && detect.aiLikelihoodPercent > 18) {
          const risky = Array.isArray(detect.riskySentences) ? detect.riskySentences.slice(0, 10) : []
          const humanize = await askGrok(
            'You are a professional human editor. Be surgical. Return the complete corrected blog in clean markdown.',
            `Goal: Reduce AI-detection signals while keeping meaning, headings, and structure identical.

Rules:
- Fix ONLY sentences that sound robotic, templated, or repetitive
- Keep first-person "I"
- Keep simple English
- Avoid filler and hype
- Keep all headings exactly the same
- Do not change the section order

Sentences to focus on (rewrite these, and only touch nearby context if needed):
${risky.map(s => `- ${s}`).join('\n') || '(none provided)'}

BLOG:
${finalAfterHumanize}`,
            6000
          )
          finalAfterHumanize = humanize?.trim() || finalAfterHumanize
          send('data', { finalBlog: finalAfterHumanize })
        }

        send('step', { id: 'detection', status: 'done' })

        // ── STEP 9: Cover image ────────────────────────────────────────────────
        send('step', { id: 'image', status: 'active', msg: 'Generating cover image prompt...' })

        const imgPromptRaw = await askGrok(
          'You are a creative director. Write a single detailed image prompt only. No explanation. No quotes. One sentence, 50-100 words.',
          `Create a professional, visually striking blog cover image prompt for:
Title: "${meta.metaTitle}"
Topic: "${kw.primaryKeyword}"
Content Type: ${commercialIntent === 'commercial' ? 'Professional/Business' : 'Educational'}

Must include: modern aesthetic, professional design, relevant to topic, no text overlays, cinematic lighting, suitable for blog header (16:9 aspect ratio).
Style: ${commercialIntent === 'commercial' ? 'corporate, sleek, professional' : 'modern, educational, engaging'}`
        )
        const imgPrompt = imgPromptRaw.trim().replace(/"/g, '').replace(/\n/g, ' ')
        
        // Generate image using Pollinations (free & reliable)
        const imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(imgPrompt)}?width=1200&height=675&nologo=true&seed=${Math.random().toString(36).substr(2, 9)}`
        
        send('data', { coverImageUrl: imageUrl, imagePrompt: imgPrompt, imageGeneratedVia: 'pollinations' })
        send('step', { id: 'image', status: 'done' })

        // Save blog to DB
        await prismaClient.blog.create({
          data: {
            userId: user.id,
            topic,
            primaryKeyword: kw.primaryKeyword,
            secondaryKeywords: kw.secondaryKeywords,
            metaTitle: meta.metaTitle,
            metaDescription: meta.metaDescription,
            permalink: meta.permalink,
            semanticKeywords: sem.semanticKeywords,
            serpData: { aiOverview: aiOverview || null, results: serpSummary },
            structure: struct.sections,
            finalBlog: finalAfterHumanize,
            coverImageUrl: imageUrl,
            imagePrompt: imgPrompt,
            aiLikelihood: detect.aiLikelihoodPercent,
            plagiarismRisk: detect.plagiarismRiskPercent,
            qualityReasons: detect.reasons,
          },
        })

        send('done', { success: true })

      } catch (err) {
        console.error('Pipeline error:', err)
        send('error', { message: err.message || 'Something went wrong. Check your API keys.' })
      }

      controller.close();
    }
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    }
  });
}
