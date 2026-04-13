import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'

export async function GET() {
  try {
    const session = await getSession()
    if (!session) return Response.json({ user: null })
    let user = await prisma.user.findUnique({ where: { firebaseId: session.userId } })
    if (!user) {
      user = await prisma.user.create({
        data: { firebaseId: session.userId, email: session.email || '', name: session.name || '' }
      })
    }
    return Response.json({ user: { id: user.id, email: user.email, name: user.name, plan: user.plan, blogsUsed: user.blogsUsed } })
  } catch {
    return Response.json({ user: null })
  }
}
