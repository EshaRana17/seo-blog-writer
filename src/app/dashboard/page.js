'use client'

import { useUser } from '@clerk/nextjs'
import { useState, useEffect } from 'react'

export default function Dashboard() {
  const { user } = useUser()
  const [blogs, setBlogs] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (user) {
      fetchBlogs()
    }
  }, [user])

  const fetchBlogs = async () => {
    const res = await fetch('/api/blogs')
    if (res.ok) {
      const data = await res.json()
      setBlogs(data)
    }
    setLoading(false)
  }

  const publishToWordPress = async (blogId, wpUrl, wpUsername, wpPassword) => {
    const res = await fetch('/api/publish', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ blogId, wpUrl, wpUsername, wpPassword }),
    })
    if (res.ok) {
      alert('Published to WordPress!')
      fetchBlogs()
    } else {
      alert('Failed to publish')
    }
  }

  if (loading) return <div style={{ textAlign: 'center', padding: 40, color: '#f0f0ff' }}>Loading...</div>

  return (
    <div style={{ minHeight: '100vh', background: '#07070f', padding: '80px 20px 40px' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <h1 style={{ fontSize: 32, fontWeight: 800, color: '#f0f0ff', marginBottom: 32 }}>Your Blogs</h1>
        {blogs.length === 0 ? (
          <p style={{ color: '#9090a8' }}>No blogs yet. <a href="/" style={{ color: '#8b5cf6' }}>Create your first blog</a></p>
        ) : (
          <div style={{ display: 'grid', gap: 20 }}>
            {blogs.map(blog => (
              <div key={blog.id} style={{
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.07)',
                borderRadius: 12,
                padding: 24,
              }}>
                <h2 style={{ color: '#f0f0ff', fontSize: 20, marginBottom: 8 }}>{blog.metaTitle}</h2>
                <p style={{ color: '#9090a8', marginBottom: 16 }}>{blog.topic}</p>
                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                  <button style={{
                    padding: '8px 16px',
                    borderRadius: 6,
                    border: '1px solid #8b5cf6',
                    background: 'transparent',
                    color: '#a78bfa',
                    cursor: 'pointer',
                  }}>
                    View Blog
                  </button>
                  <button style={{
                    padding: '8px 16px',
                    borderRadius: 6,
                    border: '1px solid #22c55e',
                    background: 'transparent',
                    color: '#22c55e',
                    cursor: 'pointer',
                  }}>
                    Download MD
                  </button>
                  {!blog.wordpressPublished && (
                    <WordPressPublishForm blog={blog} onPublish={publishToWordPress} />
                  )}
                  {blog.wordpressPublished && (
                    <span style={{ color: '#22c55e' }}>Published to WordPress</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function WordPressPublishForm({ blog, onPublish }) {
  const [wpUrl, setWpUrl] = useState('')
  const [wpUsername, setWpUsername] = useState('')
  const [wpPassword, setWpPassword] = useState('')
  const [show, setShow] = useState(false)

  const handleSubmit = (e) => {
    e.preventDefault()
    onPublish(blog.id, wpUrl, wpUsername, wpPassword)
  }

  return (
    <div>
      <button onClick={() => setShow(!show)} style={{
        padding: '8px 16px',
        borderRadius: 6,
        border: '1px solid #f59e0b',
        background: 'transparent',
        color: '#f59e0b',
        cursor: 'pointer',
      }}>
        Publish to WordPress
      </button>
      {show && (
        <form onSubmit={handleSubmit} style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <input
            type="url"
            placeholder="WordPress Site URL"
            value={wpUrl}
            onChange={(e) => setWpUrl(e.target.value)}
            required
            style={{ padding: 8, borderRadius: 4, border: '1px solid #ccc' }}
          />
          <input
            type="text"
            placeholder="Username"
            value={wpUsername}
            onChange={(e) => setWpUsername(e.target.value)}
            required
            style={{ padding: 8, borderRadius: 4, border: '1px solid #ccc' }}
          />
          <input
            type="password"
            placeholder="Application Password"
            value={wpPassword}
            onChange={(e) => setWpPassword(e.target.value)}
            required
            style={{ padding: 8, borderRadius: 4, border: '1px solid #ccc' }}
          />
          <button type="submit" style={{
            padding: '8px 16px',
            borderRadius: 6,
            border: 'none',
            background: '#8b5cf6',
            color: '#fff',
            cursor: 'pointer',
          }}>
            Publish
          </button>
        </form>
      )}
    </div>
  )
}