const fs = require('fs')

// Fix prisma.config.ts
fs.writeFileSync('prisma.config.ts', [
  'import "dotenv/config"',
  'import { defineConfig } from "prisma/config"',
  'export default defineConfig({',
  '  schema: "prisma/schema.prisma",',
  '  datasource: { url: process.env.DATABASE_URL }',
  '})'
].join('\n'), 'utf8')
console.log('Fixed prisma.config.ts')

// Check what is causing the reload loop in page.js
const page = fs.readFileSync('src/app/page.js', 'utf8')
const idx = page.indexOf('useEffect')
if (idx > -1) {
  console.log('\npage.js useEffect block:')
  console.log(page.substring(idx, idx + 500))
} else {
  console.log('No useEffect found in page.js')
}

// Check Header.jsx for any reload-causing code
try {
  const header = fs.readFileSync('src/components/Header.jsx', 'utf8')
  const hidx = header.indexOf('useEffect')
  if (hidx > -1) {
    console.log('\nHeader.jsx useEffect:')
    console.log(header.substring(hidx, hidx + 300))
  }
} catch {}

console.log('\nNow run: npx prisma migrate dev --name init')