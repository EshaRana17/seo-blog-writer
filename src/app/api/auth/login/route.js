import { prisma } from '@/lib/prisma'
import { signToken } from '@/lib/auth'
import bcrypt from 'bcryptjs'
export async function POST(req) {
  try {
    const { email, password } = await req.json()
    const user = await prisma.user.findUnique({ where: { email } })
    if (!user) return Response.json({ error: 'Invalid email or password' }, { status: 401 })
    const valid = await bcrypt.compare(password, user.password)
    if (!valid) return Response.json({ error: 'Invalid email or password' }, { status: 401 })
    const token = signToken({ userId: user.id, email: user.email })
    const res = Response.json({ success: true, user: { id: user.id, email: user.email, name: user.name, plan: user.plan } })
    res.headers.set('Set-Cookie', 'auth_token=' + token + '; Path=/; HttpOnly; SameSite=Lax; Max-Age=604800')
    return res
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}
