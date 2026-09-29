import React, { useState, useEffect } from 'react'
import axios from './axios'

export default function Dashboard() {
  const [urls, setUrls] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchUrls()
  }, [])

  const fetchUrls = async () => {
    try {
      setLoading(true)
      setError('')
      const res = await axios.get('/api/url?sort=-createdAt&limit=100')
      if (res && res.data && res.data.success && res.data.data) {
        setUrls(res.data.data)
      }
    } catch (err) {
      console.error('Failed to fetch URLs:', err)
      setError('Failed to load URLs. ' + (err._message || err.message))
    } finally {
      setLoading(false)
    }
  }

  const isExpired = (expiresAt) => {
    if (!expiresAt) return false
    return new Date(expiresAt) < new Date()
  }

  const formatDate = (dateStr) => {
    if (!dateStr) return '—'
    const d = new Date(dateStr)
    return d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  const copyToClipboard = async (text) => {
    try {
      await navigator.clipboard.writeText(text)
      alert('Copied!')
    } catch (err) {
      console.error('Copy failed:', err)
    }
  }

  if (loading) {
    return (
      <div className="dashboard">
        <div className="loading">Loading URLs...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="dashboard">
        <div className="error">{error}</div>
        <button className="btn" onClick={fetchUrls}>Retry</button>
      </div>
    )
  }

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h2>📊 Dashboard</h2>
        <p className="dashboard-subtitle">Total URLs: {urls.length}</p>
      </div>

      {urls.length === 0 ? (
        <div className="empty-state">
          <p>No URLs created yet. Go to Create to make one!</p>
        </div>
      ) : (
        <div className="dashboard-content">
          {/* Desktop Table View */}
          <div className="table-wrapper">
            <table className="urls-table">
              <thead>
                <tr>
                  <th>Short URL</th>
                  <th>Original URL</th>
                  <th>Clicks</th>
                  <th>Created</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {urls.map((url) => {
                  const expired = isExpired(url.expiresAt)
                  const shortCode = url.shortCode
                  const backend = axios.defaults.baseURL || (import.meta.env.VITE_API_URL || 'http://localhost:5000')
                  const shortUrl = `${backend.replace(/\/$/, '')}/${shortCode}`

                  return (
                    <tr key={url._id || shortCode} className={expired ? 'expired-row' : ''}>
                      <td data-label="Short URL" className="short-url-cell">
                        <a href={shortUrl} target="_blank" rel="noopener noreferrer" title={shortUrl}>
                          {shortCode}
                        </a>
                      </td>
                      <td data-label="Original URL" className="original-url-cell">
                        <a href={url.originalUrl} target="_blank" rel="noopener noreferrer" title={url.originalUrl}>
                          {url.originalUrl.length > 50 ? url.originalUrl.substring(0, 47) + '...' : url.originalUrl}
                        </a>
                      </td>
                      <td data-label="Clicks">{url.clicks}</td>
                      <td data-label="Created">{formatDate(url.createdAt)}</td>
                      <td data-label="Status">
                        <span className={`status-badge ${expired ? 'expired' : 'active'}`}>
                          {expired ? '❌ Expired' : '✓ Active'}
                        </span>
                      </td>
                      <td data-label="Actions">
                        <button
                          className="action-btn"
                          onClick={() => copyToClipboard(shortUrl)}
                          title="Copy short URL"
                        >
                          📋
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Card View */}
          <div className="cards-wrapper">
            {urls.map((url) => {
              const expired = isExpired(url.expiresAt)
              const shortCode = url.shortCode
              const backend = axios.defaults.baseURL || (import.meta.env.VITE_API_URL || 'http://localhost:5000')
              const shortUrl = `${backend.replace(/\/$/, '')}/${shortCode}`

              return (
                <div key={url._id || shortCode} className={`url-card ${expired ? 'expired' : ''}`}>
                  <div className="card-header">
                    <a href={shortUrl} target="_blank" rel="noopener noreferrer" className="card-short-url">
                      {shortCode}
                    </a>
                    <span className={`status-badge ${expired ? 'expired' : 'active'}`}>
                      {expired ? '❌ Expired' : '✓ Active'}
                    </span>
                  </div>

                  <div className="card-body">
                    <div className="card-row">
                      <span className="card-label">Original:</span>
                      <a href={url.originalUrl} target="_blank" rel="noopener noreferrer" className="card-value">
                        {url.originalUrl.length > 40 ? url.originalUrl.substring(0, 37) + '...' : url.originalUrl}
                      </a>
                    </div>

                    <div className="card-row">
                      <span className="card-label">Clicks:</span>
                      <span className="card-value">{url.clicks}</span>
                    </div>

                    <div className="card-row">
                      <span className="card-label">Created:</span>
                      <span className="card-value">{formatDate(url.createdAt)}</span>
                    </div>

                    {url.expiresAt && (
                      <div className="card-row">
                        <span className="card-label">Expires:</span>
                        <span className="card-value">{formatDate(url.expiresAt)}</span>
                      </div>
                    )}
                  </div>

                  <div className="card-footer">
                    <button
                      className="action-btn"
                      onClick={() => copyToClipboard(shortUrl)}
                      title="Copy short URL"
                    >
                      📋 Copy
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      <div className="dashboard-footer">
        <button className="btn" onClick={fetchUrls}>🔄 Refresh</button>
      </div>
    </div>
  )
}

