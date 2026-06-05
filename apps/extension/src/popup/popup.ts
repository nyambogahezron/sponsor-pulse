type Sensitivity = 'low' | 'medium' | 'high';

interface StorageData {
  enabled: boolean;
  autoSkip: boolean;
  showNotification: boolean;
  aiFallbackSensitivity: Sensitivity;
}

const DEFAULTS: StorageData = {
  enabled: true,
  autoSkip: false,
  showNotification: true,
  aiFallbackSensitivity: 'medium',
};

function getEl<T extends HTMLElement>(id: string): T {
  const el = document.getElementById(id);
  if (!el) throw new Error(`[SponsorPulse] #${id} not found`);
  return el as T;
}

const enableToggle = getEl<HTMLInputElement>('enable-toggle');
const statusBadge = getEl<HTMLSpanElement>('status-badge');
const statusText = getEl<HTMLSpanElement>('status-text');
const settingsPanel = getEl<HTMLDivElement>('settings-panel');
const autoSkipToggle = getEl<HTMLInputElement>('auto-skip-toggle');
const notificationToggle = getEl<HTMLInputElement>('notification-toggle');
const sensitivitySelect = getEl<HTMLSelectElement>('sensitivity-select');

function applyEnabled(enabled: boolean): void {
  enableToggle.checked = enabled;
  statusBadge.classList.toggle('active', enabled);
  statusText.textContent = enabled ? 'Active' : 'Inactive';
  // Dim settings panel when extension is globally disabled
  settingsPanel.classList.toggle('disabled', !enabled);
}

function applyAutoSkip(autoSkip: boolean): void {
  autoSkipToggle.checked = autoSkip;
}

function applyNotification(showNotification: boolean): void {
  notificationToggle.checked = showNotification;
}

function applySensitivity(sensitivity: Sensitivity): void {
  sensitivitySelect.value = sensitivity;
}

function applyAll(data: StorageData): void {
  applyEnabled(data.enabled);
  applyAutoSkip(data.autoSkip);
  applyNotification(data.showNotification);
  applySensitivity(data.aiFallbackSensitivity);
}

async function load(): Promise<StorageData> {
  const result = await chrome.storage.local.get(Object.keys(DEFAULTS));
  return { ...DEFAULTS, ...(result as Partial<StorageData>) };
}

function save(patch: Partial<StorageData>): void {
  void chrome.storage.local.set(patch);
}

enableToggle.addEventListener('change', () => {
  const enabled = enableToggle.checked;
  applyEnabled(enabled);
  save({ enabled });
});

autoSkipToggle.addEventListener('change', () => {
  const autoSkip = autoSkipToggle.checked;
  save({ autoSkip });
});

notificationToggle.addEventListener('change', () => {
  const showNotification = notificationToggle.checked;
  save({ showNotification });
});

sensitivitySelect.addEventListener('change', () => {
  const aiFallbackSensitivity = sensitivitySelect.value as Sensitivity;
  save({ aiFallbackSensitivity });
});

async function init(): Promise<void> {
  const data = await load();
  applyAll(data);
}

void init();
