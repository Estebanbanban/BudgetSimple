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

const ALLOWED_CURRENCIES = [
  'USD',
  'CAD',
  'EUR',
  'GBP',
  'JPY',
  'AUD',
  'CHF',
  'CNY',
  'INR',
  'MXN',
  'BRL'
] as const

type AllowedCurrency = (typeof ALLOWED_CURRENCIES)[number]

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
  overlay.setAttribute('role', 'dialog')
  overlay.setAttribute('aria-modal', 'true')
  overlay.style.cssText =
    'position: fixed;' +
    'top: 0;' +
    'left: 0;' +
    'right: 0;' +
    'bottom: 0;' +
    'background: rgba(0, 0, 0, 0.5);' +
    'display: flex;' +
    'align-items: center;' +
    'justify-content: center;' +
    'z-index: 10000;'

  // Create modal content
  const modal = document.createElement('div')
  modal.style.cssText =
    'background: white;' +
    'border-radius: 12px;' +
    'padding: 0;' +
    'width: 90%;' +
    'max-width: 500px;' +
    'box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);'

  // Header
  const header = document.createElement('div')
  header.style.cssText =
    'padding: 20px;' +
    'border-bottom: 1px solid #e5e7eb;' +
    'display: flex;' +
    'justify-content: space-between;' +
    'align-items: center;'

  const title = document.createElement('h3')
  title.textContent = 'Edit Income'
  title.style.cssText = 'margin: 0; font-size: 18px; font-weight: 600;'

  const closeBtn = document.createElement('button')
  closeBtn.type = 'button'
  closeBtn.setAttribute('aria-label', 'Close')
  closeBtn.textContent = '×'
  closeBtn.style.cssText =
    'background: none;' +
    'border: none;' +
    'font-size: 24px;' +
    'cursor: pointer;' +
    'color: #6b7280;'

  header.appendChild(title)
  header.appendChild(closeBtn)

  // Body
  const body = document.createElement('div')
  body.style.cssText = 'padding: 20px;'

  const form = document.createElement('form')
  form.noValidate = true

  const fieldWrap = (labelText: string) => {
    const wrap = document.createElement('div')
    wrap.style.cssText = 'margin-bottom: 16px;'
    const label = document.createElement('label')
    label.textContent = labelText
    label.style.cssText =
      'display: block;' +
      'margin-bottom: 6px;' +
      'font-size: 14px;' +
      'font-weight: 500;' +
      'color: #374151;'
    wrap.appendChild(label)
    return { wrap, label }
  }

  const inputStyle =
    'width: 100%;' +
    'padding: 8px 12px;' +
    'border: 1px solid #d1d5db;' +
    'border-radius: 6px;' +
    'font-size: 14px;' +
    'box-sizing: border-box;'

  // Date
  const { wrap: dateWrap, label: dateLabel } = fieldWrap('Date')
  const dateInput = document.createElement('input')
  dateInput.type = 'date'
  dateInput.required = true
  dateInput.value = typeof income.dateISO === 'string' ? income.dateISO : ''
  dateInput.style.cssText = inputStyle
  dateLabel.htmlFor = 'income-edit-date'
  dateInput.id = 'income-edit-date'
  dateWrap.appendChild(dateInput)

  // Source
  const { wrap: sourceWrap, label: sourceLabel } = fieldWrap('Source')
  const sourceInput = document.createElement('input')
  sourceInput.type = 'text'
  sourceInput.required = true
  sourceInput.value = typeof income.source === 'string' ? income.source : ''
  sourceInput.placeholder = 'e.g., Salary, Freelance, Investment'
  sourceInput.style.cssText = inputStyle
  sourceLabel.htmlFor = 'income-edit-source'
  sourceInput.id = 'income-edit-source'
  sourceWrap.appendChild(sourceInput)

  // Amount + Currency
  const { wrap: amountWrap, label: amountLabel } = fieldWrap('Amount')
  const amountRow = document.createElement('div')
  amountRow.style.cssText = 'display: flex; gap: 8px;'

  const amountInput = document.createElement('input')
  amountInput.type = 'number'
  amountInput.step = '0.01'
  amountInput.min = '0'
  amountInput.required = true
  amountInput.value = Number.isFinite(income.amount) ? String(income.amount) : ''
  amountInput.placeholder = '0.00'
  amountInput.style.cssText = inputStyle + 'flex: 1;'

  const currencySelect = document.createElement('select')
  currencySelect.style.cssText =
    'width: 120px;' +
    'padding: 8px 12px;' +
    'border: 1px solid #d1d5db;' +
    'border-radius: 6px;' +
    'font-size: 14px;' +
    'box-sizing: border-box;'

  for (const c of ALLOWED_CURRENCIES) {
    const opt = document.createElement('option')
    opt.value = c
    opt.textContent = c
    currencySelect.appendChild(opt)
  }

  const initialCurrency =
    typeof income.currency === 'string' &&
    (ALLOWED_CURRENCIES as readonly string[]).includes(income.currency)
      ? (income.currency as AllowedCurrency)
      : 'USD'
  currencySelect.value = initialCurrency

  amountLabel.htmlFor = 'income-edit-amount'
  amountInput.id = 'income-edit-amount'

  amountRow.appendChild(amountInput)
  amountRow.appendChild(currencySelect)
  amountWrap.appendChild(amountRow)

  // Actions
  const actions = document.createElement('div')
  actions.style.cssText = 'display: flex; gap: 8px; margin-top: 24px;'

  const saveBtn = document.createElement('button')
  saveBtn.type = 'submit'
  saveBtn.textContent = 'Save Changes'
  saveBtn.style.cssText =
    'flex: 1;' +
    'padding: 10px 16px;' +
    'background: #3b82f6;' +
    'color: white;' +
    'border: none;' +
    'border-radius: 6px;' +
    'font-size: 14px;' +
    'font-weight: 500;' +
    'cursor: pointer;'

  const cancelBtn = document.createElement('button')
  cancelBtn.type = 'button'
  cancelBtn.textContent = 'Cancel'
  cancelBtn.style.cssText =
    'flex: 1;' +
    'padding: 10px 16px;' +
    'background: #f3f4f6;' +
    'color: #374151;' +
    'border: none;' +
    'border-radius: 6px;' +
    'font-size: 14px;' +
    'font-weight: 500;' +
    'cursor: pointer;'

  actions.appendChild(saveBtn)
  actions.appendChild(cancelBtn)

  form.appendChild(dateWrap)
  form.appendChild(sourceWrap)
  form.appendChild(amountWrap)
  form.appendChild(actions)
  body.appendChild(form)

  modal.appendChild(header)
  modal.appendChild(body)
  overlay.appendChild(modal)
  document.body.appendChild(overlay)

  // Close handlers
  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') cleanupAndClose()
  }

  const cleanupAndClose = () => {
    document.removeEventListener('keydown', onKeyDown)
    overlay.remove()
  }

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) cleanupAndClose()
  })

  closeBtn.addEventListener('click', cleanupAndClose)
  cancelBtn.addEventListener('click', cleanupAndClose)
  document.addEventListener('keydown', onKeyDown)

  // Form submission
  form.addEventListener('submit', async (e) => {
    e.preventDefault()

    // Basic validation / sanitization
    const amount = Number.parseFloat(amountInput.value)
    if (!Number.isFinite(amount) || amount < 0) {
      alert('Please enter a valid amount.')
      return
    }
    const currency =
      (ALLOWED_CURRENCIES as readonly string[]).includes(currencySelect.value) &&
      typeof currencySelect.value === 'string'
        ? (currencySelect.value as AllowedCurrency)
        : 'USD'

    const updatedData: IncomeEditData = {
      id: income.id,
      dateISO: dateInput.value,
      source: sourceInput.value,
      amount,
      currency
    }

    saveBtn.disabled = true
    saveBtn.textContent = 'Saving...'

    try {
      await onSave(updatedData)
      cleanupAndClose()
    } catch (error) {
      console.error('Error saving income:', error)
      alert('Failed to save income. Please try again.')
      saveBtn.disabled = false
      saveBtn.textContent = 'Save Changes'
    }
  })
}

