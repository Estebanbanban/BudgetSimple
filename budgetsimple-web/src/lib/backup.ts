/**
 * Local Backup/Restore for IndexedDB
 * MVP: Export and import all local data for backup/migration
 */

const DB_NAME = 'budgetsimple'
const DB_VERSION = 2

export interface BackupData {
  version: string
  exportedAt: string
  transactions: any[]
  income: any[]
  envelopes: any[]
  envelopeContribs: any[]
  config: any
  settings: any
}

/**
 * Export all IndexedDB data to JSON
 */
export async function exportBackup(): Promise<BackupData> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    
    request.onerror = () => reject(new Error('Failed to open database'))
    request.onsuccess = async () => {
      const db = request.result
      const backup: BackupData = {
        version: '1.0',
        exportedAt: new Date().toISOString(),
        transactions: [],
        income: [],
        envelopes: [],
        envelopeContribs: [],
        config: null,
        settings: null
      }

      try {
        // Export transactions
        const txStore = db.transaction('transactions', 'readonly').objectStore('transactions')
        const txRequest = txStore.getAll()
        txRequest.onsuccess = () => {
          backup.transactions = txRequest.result || []

          // Export income
          const incomeStore = db.transaction('income', 'readonly').objectStore('income')
          const incomeRequest = incomeStore.getAll()
          incomeRequest.onsuccess = () => {
            backup.income = incomeRequest.result || []

            // Export envelopes
            const envStore = db.transaction('envelopes', 'readonly').objectStore('envelopes')
            const envRequest = envStore.getAll()
            envRequest.onsuccess = () => {
              backup.envelopes = envRequest.result || []

              // Export envelope contributions
              const envContribStore = db.transaction('envelopeContribs', 'readonly').objectStore('envelopeContribs')
              const envContribRequest = envContribStore.getAll()
              envContribRequest.onsuccess = () => {
                backup.envelopeContribs = envContribRequest.result || []

                // Export config from localStorage
                const configStr = localStorage.getItem('budgetsimple:v1')
                if (configStr) {
                  try {
                    backup.config = JSON.parse(configStr)
                  } catch (e) {
                    console.error('Error parsing config:', e)
                  }
                }

                // Export settings from config
                if (backup.config?.settings) {
                  backup.settings = backup.config.settings
                }

                db.close()
                resolve(backup)
              }
              envContribRequest.onerror = () => {
                db.close()
                reject(new Error('Failed to export envelope contributions'))
              }
            }
            envRequest.onerror = () => {
              db.close()
              reject(new Error('Failed to export envelopes'))
            }
          }
          incomeRequest.onerror = () => {
            db.close()
            reject(new Error('Failed to export income'))
          }
        }
        txRequest.onerror = () => {
          db.close()
          reject(new Error('Failed to export transactions'))
        }
      } catch (error) {
        db.close()
        reject(error)
      }
    }
  })
}

/**
 * Import backup data into IndexedDB
 */
export async function importBackup(backup: BackupData): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    
    request.onerror = () => reject(new Error('Failed to open database'))
    request.onsuccess = () => {
      const db = request.result
      const transaction = db.transaction(
        ['transactions', 'income', 'envelopes', 'envelopeContribs'],
        'readwrite'
      )

      let completed = 0
      const total = 4

      const checkComplete = () => {
        completed++
        if (completed === total) {
          // Restore config to localStorage
          if (backup.config) {
            localStorage.setItem('budgetsimple:v1', JSON.stringify(backup.config))
          }

          db.close()
          resolve()
        }
      }

      // Import transactions
      const txStore = transaction.objectStore('transactions')
      txStore.clear().onsuccess = () => {
        if (backup.transactions.length > 0) {
          backup.transactions.forEach(tx => {
            txStore.add(tx)
          })
        }
        checkComplete()
      }

      // Import income
      const incomeStore = transaction.objectStore('income')
      incomeStore.clear().onsuccess = () => {
        if (backup.income.length > 0) {
          backup.income.forEach(inc => {
            incomeStore.add(inc)
          })
        }
        checkComplete()
      }

      // Import envelopes
      const envStore = transaction.objectStore('envelopes')
      envStore.clear().onsuccess = () => {
        if (backup.envelopes.length > 0) {
          backup.envelopes.forEach(env => {
            envStore.add(env)
          })
        }
        checkComplete()
      }

      // Import envelope contributions
      const envContribStore = transaction.objectStore('envelopeContribs')
      envContribStore.clear().onsuccess = () => {
        if (backup.envelopeContribs.length > 0) {
          backup.envelopeContribs.forEach(contrib => {
            envContribStore.add(contrib)
          })
        }
        checkComplete()
      }

      transaction.onerror = () => {
        db.close()
        reject(new Error('Failed to import backup'))
      }
    }
  })
}

/**
 * Download backup as JSON file
 */
export async function downloadBackup(): Promise<void> {
  try {
    const backup = await exportBackup()
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `budgetsimple-backup-${new Date().toISOString().split('T')[0]}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  } catch (error) {
    console.error('Error downloading backup:', error)
    throw error
  }
}

/**
 * Restore backup from JSON file
 */
export async function restoreBackup(file: File): Promise<void> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = async (e) => {
      try {
        const backup = JSON.parse(e.target?.result as string) as BackupData
        await importBackup(backup)
        resolve()
      } catch (error) {
        reject(new Error('Invalid backup file format'))
      }
    }
    reader.onerror = () => reject(new Error('Failed to read backup file'))
    reader.readAsText(file)
  })
}

