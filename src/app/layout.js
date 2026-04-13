import './globals.css'

export const metadata = {
  title: 'SEO Blog Writer - AI-Powered Content in Minutes',
  description: 'Generate 4000-word SEO-optimized blogs with real SERP research and competitor analysis.',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, padding: 0, background: '#07070f', fontFamily: '-apple-system, BlinkMacSystemFont, Segoe UI, sans-serif' }}>
        {children}
      </body>
    </html>
  )
}
