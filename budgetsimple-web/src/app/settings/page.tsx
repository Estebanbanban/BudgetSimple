'use client'

import { useState } from 'react'
import { downloadBackup, restoreBackup } from '@/lib/backup'

export default function SettingsPage() {
  const [restoring, setRestoring] = useState(false)
  const [restoreMessage, setRestoreMessage] = useState<string | null>(null)

  const handleExport = async () => {
    try {
      await downloadBackup()
      alert('Backup downloaded successfully!')
    } catch (error) {
      console.error('Error exporting backup:', error)
      alert('Failed to export backup. Check console for details.')
    }
  }

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!confirm('This will replace all your current data. Are you sure?')) {
      return
    }

    try {
      setRestoring(true)
      setRestoreMessage(null)
      await restoreBackup(file)
      setRestoreMessage('Backup restored successfully! Please refresh the page.')
      // Clear file input
      e.target.value = ''
    } catch (error) {
      console.error('Error restoring backup:', error)
      setRestoreMessage('Failed to restore backup. Check console for details.')
    } finally {
      setRestoring(false)
    }
  }

  return (
    <section className="view" data-view="settings">
      <div className="page-head">
        <div>
          <h1>Settings</h1>
          <p className="muted">Manage your data and preferences</p>
        </div>
      </div>

      <div className="grid">
        <section className="panel">
          <div className="panel-head">
            <div>
              <div className="panel-title">Data Backup & Restore</div>
              <div className="panel-sub">Export or import your local data</div>
            </div>
          </div>
          <div className="panel-body">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <button className="btn" onClick={handleExport} type="button">
                  Download Backup
                </button>
                <div className="small muted" style={{ marginTop: '0.5rem' }}>
                  Export all your transactions, income, budgets, and settings to a JSON file.
                </div>
              </div>

              <div>
                <label className="btn" style={{ cursor: 'pointer' }}>
                  {restoring ? 'Restoring...' : 'Restore from Backup'}
                  <input
                    type="file"
                    accept=".json"
                    onChange={handleImport}
                    disabled={restoring}
                    style={{ display: 'none' }}
                  />
                </label>
                <div className="small muted" style={{ marginTop: '0.5rem' }}>
                  Import a previously exported backup file. This will replace all current data.
                </div>
              </div>

              {restoreMessage && (
                <div className={`small ${restoreMessage.includes('success') ? 'text-success' : 'text-danger'}`}>
                  {restoreMessage}
                </div>
              )}
            </div>
          </div>
        </section>

        <section className="panel">
          <div className="panel-head">
            <div>
              <div className="panel-title">Local-First MVP</div>
              <div className="panel-sub">Data storage information</div>
            </div>
          </div>
          <div className="panel-body">
            <div className="small muted">
              <p>
                <strong>Source of Truth:</strong> IndexedDB (browser local storage)
              </p>
              <p>
                All your data (transactions, income, budgets) is stored locally in your browser.
                No data is sent to any server unless you explicitly enable backend features.
              </p>
              <p style={{ marginTop: '1rem' }}>
                <strong>Backup Recommended:</strong> Since data is stored locally, make regular backups
                to avoid data loss if you clear browser data or switch devices.
              </p>
            </div>
          </div>
        </section>
      </div>
    </section>
  )
}
