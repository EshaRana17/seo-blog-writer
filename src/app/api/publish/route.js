import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
export async function POST(req) {
  try {
    const session = await getSession()
    if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })
    const { blogId, wpUrl, wpUsername, wpPassword } = await req.json()
    const blog = await prisma.blog.findFirst({ where: { id: blogId, userId: session.userId } })
    if (!blog) return Response.json({ error: 'Blog not found' }, { status: 404 })
    const base64 = Buffer.from(wpUsername + ':' + wpPassword).toString('base64')
    const endpoint = wpUrl.replace(/\/+$/, '') + '/wp-json/wp/v2/posts'
    const wpRes = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Basic ' + base64 },
      body: JSON.stringify({ title: blog.metaTitle, content: blog.finalBlog, status: 'publish', slug: blog.permalink }),
    })
    if (!wpRes.ok) {
      const e = await wpRes.text()
      return Response.json({ error: 'WordPress error: ' + e }, { status: 400 })
    }
    await prisma.blog.update({ where: { id: blogId }, data: { wordpressPublished: true } })
    return Response.json({ success: true })
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}
