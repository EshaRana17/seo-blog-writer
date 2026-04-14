const fs = require('fs')

fs.writeFileSync('src/app/api/auth/me/route.js',
`import { PrismaClient } from '@prisma/client'
import { cookies } from 'next/headers'

const prisma = new PrismaClient()

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
}`)

fs.writeFileSync('src/app/api/auth/session/route.js',
`import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

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
}`)

console.log('Done!')