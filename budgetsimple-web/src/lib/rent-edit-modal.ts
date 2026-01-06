/**
 * Rent Edit Modal - Vanilla JS implementation
 * Allows editing rent with date ranges (from/to) to handle lease changes and gaps
 */

export interface RentPeriod {
  id: string
  amount: number
  startDate: string // ISO date
  endDate?: string // ISO date (optional, if null = ongoing)
  payDay: number // Day of month (1-28)
}

export function showRentEditModal(
  currentRent: { amount: number; payDay: number },
  existingPeriods: RentPeriod[],
  onSave: (periods: RentPeriod[]) => Promise<void>
): void {
  // Remove existing modal if any
  const existing = document.getElementById('rent-edit-modal')
  if (existing) existing.remove()

  // Create modal overlay
  const overlay = document.createElement('div')
  overlay.id = 'rent-edit-modal'
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
    max-width: 600px;
    max-height: 90vh;
    overflow-y: auto;
    box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
  `

  // Form state
  let periods: RentPeriod[] = existingPeriods.length > 0 
    ? [...existingPeriods]
    : [{
        id: `period-${Date.now()}`,
        amount: currentRent.amount || 0,
        startDate: new Date().toISOString().split('T')[0],
        endDate: undefined,
        payDay: currentRent.payDay || 1
      }]

  // Close handler
  const close = () => overlay.remove()

  const renderModal = () => {
    // Set HTML content
    modal.innerHTML = `
      <div style="padding: 20px; border-bottom: 1px solid #e5e7eb; display: flex; justify-content: space-between; align-items: center; position: sticky; top: 0; background: white; z-index: 1;">
        <h3 style="margin: 0; font-size: 18px; font-weight: 600;">Edit Rent Periods</h3>
        <button id="modal-close" style="background: none; border: none; font-size: 24px; cursor: pointer; color: #6b7280;">&times;</button>
      </div>
      <div style="padding: 20px;">
        <div style="margin-bottom: 16px; padding: 12px; background: #f0f9ff; border-radius: 8px; font-size: 13px; color: #0369a1;">
          <strong>💡 Tip:</strong> Add multiple periods to handle lease changes or gaps when you don't pay rent. Set an end date to stop rent automatically.
        </div>
        
        <div id="rent-periods-list" style="margin-bottom: 20px;">
          ${periods.map((period, index) => `
            <div class="rent-period" style="border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; margin-bottom: 12px; background: #fafafa;">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                <strong style="font-size: 14px;">Period ${index + 1}</strong>
                ${periods.length > 1 ? `<button class="remove-period" data-id="${period.id}" style="background: #fee2e2; color: #dc2626; border: none; padding: 4px 8px; border-radius: 4px; cursor: pointer; font-size: 12px;">Remove</button>` : ''}
              </div>
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 12px;">
                <div>
                  <label style="display: block; margin-bottom: 4px; font-size: 12px; font-weight: 500; color: #374151;">Monthly Amount</label>
                  <input 
                    type="number" 
                    step="0.01"
                    min="0"
                    class="rent-amount"
                    data-id="${period.id}"
                    value="${period.amount}"
                    style="width: 100%; padding: 8px 12px; border: 1px solid #d1d5db; border-radius: 6px; font-size: 14px; box-sizing: border-box;"
                  />
                </div>
                <div>
                  <label style="display: block; margin-bottom: 4px; font-size: 12px; font-weight: 500; color: #374151;">Pay Day (1-28)</label>
                  <input 
                    type="number" 
                    min="1"
                    max="28"
                    class="rent-payday"
                    data-id="${period.id}"
                    value="${period.payDay}"
                    style="width: 100%; padding: 8px 12px; border: 1px solid #d1d5db; border-radius: 6px; font-size: 14px; box-sizing: border-box;"
                  />
                </div>
              </div>
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
                <div>
                  <label style="display: block; margin-bottom: 4px; font-size: 12px; font-weight: 500; color: #374151;">Start Date</label>
                  <input 
                    type="date" 
                    class="rent-start"
                    data-id="${period.id}"
                    value="${period.startDate}"
                    required
                    style="width: 100%; padding: 8px 12px; border: 1px solid #d1d5db; border-radius: 6px; font-size: 14px; box-sizing: border-box;"
                  />
                </div>
                <div>
                  <label style="display: block; margin-bottom: 4px; font-size: 12px; font-weight: 500; color: #374151;">End Date (optional)</label>
                  <input 
                    type="date" 
                    class="rent-end"
                    data-id="${period.id}"
                    value="${period.endDate || ''}"
                    style="width: 100%; padding: 8px 12px; border: 1px solid #d1d5db; border-radius: 6px; font-size: 14px; box-sizing: border-box;"
                  />
                </div>
              </div>
            </div>
          `).join('')}
        </div>
        
        <button 
          id="add-period"
          type="button"
          style="width: 100%; padding: 10px; background: #f3f4f6; color: #374151; border: 1px dashed #d1d5db; border-radius: 6px; font-size: 14px; font-weight: 500; cursor: pointer; margin-bottom: 20px;"
        >
          + Add Another Period
        </button>
        
        <div style="display: flex; gap: 8px;">
          <button 
            type="button"
            id="modal-save"
            style="flex: 1; padding: 10px 16px; background: #3b82f6; color: white; border: none; border-radius: 6px; font-size: 14px; font-weight: 500; cursor: pointer;"
          >
            Save Rent Periods
          </button>
          <button 
            type="button"
            id="modal-cancel"
            style="flex: 1; padding: 10px 16px; background: #f3f4f6; color: #374151; border: none; border-radius: 6px; font-size: 14px; font-weight: 500; cursor: pointer;"
          >
            Cancel
          </button>
        </div>
      </div>
    `

    // Ensure overlay is in DOM
    if (!document.body.contains(overlay)) {
      overlay.appendChild(modal)
      document.body.appendChild(overlay)
    }

    // Bind event listeners - MUST be after innerHTML so they attach to new elements
    const closeBtn = modal.querySelector('#modal-close')
    if (closeBtn) {
      closeBtn.addEventListener('click', close)
    }
    
    const cancelBtn = modal.querySelector('#modal-cancel')
    if (cancelBtn) {
      cancelBtn.addEventListener('click', close)
    }

    // Update period data on input change (using both input and change events)
    modal.querySelectorAll('.rent-amount, .rent-payday, .rent-start, .rent-end').forEach(input => {
      const inputElement = input as HTMLInputElement
      
      // Use input event for real-time updates
      inputElement.addEventListener('input', (e) => {
        const target = e.target as HTMLInputElement
        const id = target.getAttribute('data-id')
        if (!id) return
        const period = periods.find(p => p.id === id)
        if (period) {
          if (target.classList.contains('rent-amount')) {
            period.amount = parseFloat(target.value) || 0
          } else if (target.classList.contains('rent-payday')) {
            period.payDay = Math.max(1, Math.min(28, parseInt(target.value) || 1))
            target.value = period.payDay.toString() // Update display
          } else if (target.classList.contains('rent-start')) {
            period.startDate = target.value
          } else if (target.classList.contains('rent-end')) {
            period.endDate = target.value || undefined
          }
        }
      })
      
      // Also use change event as backup
      inputElement.addEventListener('change', (e) => {
        const target = e.target as HTMLInputElement
        const id = target.getAttribute('data-id')
        if (!id) return
        const period = periods.find(p => p.id === id)
        if (period) {
          if (target.classList.contains('rent-amount')) {
            period.amount = parseFloat(target.value) || 0
          } else if (target.classList.contains('rent-payday')) {
            period.payDay = Math.max(1, Math.min(28, parseInt(target.value) || 1))
            target.value = period.payDay.toString()
          } else if (target.classList.contains('rent-start')) {
            period.startDate = target.value
          } else if (target.classList.contains('rent-end')) {
            period.endDate = target.value || undefined
          }
        }
      })
    })

    // Remove period
    modal.querySelectorAll('.remove-period').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation()
        e.preventDefault()
        const id = btn.getAttribute('data-id')
        if (id) {
          periods = periods.filter(p => p.id !== id)
          renderModal()
        }
      })
    })

    // Add period
    const addPeriodBtn = modal.querySelector('#add-period')
    if (addPeriodBtn) {
      addPeriodBtn.addEventListener('click', (e) => {
        e.stopPropagation()
        e.preventDefault()
        const lastPeriod = periods[periods.length - 1]
        const lastEndDate = lastPeriod?.endDate 
          ? new Date(lastPeriod.endDate)
          : new Date()
        
        // Start new period the day after previous ends, or today if no end date
        const nextStartDate = lastPeriod?.endDate
          ? new Date(lastEndDate.getTime() + 24 * 60 * 60 * 1000).toISOString().split('T')[0]
          : new Date().toISOString().split('T')[0]

        periods.push({
          id: `period-${Date.now()}-${Math.random()}`,
          amount: lastPeriod?.amount || 0,
          startDate: nextStartDate,
          endDate: undefined,
          payDay: lastPeriod?.payDay || 1
        })
        renderModal()
      })
    }

    // Save
    const saveBtn = modal.querySelector('#modal-save')
    if (saveBtn) {
      saveBtn.addEventListener('click', async (e) => {
        e.stopPropagation()
        e.preventDefault()
        
        // Validate periods
        if (periods.length === 0) {
          alert('Please add at least one rent period.')
          return
        }

        // Sort by start date
        periods.sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())

        // Check for overlaps
        for (let i = 0; i < periods.length - 1; i++) {
          const current = periods[i]
          const next = periods[i + 1]
          const currentEnd = current.endDate ? new Date(current.endDate) : new Date('2099-12-31')
          const nextStart = new Date(next.startDate)
          
          if (currentEnd >= nextStart) {
            alert(`Period ${i + 1} and ${i + 2} overlap. Please adjust the dates.`)
            return
          }
        }

        const saveButton = saveBtn as HTMLButtonElement
        saveButton.disabled = true
        saveButton.textContent = 'Saving...'

        try {
          await onSave(periods)
          close()
        } catch (error) {
          console.error('Error saving rent periods:', error)
          alert('Failed to save rent periods. Please try again.')
          saveButton.disabled = false
          saveButton.textContent = 'Save Rent Periods'
        }
      })
    }
  }

  // Initial render
  overlay.appendChild(modal)
  document.body.appendChild(overlay)
  
  // Bind overlay click (only once)
  overlay.addEventListener('click', (e) => { 
    if (e.target === overlay) close()
  })

  renderModal()
}

