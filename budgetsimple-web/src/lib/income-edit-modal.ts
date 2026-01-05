/**
 * Income Edit Modal - Vanilla JS implementation
 * Can be called from runtime.ts without React dependencies
 */

export interface IncomeEditData {
  id: string
  dateISO: string
  source: string
  amount: number
  currency?: string
}

export function showIncomeEditModal(
  income: IncomeEditData,
  onSave: (data: IncomeEditData) => Promise<void>
): void {
  // Remove existing modal if any
  const existing = document.getElementById('income-edit-modal')
  if (existing) existing.remove()

  // Create modal overlay
  const overlay = document.createElement('div')
  overlay.id = 'income-edit-modal'
  overlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10000;
  `

  // Create modal content
  const modal = document.createElement('div')
  modal.style.cssText = `
    background: white;
    border-radius: 12px;
    padding: 0;
    width: 90%;
    max-width: 500px;
    box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
  `

  // Form state
  const formData = {
    dateISO: income.dateISO || '',
    source: income.source || '',
    amount: income.amount?.toString() || '',
    currency: income.currency || 'USD'
  }

  // Build modal HTML
  modal.innerHTML = `
    <div style="padding: 20px; border-bottom: 1px solid #e5e7eb; display: flex; justify-content: space-between; align-items: center;">
      <h3 style="margin: 0; font-size: 18px; font-weight: 600;">Edit Income</h3>
      <button id="modal-close" style="background: none; border: none; font-size: 24px; cursor: pointer; color: #6b7280;">&times;</button>
    </div>
    <div style="padding: 20px;">
      <form id="income-edit-form">
        <div style="margin-bottom: 16px;">
          <label style="display: block; margin-bottom: 6px; font-size: 14px; font-weight: 500; color: #374151;">Date</label>
          <input 
            type="date" 
            id="edit-date"
            value="${formData.dateISO}"
            required
            style="width: 100%; padding: 8px 12px; border: 1px solid #d1d5db; border-radius: 6px; font-size: 14px; box-sizing: border-box;"
          />
        </div>
        <div style="margin-bottom: 16px;">
          <label style="display: block; margin-bottom: 6px; font-size: 14px; font-weight: 500; color: #374151;">Source</label>
          <input 
            type="text" 
            id="edit-source"
            value="${escapeHtml(formData.source)}"
            placeholder="e.g., Salary, Freelance, Investment"
            required
            style="width: 100%; padding: 8px 12px; border: 1px solid #d1d5db; border-radius: 6px; font-size: 14px; box-sizing: border-box;"
          />
        </div>
        <div style="margin-bottom: 16px;">
          <label style="display: block; margin-bottom: 6px; font-size: 14px; font-weight: 500; color: #374151;">Amount</label>
          <div style="display: flex; gap: 8px;">
            <input 
              type="number" 
              step="0.01"
              min="0"
              id="edit-amount"
              value="${formData.amount}"
              placeholder="0.00"
              required
              style="flex: 1; padding: 8px 12px; border: 1px solid #d1d5db; border-radius: 6px; font-size: 14px; box-sizing: border-box;"
            />
            <select 
              id="edit-currency"
              value="${formData.currency}"
              style="width: 120px; padding: 8px 12px; border: 1px solid #d1d5db; border-radius: 6px; font-size: 14px; box-sizing: border-box;"
            >
              <option value="USD">USD</option>
              <option value="CAD">CAD</option>
              <option value="EUR">EUR</option>
              <option value="GBP">GBP</option>
              <option value="JPY">JPY</option>
              <option value="AUD">AUD</option>
              <option value="CHF">CHF</option>
              <option value="CNY">CNY</option>
              <option value="INR">INR</option>
              <option value="MXN">MXN</option>
              <option value="BRL">BRL</option>
            </select>
          </div>
        </div>
        <div style="display: flex; gap: 8px; margin-top: 24px;">
          <button 
            type="submit"
            id="modal-save"
            style="flex: 1; padding: 10px 16px; background: #3b82f6; color: white; border: none; border-radius: 6px; font-size: 14px; font-weight: 500; cursor: pointer;"
          >
            Save Changes
          </button>
          <button 
            type="button"
            id="modal-cancel"
            style="flex: 1; padding: 10px 16px; background: #f3f4f6; color: #374151; border: none; border-radius: 6px; font-size: 14px; font-weight: 500; cursor: pointer;"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  `

  modal.appendChild(modal)
  overlay.appendChild(modal)
  document.body.appendChild(overlay)

  // Close handlers
  const close = () => {
    overlay.remove()
  }

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) close()
  })

  const closeBtn = modal.querySelector('#modal-close')
  const cancelBtn = modal.querySelector('#modal-cancel')
  if (closeBtn) closeBtn.addEventListener('click', close)
  if (cancelBtn) cancelBtn.addEventListener('click', close)

  // Form submission
  const form = modal.querySelector('#income-edit-form') as HTMLFormElement
  form.addEventListener('submit', async (e) => {
    e.preventDefault()
    
    const dateInput = modal.querySelector('#edit-date') as HTMLInputElement
    const sourceInput = modal.querySelector('#edit-source') as HTMLInputElement
    const amountInput = modal.querySelector('#edit-amount') as HTMLInputElement
    const currencySelect = modal.querySelector('#edit-currency') as HTMLSelectElement

    const updatedData: IncomeEditData = {
      id: income.id,
      dateISO: dateInput.value,
      source: sourceInput.value,
      amount: parseFloat(amountInput.value),
      currency: currencySelect.value
    }

    const saveBtn = modal.querySelector('#modal-save') as HTMLButtonElement
    saveBtn.disabled = true
    saveBtn.textContent = 'Saving...'

    try {
      await onSave(updatedData)
      close()
    } catch (error) {
      console.error('Error saving income:', error)
      alert('Failed to save income. Please try again.')
      saveBtn.disabled = false
      saveBtn.textContent = 'Save Changes'
    }
  })
}

function escapeHtml(text: string): string {
  const div = document.createElement('div')
  div.textContent = text
  return div.innerHTML
}

