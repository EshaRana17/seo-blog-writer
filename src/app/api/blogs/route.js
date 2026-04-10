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

export async function GET() {
  const { userId } = auth()
  if (!userId) return new Response('Unauthorized', { status: 401 })

  const prismaClient = getPrisma()
  if (!prismaClient) return new Response('Database not configured', { status: 500 })

  const user = await prismaClient.user.findUnique({
    where: { clerkId: userId },
    include: { blogs: { orderBy: { createdAt: 'desc' } } },
  })

  if (!user) return new Response('User not found', { status: 404 })

  return Response.json(user.blogs)
}