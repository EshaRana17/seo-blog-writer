const fs = require('fs')

// Fix src/lib/auth.js
fs.writeFileSync('src/lib/auth.js',
`import jwt from 'jsonwebtoken'
import { cookies } from 'next/headers'
const SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production'
export function signToken(payload) { return jwt.sign(payload, SECRET, { expiresIn: '7d' }) }
export function verifyToken(token) { try { return jwt.verify(token, SECRET) } catch { return null } }
export async function getSession() {
  const cookieStore = await cookies()
  const token = cookieStore.get('auth_token')?.value
  if (!token) return null
  return verifyToken(token)
}`)

// Fix src/lib/prisma.js
fs.writeFileSync('src/lib/prisma.js',
`import { PrismaClient } from '@prisma/client'
const globalForPrisma = global
export const prisma = globalForPrisma.prisma || new PrismaClient()
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
export default prisma`)

// Fix src/app/api/blogs/route.js - remove clerk
let blogsContent = fs.readFileSync('src/app/api/blogs/route.js', 'utf8')
blogsContent = blogsContent.replace(`import { auth } from '@clerk/nextjs/server'`, `import { getSession } from '@/lib/auth'`)
blogsContent = blogsContent.replace(`import { auth } from "@clerk/nextjs/server"`, `import { getSession } from '@/lib/auth'`)
blogsContent = blogsContent.replace(`const { userId } = auth()`, `const session = await getSession()\n  const userId = session?.userId`)
blogsContent = blogsContent.replace(`const { userId } = await auth()`, `const session = await getSession()\n  const userId = session?.userId`)
fs.writeFileSync('src/app/api/blogs/route.js', blogsContent)

// Fix src/app/api/generate/route.js - add prisma import
let generateContent = fs.readFileSync('src/app/api/generate/route.js', 'utf8')
if (!generateContent.includes('@/lib/prisma')) {
  generateContent = generateContent.replace(
    `import { PrismaClient } from '@prisma/client'`,
    `import { prisma as prismaClient } from '@/lib/prisma'`
  )
}
// Remove old getPrisma function and let prisma variable
generateContent = generateContent.replace(/let prisma\n\nfunction getPrisma[\s\S]*?return prisma\n\}/m, '')
generateContent = generateContent.replace(/let prisma\r?\nfunction getPrisma[\s\S]*?return prisma\r?\n\}/m, '')
fs.writeFileSync('src/app/api/generate/route.js', generateContent)

console.log('All fixed!')