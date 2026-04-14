import { PrismaClient } from '@prisma/client'

const prismaClientSingleton = () => {
  return new PrismaClient()
}

const globalForPrisma = globalThis

// 1. Define the instance
const prismaInstance = globalForPrisma.prisma ?? prismaClientSingleton()

// 2. Export as BOTH default and named to satisfy all your API routes
export const prisma = prismaInstance
export default prismaInstance

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prismaInstance