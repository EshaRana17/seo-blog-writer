import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { signToken } from '@/lib/auth'

const prisma = new PrismaClient()

export async function POST(req) {
  try {
    const { email, password, name } = await req.json()

    if (!email || !password) {
      return Response.json({ error: 'Email and password required' }, { status: 400 })
    }

    if (password.length < 6) {
      return Response.json({ error: 'Password must be at least 6 characters' }, { status: 400 })
    }

    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) {
      return Response.json({ error: 'Email already registered' }, { status: 400 })
    }

    const hashed = await bcrypt.hash(password, 12)
    const user = await prisma.user.create({
      data: { email, password: hashed, name: name || '' }
    })

    const token = signToken({ userId: user.id, email: user.email })

    const res = Response.json({
      success: true,
      user: { id: user.id, email: user.email, name: user.name, plan: user.plan }
    })

    res.headers.set('Set-Cookie', `auth_token=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=604800`)
    return res
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}