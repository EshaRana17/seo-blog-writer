export const dynamic = 'force-dynamic';

import { prisma } from '@/lib/prisma';

export async function POST(req) {
  try {
    const { token } = await req.json()
    const parts = token.split('.')
    if (parts.length !== 3) return Response.json({ error: 'Invalid token' }, { status: 401 })
    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString())
    const uid = payload.sub || payload.user_id
    const email = payload.email || ''
    const name = payload.name || ''
    if (!uid) return Response.json({ error: 'No user id' }, { status: 401 })
    let user = await prisma.user.findUnique({ where: { firebaseId: uid } })
    if (!user) {
      user = await prisma.user.create({ data: { firebaseId: uid, email, name } })
    }
    const res = Response.json({ success: true, user: { id: user.id, email: user.email, name: user.name, plan: user.plan, blogsUsed: user.blogsUsed } })
    res.headers.set('Set-Cookie', 'auth_token=' + token + '; Path=/; HttpOnly; SameSite=Lax; Max-Age=604800')
    return res
  } catch (err) {
    return Response.json({ error: err.message }, { status: 401 })
  }
}