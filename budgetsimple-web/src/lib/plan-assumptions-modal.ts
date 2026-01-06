/**
 * Modal for editing plan assumptions (contribution, date, etc.)
 */

export function showContributionModal(
  currentValue: number,
  onSave: (value: number) => void,
  onCancel?: () => void
): void {
  const overlay = document.createElement('div');
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
  `;

  const modal = document.createElement('div');
  modal.style.cssText = `
    background: white;
    border-radius: 12px;
    padding: 24px;
    width: 90%;
    max-width: 400px;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  `;

  modal.innerHTML = `
    <div style="margin-bottom: 20px;">
      <div style="font-size: 18px; font-weight: 600; margin-bottom: 4px;">Set Monthly Contribution</div>
      <div style="font-size: 13px; color: #64748b;">Enter the monthly contribution amount</div>
    </div>
    <div style="margin-bottom: 20px;">
      <label style="display: block; font-size: 12px; font-weight: 500; color: #475569; margin-bottom: 6px;">
        Monthly Amount
      </label>
      <input 
        type="number" 
        step="0.01" 
        min="0" 
        id="contributionInput" 
        value="${currentValue}" 
        style="width: 100%; padding: 10px 12px; border: 1px solid #d1d5db; border-radius: 8px; font-size: 14px; box-sizing: border-box;"
        autofocus
      />
    </div>
    <div style="display: flex; gap: 8px; justify-content: flex-end;">
      <button id="cancelBtn" class="btn btn-quiet" style="text-decoration: none;">Cancel</button>
      <button id="saveBtn" class="btn btn-accent" style="text-decoration: none;">Save</button>
    </div>
  `;

  overlay.appendChild(modal);
  document.body.appendChild(overlay);

  const input = modal.querySelector('#contributionInput') as HTMLInputElement;
  const saveBtn = modal.querySelector('#saveBtn') as HTMLButtonElement;
  const cancelBtn = modal.querySelector('#cancelBtn') as HTMLButtonElement;

  const cleanup = () => {
    document.body.removeChild(overlay);
  };

  saveBtn.addEventListener('click', () => {
    const value = parseFloat(input.value) || 0;
    onSave(value);
    cleanup();
  });

  cancelBtn.addEventListener('click', () => {
    if (onCancel) onCancel();
    cleanup();
  });

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) {
      if (onCancel) onCancel();
      cleanup();
    }
  });

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      saveBtn.click();
    } else if (e.key === 'Escape') {
      cancelBtn.click();
    }
  });
}

export function showDateModal(
  currentValue: string,
  onSave: (value: string) => void,
  onCancel?: () => void
): void {
  const overlay = document.createElement('div');
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
  `;

  const modal = document.createElement('div');
  modal.style.cssText = `
    background: white;
    border-radius: 12px;
    padding: 24px;
    width: 90%;
    max-width: 400px;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  `;

  modal.innerHTML = `
    <div style="margin-bottom: 20px;">
      <div style="font-size: 18px; font-weight: 600; margin-bottom: 4px;">Set Target Date</div>
      <div style="font-size: 13px; color: #64748b;">Enter the target date for this milestone</div>
    </div>
    <div style="margin-bottom: 20px;">
      <label style="display: block; font-size: 12px; font-weight: 500; color: #475569; margin-bottom: 6px;">
        Target Date
      </label>
      <input 
        type="date" 
        id="dateInput" 
        value="${currentValue}" 
        style="width: 100%; padding: 10px 12px; border: 1px solid #d1d5db; border-radius: 8px; font-size: 14px; box-sizing: border-box;"
        autofocus
      />
    </div>
    <div style="display: flex; gap: 8px; justify-content: flex-end;">
      <button id="cancelBtn" class="btn btn-quiet" style="text-decoration: none;">Cancel</button>
      <button id="saveBtn" class="btn btn-accent" style="text-decoration: none;">Save</button>
    </div>
  `;

  overlay.appendChild(modal);
  document.body.appendChild(overlay);

  const input = modal.querySelector('#dateInput') as HTMLInputElement;
  const saveBtn = modal.querySelector('#saveBtn') as HTMLButtonElement;
  const cancelBtn = modal.querySelector('#cancelBtn') as HTMLButtonElement;

  const cleanup = () => {
    document.body.removeChild(overlay);
  };

  saveBtn.addEventListener('click', () => {
    const value = input.value;
    if (value) {
      onSave(value);
      cleanup();
    }
  });

  cancelBtn.addEventListener('click', () => {
    if (onCancel) onCancel();
    cleanup();
  });

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) {
      if (onCancel) onCancel();
      cleanup();
    }
  });

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      saveBtn.click();
    } else if (e.key === 'Escape') {
      cancelBtn.click();
    }
  });
}

