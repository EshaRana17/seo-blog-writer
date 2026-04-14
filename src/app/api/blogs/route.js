export const dynamic = 'force-dynamic';

import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'

export async function GET() {
  try {
    const session = await getSession()
    if (!session) return Response.json([], { status: 401 })
    const blogs = await prisma.blog.findMany({
      where: { userId: session.userId },
      orderBy: { createdAt: 'desc' },
      select: { id: true, topic: true, primaryKeyword: true, secondaryKeywords: true,
        metaTitle: true, metaDescription: true, permalink: true, finalBlog: true,
        coverImageUrl: true, aiLikelihood: true, plagiarismRisk: true,
        wordpressPublished: true, createdAt: true }
    })
    return Response.json(blogs)
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}
export async function DELETE(req) {
  try {
    const session = await getSession()
    if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })
    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')
    if (!id) return Response.json({ error: 'Missing id' }, { status: 400 })
    await prisma.blog.deleteMany({ where: { id, userId: session.userId } })
    return Response.json({ success: true })
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}
