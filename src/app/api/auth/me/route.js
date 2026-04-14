export const dynamic = 'force-dynamic';

import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';

export async function GET() {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get('auth_token')?.value
    if (!token) return Response.json({ user: null })
    const parts = token.split('.')
    if (parts.length !== 3) return Response.json({ user: null })
    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString())
    if (payload.exp && payload.exp < Date.now() / 1000) return Response.json({ user: null })
    const uid = payload.sub || payload.user_id
    if (!uid) return Response.json({ user: null })
    const user = await prisma.user.findUnique({
      where: { firebaseId: uid },
      select: { id: true, email: true, name: true, plan: true, blogsUsed: true }
    })
    return Response.json({ user })
  } catch {
    return Response.json({ user: null })
  }
}