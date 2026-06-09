import { DEFAULT_GLOBAL_SETTINGS, DEFAULT_USER_PREFERENCES } from '../types/storage';
import type { LocalStorageSchema, UserPreferences, AIProvider } from '../types/storage';
import type { SegmentCategory } from '../types/types';

function getEl<T extends HTMLElement>(id: string): T {
  const el = document.getElementById(id);
  if (!el) throw new Error(`[SponsorPulse] #${id} not found`);
  return el as T;
}

const enableToggle = getEl<HTMLInputElement>('enable-toggle');
const statusBadge = getEl<HTMLSpanElement>('status-badge');
const statusText = getEl<HTMLSpanElement>('status-text');
const settingsPanel = getEl<HTMLDivElement>('settings-panel');
const notificationToggle = getEl<HTMLInputElement>('notification-toggle');
const aiProviderSelect = getEl<HTMLSelectElement>('ai-provider-select');
const categoryTogglesContainer = getEl<HTMLDivElement>('category-toggles-container');

let currentPreferences: UserPreferences = { ...DEFAULT_USER_PREFERENCES };

function applyEnabled(enabled: boolean): void {
  enableToggle.checked = enabled;
  statusBadge.classList.toggle('active', enabled);
  statusText.textContent = enabled ? 'Active' : 'Inactive';
  settingsPanel.classList.toggle('disabled', !enabled);
}

function save(patch: Partial<LocalStorageSchema>): void {
  void chrome.storage.local.set(patch);
}

function createCategoryToggle(category: SegmentCategory, autoSkip: boolean) {
  const row = document.createElement('div');
  row.className = 'setting-row';
  
  const formattedCategory = category.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase());
  
  row.innerHTML = `
    <div class="setting-info">
      <span class="setting-label">${formattedCategory}</span>
      <span class="setting-desc">Auto-skip ${formattedCategory.toLowerCase()}</span>
    </div>
    <label class="switch" aria-label="Auto-skip ${formattedCategory}">
      <input type="checkbox" id="toggle-${category}" ${autoSkip ? 'checked' : ''} />
      <span class="switch-track"></span>
    </label>
  `;

  const input = row.querySelector(`#toggle-${category}`) as HTMLInputElement;
  input.addEventListener('change', () => {
    currentPreferences[category].autoSkip = input.checked;
    save({ userPreferences: currentPreferences });
  });

  return row;
}

async function init(): Promise<void> {
  const result = (await chrome.storage.local.get(['enabled', 'showNotification', 'aiProvider', 'userPreferences'])) as Partial<LocalStorageSchema>;
  
  const enabled = result.enabled ?? DEFAULT_GLOBAL_SETTINGS.enabled;
  const showNotification = result.showNotification ?? DEFAULT_GLOBAL_SETTINGS.showNotification;
  const aiProvider = result.aiProvider ?? DEFAULT_GLOBAL_SETTINGS.aiProvider;
  currentPreferences = result.userPreferences ?? DEFAULT_USER_PREFERENCES;

  applyEnabled(enabled);
  notificationToggle.checked = showNotification;
  aiProviderSelect.value = aiProvider;

  categoryTogglesContainer.innerHTML = '';
  for (const category of Object.keys(currentPreferences) as SegmentCategory[]) {
    categoryTogglesContainer.appendChild(
      createCategoryToggle(category, currentPreferences[category].autoSkip)
    );
  }
}

enableToggle.addEventListener('change', () => {
  const enabled = enableToggle.checked;
  applyEnabled(enabled);
  save({ enabled });
});

notificationToggle.addEventListener('change', () => {
  save({ showNotification: notificationToggle.checked });
});

aiProviderSelect.addEventListener('change', () => {
  save({ aiProvider: aiProviderSelect.value as AIProvider });
});

void init();
