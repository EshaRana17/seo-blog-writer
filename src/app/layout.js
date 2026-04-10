import './globals.css'
import { Providers } from './providers'
import Header from '../components/Header'
import Footer from '../components/Footer'

export const metadata = {
  title: 'SEO Blog Writer',
  description: 'AI-powered 4000-word SEO blog generator',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body style={{ background: '#07070f', minHeight: '100vh', color: '#f0f0ff' }}>
        <Providers>
          <Header />
          <main>{children}</main>
          <Footer />
        </Providers>
      </body>
    </html>
  )
}
