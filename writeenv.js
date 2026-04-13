const fs = require('fs')

// Read existing .env.local and remove old firebase/clerk lines
let existing = ''
try {
  existing = fs.readFileSync('.env.local', 'utf8')
} catch {}

// Keep only these keys
const keepKeys = ['GROK_API_KEY', 'FIRECRAWL_API_KEY', 'GOOGLE_AI_API_KEY', 'DATABASE_URL']
const kept = existing.split('\n').filter(line => {
  const key = line.split('=')[0].trim()
  return keepKeys.includes(key) && line.trim() !== ''
}).join('\n')

const firebaseVars = `
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyA0q46U9f_MiRMEiozK_BjnkAXVCmKspIQ
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=buildwithesha.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=buildwithesha
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=buildwithesha.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=238244949437
NEXT_PUBLIC_FIREBASE_APP_ID=1:238244949437:web:31b87a225f47c2484c36d4

FIREBASE_PROJECT_ID=buildwithesha
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-fbsvc@buildwithesha.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQCXA/lLXO7/2eEb\\nZrSmoToTfD2iso4z0V22uMbCb+d5NMhgOFkZg5MpyzaDR6Sbmp36N+jHNW81bqAy\\nRZnp0a4swjQI37J6YvzPZ6lZwyb84O/x42jYLvh0xh42ymesrHcXZLYrFXYMEAEd\\nJ7tsm0srEqQlUgvvuwIRzaew8bgI/i4vKpJd+WwSwrMpGL3HzCtQ29LMVnpOkcLf\\nd2luI+P/Cl8ZAbEvwy/z6WR8pNQtgGDs+JL+WEE4o7jazahN9DMoOt777YhNGh/x\\nAoVEVE54Pss1DK3fOtlKOw0yaa8squRr6JJ4j9/1y7NSuypJObbORZ15/bpnR6ck\\nvpm66NrLAgMBAAECggEABU0N6K/T8eY3iSszRzAcpkdzsGzdIgOE6x+UVonwEaih\\nKgOAWS1tsodgG/6dUBr+1aQ1xxxgkXsXI3ye+P6zwv10LyWPEc28uxkT8EMx8KmC\\nsrZ9XS1U6mBz+g9j0UNikM8nt95yfNzo9RmKcjcHTfVDDs5Q/fLOEUrrSoJJqAMa\\nVQpMjvZynH0tIu5ew/pjLVCyN/KlFRol86ia+jnaDGDeptRUg8Df+hiVsiibduIV\\nH0JuatKZcA2dz69GHhKvqMWz0IkTRugY6Wiugxh/dMTejlg69AHxprqnL2Rtlpcb\\nAm9zV3NEphsqjFZnEY4z8wVNPaUd48HUttiAr2wwDQKBgQDF59nMi4DDaQWfV5Dz\\nHwmB3p9VKzBFBV+IhTeGi0c3jupYSEF2Ezzw60OHnOimljw0lxhTtF5BlimLWhx6\\n314re1NICWWpeTeYTdZJeoUeMIRpn75Idiip96dFPVYAIL8RliBQJMGdhHnDoLQ3\\nlb6oFyeqsuUEEVrOkMjVp94V1QKBgQDDWHAkjE7555QOhU2DvClpcAZZZEtRFBcD\\nkYyniXeoBE3CaV+oNlqLCpaj+5O2zOXrFlQ8s4YggECpNnVxKbm5nfPunBQMdF1n\\nQRGleT3LmPtjZUHJ0HY1Qb13DTZLSChnjnTEpcBWp2w8pS4EkPQhN/OTwBoLM2de\\nX2lh7wBeHwKBgD+T8lZR4rXkQVglS32vVOCR4mH8E++4gC5dja79g42HriVaYR1L\\npOJI0lL4x4zs6r6CY+BQK4+qbAJGmqumopwZbHHSAwTk2kVljBfi8mz2bTN5jCm/\\nO+UOmIAX6k70Ni2yKwNUK5cs/eko8XyB8NQTTDz8Z7Jc2O1PehWZbjFZAoGBAILU\\nFCcmIS6Vvj8LYCK+Pi3zbQ0pcpfWkKM/M6hxFMZeO4Xc9Me/v1wnt0QUFZX0HHgZ\\n+Ei/IzFZM/UgF/+2JkD+XISN24+Lz5J7rcnZLV3SE2s6QZlcGA8K/E1jd91rckQI\\n0INzTyG592+WYP+F5TrqMiPeIJMn1i8KT5Xbb6+ZAoGBALEnAYbf46Ni8CfCT5p3\\nAvGCAwE89w/cXyHxdIG4kf+VJhKfLuKUXehItz+qEDn0OaJgdVkM50L6oP0J1rgC\\nDROPDDA7t+2O6fXxlhBzX8IJiNjmFxKYZyJcdHbunZAPMFOR3QOswo28vHPkXgPB\\ncwRxtBWW1ExLysecv77OE/yH\\n-----END PRIVATE KEY-----\\n"
`

fs.writeFileSync('.env.local', kept + firebaseVars, 'utf8')
console.log('Written .env.local')
console.log('\nVerifying keys present:')
const written = fs.readFileSync('.env.local', 'utf8')
;['DATABASE_URL', 'GROK_API_KEY', 'FIRECRAWL_API_KEY', 'NEXT_PUBLIC_FIREBASE_API_KEY', 'FIREBASE_PRIVATE_KEY', 'FIREBASE_CLIENT_EMAIL'].forEach(k => {
  console.log((written.includes(k) ? 'OK' : 'MISSING') + ' ' + k)
})
console.log('\nNow run:')
console.log('node fix8.js')
console.log('node fix9.js')
console.log('npm install firebase firebase-admin')
console.log('npx prisma migrate dev --name firebase-auth')
console.log('npm run dev')
