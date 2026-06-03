/**
 * SponsorPulse toolbar popup
 *
 * Responsibilities:
 *  - Read `enabled` from chrome.storage.local on open
 *  - Reflect state in the toggle switch and status badge
 *  - Persist changes back to chrome.storage.local on toggle
 */

interface StorageData {
  enabled: boolean;
}
const STORAGE_KEY = 'enabled' satisfies keyof StorageData;

function getEl<T extends HTMLElement>(id: string): T {
  const el = document.getElementById(id);
  if (!el) throw new Error(`[SponsorPulse popup] Element #${id} not found.`);
  return el as T;
}

const toggle = getEl<HTMLInputElement>('enable-toggle');
const statusBadge = getEl<HTMLSpanElement>('status-badge');
const statusText = getEl<HTMLSpanElement>('status-text');

function applyState(enabled: boolean): void {
  toggle.checked = enabled;

  if (enabled) {
    statusBadge.classList.add('active');
    statusText.textContent = 'Active';
  } else {
    statusBadge.classList.remove('active');
    statusText.textContent = 'Inactive';
  }
}

async function init(): Promise<void> {
  const result = await chrome.storage.local.get(STORAGE_KEY);
  const enabled: boolean = (result as Partial<StorageData>)[STORAGE_KEY] ?? true;
  applyState(enabled);
}
toggle.addEventListener('change', () => {
  const enabled = toggle.checked;
  applyState(enabled);
  void chrome.storage.local.set({ [STORAGE_KEY]: enabled } satisfies StorageData);
});

void init();
