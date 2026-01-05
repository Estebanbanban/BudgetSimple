/**
 * Safe, minimal modal helpers (no innerHTML interpolation).
 * These are used to replace prompt()/confirm() flows.
 */

type ConfirmOptions = {
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  danger?: boolean
}

type TextPromptOptions = {
  title: string
  label: string
  defaultValue?: string
  placeholder?: string
  confirmText?: string
  cancelText?: string
}

function buildBaseModal(titleText: string) {
  const overlay = document.createElement('div')
  overlay.style.cssText =
    'position: fixed;' +
    'inset: 0;' +
    'background: rgba(0, 0, 0, 0.5);' +
    'display: flex;' +
    'align-items: center;' +
    'justify-content: center;' +
    'z-index: 10000;'
  overlay.setAttribute('role', 'dialog')
  overlay.setAttribute('aria-modal', 'true')

  const modal = document.createElement('div')
  modal.style.cssText =
    'background: white;' +
    'border-radius: 12px;' +
    'width: 90%;' +
    'max-width: 520px;' +
    'box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);'

  const header = document.createElement('div')
  header.style.cssText =
    'padding: 16px 20px;' +
    'border-bottom: 1px solid #e5e7eb;' +
    'display: flex;' +
    'justify-content: space-between;' +
    'align-items: center;'

  const title = document.createElement('div')
  title.textContent = titleText
  title.style.cssText = 'font-size: 16px; font-weight: 600; color: #111827;'

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

  const body = document.createElement('div')
  body.style.cssText = 'padding: 20px;'

  header.appendChild(title)
  header.appendChild(closeBtn)
  modal.appendChild(header)
  modal.appendChild(body)
  overlay.appendChild(modal)

  const close = () => overlay.remove()

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) close()
  })

  return { overlay, modal, body, closeBtn, close }
}

export function showConfirmModal(options: ConfirmOptions): Promise<boolean> {
  return new Promise((resolve) => {
    const { overlay, body, closeBtn, close } = buildBaseModal(options.title)

    const message = document.createElement('div')
    message.textContent = options.message
    message.style.cssText = 'font-size: 14px; color: #374151; line-height: 1.4;'

    const actions = document.createElement('div')
    actions.style.cssText = 'display: flex; gap: 8px; margin-top: 18px;'

    const cancel = document.createElement('button')
    cancel.type = 'button'
    cancel.textContent = options.cancelText || 'Cancel'
    cancel.style.cssText =
      'flex: 1;' +
      'padding: 10px 12px;' +
      'background: #f3f4f6;' +
      'color: #111827;' +
      'border: 1px solid #e5e7eb;' +
      'border-radius: 8px;' +
      'cursor: pointer;'

    const confirm = document.createElement('button')
    confirm.type = 'button'
    confirm.textContent = options.confirmText || 'Confirm'
    confirm.style.cssText =
      'flex: 1;' +
      'padding: 10px 12px;' +
      `background: ${options.danger ? '#dc2626' : '#3b82f6'};` +
      'color: white;' +
      'border: none;' +
      'border-radius: 8px;' +
      'cursor: pointer;'

    const cleanup = (value: boolean) => {
      document.removeEventListener('keydown', onKeyDown)
      close()
      resolve(value)
    }

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') cleanup(false)
      if (e.key === 'Enter') cleanup(true)
    }

    closeBtn.addEventListener('click', () => cleanup(false))
    cancel.addEventListener('click', () => cleanup(false))
    confirm.addEventListener('click', () => cleanup(true))
    document.addEventListener('keydown', onKeyDown)

    body.appendChild(message)
    actions.appendChild(cancel)
    actions.appendChild(confirm)
    body.appendChild(actions)
    document.body.appendChild(overlay)
  })
}

export function showTextPromptModal(
  options: TextPromptOptions
): Promise<string | null> {
  return new Promise((resolve) => {
    const { overlay, body, closeBtn, close } = buildBaseModal(options.title)

    const label = document.createElement('label')
    label.textContent = options.label
    label.style.cssText =
      'display: block;' +
      'font-size: 13px;' +
      'color: #374151;' +
      'margin-bottom: 6px;' +
      'font-weight: 500;'

    const input = document.createElement('input')
    input.type = 'text'
    input.value = options.defaultValue || ''
    input.placeholder = options.placeholder || ''
    input.style.cssText =
      'width: 100%;' +
      'padding: 10px 12px;' +
      'border: 1px solid #d1d5db;' +
      'border-radius: 8px;' +
      'font-size: 14px;' +
      'box-sizing: border-box;'

    const actions = document.createElement('div')
    actions.style.cssText = 'display: flex; gap: 8px; margin-top: 18px;'

    const cancel = document.createElement('button')
    cancel.type = 'button'
    cancel.textContent = options.cancelText || 'Cancel'
    cancel.style.cssText =
      'flex: 1;' +
      'padding: 10px 12px;' +
      'background: #f3f4f6;' +
      'color: #111827;' +
      'border: 1px solid #e5e7eb;' +
      'border-radius: 8px;' +
      'cursor: pointer;'

    const ok = document.createElement('button')
    ok.type = 'button'
    ok.textContent = options.confirmText || 'OK'
    ok.style.cssText =
      'flex: 1;' +
      'padding: 10px 12px;' +
      'background: #3b82f6;' +
      'color: white;' +
      'border: none;' +
      'border-radius: 8px;' +
      'cursor: pointer;'

    const cleanup = (value: string | null) => {
      document.removeEventListener('keydown', onKeyDown)
      close()
      resolve(value)
    }

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') cleanup(null)
      if (e.key === 'Enter') cleanup(input.value)
    }

    closeBtn.addEventListener('click', () => cleanup(null))
    cancel.addEventListener('click', () => cleanup(null))
    ok.addEventListener('click', () => cleanup(input.value))
    document.addEventListener('keydown', onKeyDown)

    body.appendChild(label)
    body.appendChild(input)
    actions.appendChild(cancel)
    actions.appendChild(ok)
    body.appendChild(actions)
    document.body.appendChild(overlay)

    // focus after mount
    setTimeout(() => input.focus(), 0)
  })
}

// Back-compat exports referenced by milestone drilldown page
export function showContributionModal(currentValue: number): Promise<number | null> {
  return showTextPromptModal({
    title: 'Set monthly contribution',
    label: 'Monthly contribution',
    defaultValue: String(currentValue ?? 0),
    placeholder: '0.00',
    confirmText: 'Apply'
  }).then((value) => {
    if (value === null) return null
    const n = Number.parseFloat(value)
    if (!Number.isFinite(n) || n < 0) return null
    return n
  })
}

export function showDateModal(currentValue?: string): Promise<string | null> {
  return showTextPromptModal({
    title: 'Set target date',
    label: 'Target date (YYYY-MM-DD)',
    defaultValue: currentValue || '',
    placeholder: 'YYYY-MM-DD',
    confirmText: 'Apply'
  }).then((value) => {
    if (value === null) return null
    // Minimal format check (don’t throw)
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null
    return value
  })
}

