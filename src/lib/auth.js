import { adminAuth } from './firebase-admin'
import { cookies } from 'next/headers'

export async function getSession() {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get('firebase_token')?.value
    if (!token) return null
    const decoded = await adminAuth.verifyIdToken(token)
    return { userId: decoded.uid, email: decoded.email, name: decoded.name }
  } catch {
    return null
  }
}
