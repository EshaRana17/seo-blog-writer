export async function POST(req) {
  const { token } = await req.json()
  const res = Response.json({ success: true })
  if (token) {
    res.headers.set('Set-Cookie', 'firebase_token=' + token + '; Path=/; HttpOnly; SameSite=Lax; Max-Age=3600')
  } else {
    res.headers.set('Set-Cookie', 'firebase_token=; Path=/; HttpOnly; Max-Age=0')
  }
  return res
}
