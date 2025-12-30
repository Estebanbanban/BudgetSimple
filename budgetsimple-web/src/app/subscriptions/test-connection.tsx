'use client'

import { useEffect, useState } from 'react'

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

export default function TestConnection() {
  const [status, setStatus] = useState<string>('Testing...')
  const [details, setDetails] = useState<any>(null)

  useEffect(() => {
    const testConnection = async () => {
      try {
        const response = await fetch(`${API_BASE}/api/subscriptions/candidates?status=pending`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
          mode: 'cors',
          credentials: 'include'
        })
        
        setDetails({
          status: response.status,
          statusText: response.statusText,
          ok: response.ok,
          url: response.url,
          headers: Object.fromEntries(response.headers.entries())
        })

        if (response.ok) {
          const data = await response.json()
          setStatus(`✅ Connected! Got ${data.candidates?.length || 0} candidates`)
        } else {
          setStatus(`❌ Error: ${response.status} ${response.statusText}`)
        }
      } catch (error: any) {
        setStatus(`❌ Failed: ${error.message}`)
        setDetails({ error: error.message, stack: error.stack })
      }
    }

    testConnection()
  }, [])

  return (
    <div style={{ padding: '20px', fontFamily: 'monospace', fontSize: '12px' }}>
      <h3>Connection Test</h3>
      <p><strong>API Base:</strong> {API_BASE}</p>
      <p><strong>Status:</strong> {status}</p>
      {details && (
        <pre style={{ background: '#f5f5f5', padding: '10px', overflow: 'auto' }}>
          {JSON.stringify(details, null, 2)}
        </pre>
      )}
    </div>
  )
}

