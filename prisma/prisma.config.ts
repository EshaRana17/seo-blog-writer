import { defineConfig } from 'prisma/config'

export default defineConfig({
  schema: './schema.prisma',
  db: {
    url: process.env.DATABASE_URL,
  },
})