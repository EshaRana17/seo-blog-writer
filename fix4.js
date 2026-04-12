const fs = require('fs')

// Prisma v7 requires explicit datasource url at runtime, not build time
// The fix is to lazy-initialize PrismaClient only when actually called
fs.writeFileSync('src/lib/prisma.js', [
  "import { PrismaClient } from '@prisma/client'",
  "",
  "function getPrismaClient() {",
  "  if (typeof globalThis._prisma === 'undefined') {",
  "    globalThis._prisma = new PrismaClient()",
  "  }",
  "  return globalThis._prisma",
  "}",
  "",
  "export const prisma = new Proxy({}, {",
  "  get(_, prop) {",
  "    return getPrismaClient()[prop]",
  "  }",
  "})",
  "",
  "export default prisma"
].join('\n'), 'utf8')

console.log('Fixed src/lib/prisma.js')
console.log('Now run: npm run build')
