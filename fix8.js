const fs = require('fs')

// Fix 1: prisma.config.ts - remove datasource override so it reads from .env.local
fs.writeFileSync('prisma.config.ts', [
  'import "dotenv/config"',
  'import { defineConfig } from "prisma/config"',
  'export default defineConfig({',
  '  schema: "prisma/schema.prisma"',
  '})'
].join('\n'), 'utf8')
console.log('Fixed prisma.config.ts - removed datasource override')

// Fix 2: prisma/schema.prisma - update User model to work with Firebase (no password field)
fs.writeFileSync('prisma/schema.prisma', [
  'generator client {',
  '  provider = "prisma-client-js"',
  '}',
  '',
  'datasource db {',
  '  provider = "postgresql"',
  '  url      = env("DATABASE_URL")',
  '}',
  '',
  'model User {',
  '  id        String   @id @default(cuid())',
  '  firebaseId String  @unique',
  '  email     String   @unique',
  '  name      String?',
  '  plan      String   @default("free")',
  '  blogsUsed Int      @default(0)',
  '  blogs     Blog[]',
  '  createdAt DateTime @default(now())',
  '}',
  '',
  'model Blog {',
  '  id                 String   @id @default(cuid())',
  '  userId             String',
  '  user               User     @relation(fields: [userId], references: [id], onDelete: Cascade)',
  '  topic              String',
  '  primaryKeyword     String',
  '  secondaryKeywords  String[]',
  '  metaTitle          String',
  '  metaDescription    String',
  '  permalink          String',
  '  semanticKeywords   String[]',
  '  serpData           Json?',
  '  structure          Json?',
  '  finalBlog          String',
  '  coverImageUrl      String?',
  '  imagePrompt        String?',
  '  aiLikelihood       Int?',
  '  plagiarismRisk     Int?',
  '  qualityReasons     String[]',
  '  wordpressPublished Boolean  @default(false)',
  '  createdAt          DateTime @default(now())',
  '}'
].join('\n'), 'utf8')
console.log('Fixed prisma/schema.prisma - updated for Firebase')

console.log('\nNow run these commands:')
console.log('1. npx prisma migrate dev --name firebase-auth')
console.log('2. Then come back for Firebase setup instructions')
