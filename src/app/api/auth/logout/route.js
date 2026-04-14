export const dynamic = 'force-dynamic';

export async function POST() {
  const res = Response.json({ success: true })
  res.headers.set('Set-Cookie', 'auth_token=; Path=/; HttpOnly; Max-Age=0')
  return res
}
