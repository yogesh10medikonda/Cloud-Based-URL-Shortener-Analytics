import React, { useState } from 'react'
import axios from './axios'
import Dashboard from './Dashboard'
import Login from './components/Login'
import Signup from './components/Signup'
import { useAuth } from './context/AuthContext'

export default function App() {
  const { isAuthenticated, user, logout, loading: authLoading } = useAuth()
  const [authTab, setAuthTab] = useState('login') // 'login' or 'signup'
  const [longUrl, setLongUrl] = useState('')
  const [clicks, setClicks] = useState(null)
  const [shortUrl, setShortUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [toast, setToast] = useState('')
  const [activeTab, setActiveTab] = useState('create')

  // Show loading while auth context is loading
  if (authLoading) {
    return <div className="loading">Loading...</div>
  }

  // If not authenticated, show login/signup
  if (!isAuthenticated) {
    return (
      <div className="app">
        <div className="card">
          {authTab === 'login' ? (
            <Login 
              onSwitchToSignup={() => setAuthTab('signup')}
              onLoginSuccess={() => setActiveTab('create')}
            />
          ) : (
            <Signup 
              onSwitchToLogin={() => setAuthTab('login')}
              onSignupSuccess={() => setActiveTab('create')}
            />
          )}
        </div>
      </div>
    )
  }

  // Authenticated user view

  function validateUrl(value) {
    if (!value || typeof value !== 'string') return false
    try {
      const u = new URL(value)
      return u.protocol === 'http:' || u.protocol === 'https:'
    } catch (_) {
      return false
    }
  }

  const showToast = (msg) => {
    setToast(msg)
    setTimeout(() => setToast(''), 3000)
  }

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(shortUrl)
      showToast('✓ Copied to clipboard!')
    } catch (err) {
      showToast('Failed to copy')
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setShortUrl('')
    setClicks(null)

    if (!longUrl) {
      setError('Please enter a URL')
      return
    }

    if (!validateUrl(longUrl.trim())) {
      setError('Please enter a valid URL (https://example.com)')
      return
    }

    setLoading(true)
    try {
      const res = await axios.post('/api/url', { longUrl: longUrl.trim() })

      const body = res && res.data ? res.data : res

      if (body && body.success === false && body.error) {
        setError(body.error)
        return
      }

      if (body && body.shortUrl) {
        setShortUrl(body.shortUrl)
        try {
          const sc = body.shortCode || body.shortUrl.split('/').pop()
          if (sc) {
            const a = await axios.get(`/api/url/analytics/${sc}`)
            if (a && a.data && a.data.data && typeof a.data.data.clicks !== 'undefined') {
              setClicks(a.data.data.clicks)
            }
          }
        } catch (__) { /* ignore */ }
        return
      }

      if (body && body.data && body.data.shortUrl) {
        setShortUrl(body.data.shortUrl)
        try {
          const sc = body.data.shortCode || body.data.shortUrl.split('/').pop()
          if (sc) {
            const a = await axios.get(`/api/url/analytics/${sc}`)
            if (a && a.data && a.data.data && typeof a.data.data.clicks !== 'undefined') {
              setClicks(a.data.data.clicks)
            }
          }
        } catch (__) { /* ignore */ }
        return
      }

      if (body && body.shortCode) {
        const backend = axios.defaults.baseURL || (import.meta.env.VITE_API_URL || 'http://localhost:5000')
        const url = `${backend.replace(/\/$/, '')}/${body.shortCode}`
        setShortUrl(url)
        try {
          const a = await axios.get(`/api/url/analytics/${body.shortCode}`)
          if (a && a.data && a.data.data && typeof a.data.data.clicks !== 'undefined') {
            setClicks(a.data.data.clicks)
          }
        } catch (__) { /* ignore */ }
        return
      }

      setError('Unexpected response from server')
    } catch (err) {
      if (err._message) {
        setError(err._message)
      } else if (err.response && err.response.data) {
        const data = err.response.data
        setError(data.error || data.message || 'Server returned an error')
      } else if (err.request) {
        setError('Backend unreachable. Is the server running?')
      } else {
        setError('Error: ' + (err.message || String(err)))
      }
    } finally {
      setLoading(false)
    }
  }

  const refreshClicks = async () => {
    if (!shortUrl) return
    try {
      setLoading(true)
      const sc = shortUrl.split('/').pop()
      const a = await axios.get(`/api/url/analytics/${sc}`)
      if (a && a.data && a.data.data) {
        setClicks(a.data.data.clicks)
        showToast('Clicks updated')
      }
    } catch (err) {
      console.error('Failed to refresh clicks:', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="app">
      <div className="card">
        {/* Header with user info and logout */}
        <div className="app-header">
          <div className="header-content">
            <h1>✨ URL Shortener</h1>
            <div className="user-section">
              <span className="user-email">{user?.email}</span>
              <button className="btn-logout" onClick={logout}>
                Logout
              </button>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="tab-navigation">
          <button
            className={`tab-btn ${activeTab === 'create' ? 'active' : ''}`}
            onClick={() => setActiveTab('create')}
          >
            ➕ Create
          </button>
          <button
            className={`tab-btn ${activeTab === 'dashboard' ? 'active' : ''}`}
            onClick={() => setActiveTab('dashboard')}
          >
            📊 Dashboard
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === 'create' ? (
          <>
            <h1>✨ URL Shortener</h1>
            <p className="subtitle">Create short, shareable links instantly</p>

            <form onSubmit={handleSubmit} className="form">
              <input
                className="input"
                type="url"
                placeholder="Paste your long URL here..."
                value={longUrl}
                onChange={(e) => setLongUrl(e.target.value)}
                aria-label="Long URL"
                disabled={loading}
              />
              <button className="btn" type="submit" disabled={loading}>
                {loading ? (
                  <>
                    <span className="spinner"></span>
                    {' Shortening...'}
                  </>
                ) : (
                  '🔗 Shorten URL'
                )}
              </button>
            </form>

            {error && <div className="error">{error}</div>}

            {shortUrl && (
              <div className="result">
                <div className="result-title">✓ Your Short URL</div>
                <div className="result-url">
                  <a href={shortUrl} target="_blank" rel="noopener noreferrer">
                    {shortUrl}
                  </a>
                  <button
                    className="btn btn-copy"
                    type="button"
                    onClick={copyToClipboard}
                    title="Copy to clipboard"
                  >
                    📋 Copy
                  </button>
                </div>

                <div className="result-stats">
                  <div className="stat">
                    <div className="stat-label">Total Clicks</div>
                    <div className="stat-value">{clicks === null ? '0' : clicks}</div>
                  </div>
                  <div className="stat">
                    <button
                      className="btn btn-copy"
                      type="button"
                      onClick={refreshClicks}
                      disabled={loading}
                      title="Refresh click count"
                      style={{ width: '100%', padding: '8px', background: '#e5e7eb', color: '#374151', border: 'none' }}
                    >
                      🔄 Refresh
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        ) : (
          <Dashboard />
        )}
      </div>

      {toast && <div className="toast">{toast}</div>}
    </div>
  )
}


