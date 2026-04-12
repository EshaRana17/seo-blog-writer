import { PrismaClient } from '@prisma/client'

function getPrismaClient() {
  if (typeof globalThis._prisma === 'undefined') {
    globalThis._prisma = new PrismaClient()
  }
  return globalThis._prisma
}

export const prisma = new Proxy({}, {
  get(_, prop) {
    return getPrismaClient()[prop]
  }
})

export default prisma