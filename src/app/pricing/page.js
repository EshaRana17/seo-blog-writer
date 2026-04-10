export default function Pricing() {
  const C = {
    bg: '#07070f',
    card: 'rgba(255,255,255,0.03)',
    border: 'rgba(255,255,255,0.07)',
    purple: '#8b5cf6',
    purpleLight: '#a78bfa',
    green: '#22c55e',
    textPrimary: '#f0f0ff',
    textSecondary: '#9090a8',
  }

  const plans = [
    {
      name: 'Basic',
      price: '$9/month',
      features: ['5 blogs/month', 'Basic SEO optimization', 'Email support'],
    },
    {
      name: 'Pro',
      price: '$29/month',
      features: ['Unlimited blogs', 'Advanced SEO + E-E-A-T', 'Priority support', 'WordPress integration'],
      popular: true,
    },
    {
      name: 'Enterprise',
      price: 'Custom',
      features: ['Everything in Pro', 'Custom integrations', 'Dedicated account manager'],
    },
  ]

  return (
    <div style={{ minHeight: '100vh', background: C.bg, padding: '80px 20px 40px' }}>
      <div style={{ maxWidth: 1000, margin: '0 auto' }}>
        <h1 style={{ textAlign: 'center', fontSize: 'clamp(30px,5vw,54px)', fontWeight: 800, lineHeight: 1.1, letterSpacing: '-1.5px', marginBottom: 18, color: C.textPrimary }}>
          Choose Your Plan
        </h1>
        <p style={{ textAlign: 'center', color: C.textSecondary, fontSize: 16, maxWidth: 500, margin: '0 auto 52px', lineHeight: 1.7 }}>
          Unlock the power of AI-driven SEO blog writing. Start with Basic or go Pro for unlimited content.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 24 }}>
          {plans.map(plan => (
            <div
              key={plan.name}
              style={{
                background: C.card,
                border: plan.popular ? `2px solid ${C.purple}` : `1px solid ${C.border}`,
                borderRadius: 16,
                padding: 32,
                textAlign: 'center',
                position: 'relative',
              }}
            >
              {plan.popular && (
                <div style={{
                  position: 'absolute',
                  top: -12,
                  left: '50%',
                  transform: 'translateX(-50%)',
                  background: C.purple,
                  color: '#fff',
                  padding: '4px 12px',
                  borderRadius: 12,
                  fontSize: 12,
                  fontWeight: 600,
                }}>
                  Most Popular
                </div>
              )}
              <h3 style={{ fontSize: 24, fontWeight: 700, color: C.textPrimary, marginBottom: 8 }}>{plan.name}</h3>
              <div style={{ fontSize: 36, fontWeight: 800, color: C.purple, marginBottom: 24 }}>{plan.price}</div>
              <ul style={{ listStyle: 'none', padding: 0, marginBottom: 32 }}>
                {plan.features.map(f => (
                  <li key={f} style={{ color: C.textSecondary, marginBottom: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                    <span style={{ color: C.green }}>✓</span> {f}
                  </li>
                ))}
              </ul>
              {plan.name === 'Enterprise' ? (
                <a
                  href="https://wa.me/923106267568"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'inline-block',
                    padding: '12px 24px',
                    borderRadius: 10,
                    border: 'none',
                    background: 'linear-gradient(135deg,#7c3aed,#a855f7)',
                    color: '#fff',
                    fontSize: 14,
                    fontWeight: 700,
                    textDecoration: 'none',
                    cursor: 'pointer',
                  }}
                >
                  Contact Sales Team
                </a>
              ) : (
                <button
                  style={{
                    padding: '12px 24px',
                    borderRadius: 10,
                    border: 'none',
                    background: plan.popular ? 'linear-gradient(135deg,#7c3aed,#a855f7)' : 'rgba(255,255,255,0.1)',
                    color: '#fff',
                    fontSize: 14,
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  Get Started
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}