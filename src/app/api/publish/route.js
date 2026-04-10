import { auth } from '@clerk/nextjs/server'
import { PrismaClient } from '@prisma/client'

export const dynamic = 'force-dynamic'

let prisma

function getPrisma() {
  if (!prisma && process.env.DATABASE_URL) {
    prisma = new PrismaClient()
  }
  return prisma
}

export async function POST(req) {
  const { userId } = auth()
  if (!userId) return new Response('Unauthorized', { status: 401 })

  const { blogId, wpUrl, wpUsername, wpPassword } = await req.json()

  const prismaClient = getPrisma()
  if (!prismaClient) return new Response('Database not configured', { status: 500 })

  const blog = await prismaClient.blog.findFirst({
    where: { id: blogId, user: { clerkId: userId } },
  })

  if (!blog) return new Response('Blog not found', { status: 404 })

  // Publish to WordPress
  const wpApiUrl = `${wpUrl}/wp-json/wp/v2/posts`
  const auth = btoa(`${wpUsername}:${wpPassword}`)

  const postData = {
    title: blog.metaTitle,
    content: blog.finalBlog.replace(/\n/g, '<br>'), // Simple conversion
    status: 'publish',
    slug: blog.permalink,
    excerpt: blog.metaDescription,
    meta: {
      _yoast_wpseo_title: blog.metaTitle,
      _yoast_wpseo_metadesc: blog.metaDescription,
      _yoast_wpseo_focuskw: blog.primaryKeyword,
    },
  }

  const res = await fetch(wpApiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Basic ${auth}`,
    },
    body: JSON.stringify(postData),
  })

  if (!res.ok) {
    const error = await res.text()
    return new Response(`Failed to publish: ${error}`, { status: res.status })
  }

  // Update blog as published
  await prismaClient.blog.update({
    where: { id: blogId },
    data: { wordpressPublished: true, wordpressUrl: wpUrl },
  })

  return Response.json({ success: true })
}