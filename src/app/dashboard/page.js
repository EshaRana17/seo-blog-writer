export default function Dashboard() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

useEffect(() => {
    fetch('/api/auth/me')
      .then(r => r.json())
      .then(data => {
        if (data.user) {
          setUser(data.user)
          // Move fetchBlogs here so it only runs if user exists
          fetch('/api/blogs')
            .then(res => res.json())
            .then(blogsData => setBlogs(blogsData))
            .finally(() => setLoading(false))
        } else {
          // If no user, send them to the landing page
          window.location.href = '/'
        }
      })
      .catch(() => {
        window.location.href = '/'
      })
  }, [])

  if (loading) return <div className="min-h-screen bg-[#07070f] flex items-center justify-center text-white">Verifying Session...</div>


  async function fetchBlogs() {
    try {
      const res = await fetch('/api/blogs')
      if (res.ok) { const data = await res.json(); setBlogs(data) }
    } catch {}
    setLoading(false)
  }

  function downloadMd(blog) {
    const content = '---\ntitle: "' + blog.metaTitle + '"\ndescription: "' + blog.metaDescription + '"\nprimary_keyword: "' + blog.primaryKeyword + '"\n---\n\n' + blog.finalBlog
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([content], { type: 'text/markdown' }))
    a.download = (blog.permalink || 'blog') + '.md'
    a.click()
  }

  async function deleteBlog(id) {
    if (!confirm('Delete this blog?')) return
    await fetch('/api/blogs?id=' + id, { method: 'DELETE' })
    setBlogs(prev => prev.filter(b => b.id !== id))
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#07070f', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9090a8' }}>
      Loading...
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: '#07070f', paddingBottom: 80 }}>
      <div style={{ background: 'rgba(7,7,15,0.94)', borderBottom: '1px solid rgba(255,255,255,0.08)', position: 'sticky', top: 0, zIndex: 100 }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <a href="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
            <div style={{ width: 32, height: 32, borderRadius: 10, background: 'linear-gradient(135deg,#7c3aed,#a855f7)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>&#9997;</div>
            <span style={{ fontWeight: 900, fontSize: 18, color: '#f0f0ff' }}><span style={{ color: '#8b5cf6' }}>SEO</span> Blog Writer</span>
          </a>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {user && <span style={{ fontSize: 13, color: '#9090a8' }}>{user.email}</span>}
            <a href="/" style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid rgba(139,92,246,0.3)', background: 'rgba(139,92,246,0.1)', color: '#a78bfa', textDecoration: 'none', fontSize: 13 }}>+ New Blog</a>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '40px 20px' }}>
        {user && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 16, marginBottom: 40 }}>
            {[
              { label: 'Total Blogs', value: blogs.length },
              { label: 'Plan', value: user.plan ? user.plan.toUpperCase() : 'FREE' },
              { label: 'Blogs Used', value: (user.blogsUsed || 0) + ' / ' + (user.plan === 'free' ? '2' : 'inf') },
              { label: 'Published', value: blogs.filter(b => b.wordpressPublished).length }
            ].map(s => (
              <div key={s.label} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, padding: '16px 20px' }}>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)', fontWeight: 600, letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 6 }}>{s.label}</div>
                <div style={{ fontSize: 24, fontWeight: 800, color: '#f0f0ff' }}>{s.value}</div>
              </div>
            ))}
          </div>
        )}

        <h1 style={{ fontSize: 28, fontWeight: 800, color: '#f0f0ff', marginBottom: 24 }}>Your Blogs</h1>

        {blogs.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16 }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>&#9997;</div>
            <p style={{ color: '#9090a8', fontSize: 16, marginBottom: 20 }}>No blogs yet.</p>
            <a href="/" style={{ padding: '12px 28px', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg,#7c3aed,#a855f7)', color: '#fff', textDecoration: 'none', fontSize: 14, fontWeight: 700 }}>Create Your First Blog</a>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: 16 }}>
            {blogs.map(blog => (
              <BlogCard key={blog.id} blog={blog} onDownload={downloadMd} onDelete={deleteBlog} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function BlogCard({ blog, onDownload, onDelete }) {
  const [expanded, setExpanded] = useState(false)
  const [showWP, setShowWP] = useState(false)
  const [wpUrl, setWpUrl] = useState('')
  const [wpUser, setWpUser] = useState('')
  const [wpPass, setWpPass] = useState('')
  const wordCount = blog.finalBlog ? blog.finalBlog.split(/\s+/).filter(Boolean).length : 0

  async function publish() {
    const res = await fetch('/api/publish', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ blogId: blog.id, wpUrl, wpUsername: wpUser, wpPassword: wpPass }) })
    if (res.ok) alert('Published to WordPress!')
    else alert('Failed to publish. Check credentials.')
  }

  return (
    <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14, padding: 24 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
        <div style={{ flex: 1 }}>
          <h2 style={{ color: '#f0f0ff', fontSize: 18, fontWeight: 700, marginBottom: 6 }}>{blog.metaTitle}</h2>
          <p style={{ color: '#9090a8', fontSize: 13, marginBottom: 10 }}>{blog.topic}</p>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{ fontSize: 11, padding: '3px 10px', borderRadius: 99, background: 'rgba(139,92,246,0.12)', border: '1px solid rgba(139,92,246,0.2)', color: '#a78bfa' }}>{blog.primaryKeyword}</span>
            <span style={{ fontSize: 11, color: '#9090a8' }}>{wordCount.toLocaleString()} words</span>
            <span style={{ fontSize: 11, color: '#9090a8' }}>{new Date(blog.createdAt).toLocaleDateString()}</span>
            {blog.aiLikelihood != null && <span style={{ fontSize: 11, color: blog.aiLikelihood > 50 ? '#f87171' : blog.aiLikelihood > 25 ? '#fbbf24' : '#22c55e' }}>AI: {blog.aiLikelihood}%</span>}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button onClick={() => setExpanded(!expanded)} style={{ padding: '8px 14px', borderRadius: 8, border: '1px solid rgba(139,92,246,0.3)', background: 'transparent', color: '#a78bfa', cursor: 'pointer', fontSize: 12 }}>{expanded ? 'Hide' : 'View'}</button>
          <button onClick={() => onDownload(blog)} style={{ padding: '8px 14px', borderRadius: 8, border: '1px solid rgba(34,197,94,0.3)', background: 'transparent', color: '#22c55e', cursor: 'pointer', fontSize: 12 }}>Download</button>
          <button onClick={() => onDelete(blog.id)} style={{ padding: '8px 14px', borderRadius: 8, border: '1px solid rgba(255,80,80,0.2)', background: 'transparent', color: '#f87171', cursor: 'pointer', fontSize: 12 }}>Delete</button>
        </div>
      </div>

      {expanded && (
        <div style={{ marginTop: 20, borderTop: '1px solid rgba(255,255,255,0.07)', paddingTop: 20 }}>
          <div style={{ maxHeight: 400, overflowY: 'auto', background: '#0d0d1a', borderRadius: 10, padding: 16, fontSize: 13, color: '#d0d0e8', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{blog.finalBlog}</div>
          {!blog.wordpressPublished ? (
            <div style={{ marginTop: 16 }}>
              <button onClick={() => setShowWP(!showWP)} style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid rgba(245,158,11,0.3)', background: 'transparent', color: '#f59e0b', cursor: 'pointer', fontSize: 12 }}>{showWP ? 'Cancel' : 'Publish to WordPress'}</button>
              {showWP && (
                <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 10, maxWidth: 400 }}>
                  <input type="url" placeholder="WordPress URL" value={wpUrl} onChange={e => setWpUrl(e.target.value)} style={{ padding: '10px 14px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)', color: '#f0f0ff', fontSize: 13 }} />
                  <input placeholder="Username" value={wpUser} onChange={e => setWpUser(e.target.value)} style={{ padding: '10px 14px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)', color: '#f0f0ff', fontSize: 13 }} />
                  <input type="password" placeholder="Application Password" value={wpPass} onChange={e => setWpPass(e.target.value)} style={{ padding: '10px 14px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)', color: '#f0f0ff', fontSize: 13 }} />
                  <button onClick={publish} style={{ padding: '10px 20px', borderRadius: 8, border: 'none', background: 'linear-gradient(135deg,#7c3aed,#a855f7)', color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 700 }}>Publish Now</button>
                </div>
              )}
            </div>
          ) : (
            <div style={{ marginTop: 12, color: '#22c55e', fontSize: 13 }}>Published to WordPress</div>
          )}
        </div>
      )}
    </div>
  )
}
