import type { KeybindAction, KeybindMap } from '../types/keybinds';
import { DEFAULT_KEYBINDS, KEYBIND_LABELS } from '../types/keybinds';
import { SEGMENT_CATEGORIES } from '../types/shared';
import type {
  AIProvider,
  CategoryColors,
  LocalStorageSchema,
  NoticeVisibilityMode,
  SkipRule,
  UserPreferences,
} from '../types/storage';
import { DEFAULT_GLOBAL_SETTINGS, DEFAULT_USER_PREFERENCES } from '../types/storage';
import type { SegmentCategory } from '../types/types';
import { DEFAULT_CATEGORY_COLORS } from '../utils/colorUtils';
import { exportSegmentsToClipboard } from '../utils/segmentExporter';
import { createProfile, deleteProfile, getAllProfiles } from '../utils/skipProfiles';
import { createRule, getOperatorsForAttribute } from '../utils/skipRuleParser';

// DOM helpers ──────────────────────────────────────────────────────────────

function getEl<T extends HTMLElement>(id: string): T {
  const el = document.getElementById(id);
  if (!el) throw new Error(`[SponsorPulse] #${id} not found`);
  return el as T;
}

// Elements ─

const enableToggle = getEl<HTMLInputElement>('enable-toggle');
const statusBadge = getEl<HTMLSpanElement>('status-badge');
const statusText = getEl<HTMLSpanElement>('status-text');
const settingsPanel = getEl<HTMLDivElement>('settings-panel');
const notificationToggle = getEl<HTMLInputElement>('notification-toggle');
const aiProviderSelect = getEl<HTMLSelectElement>('ai-provider-select');
const noticeModeSelect = getEl<HTMLSelectElement>('notice-mode-select');
const upcomingHintToggle = getEl<HTMLInputElement>('upcoming-hint-toggle');
const audioCueToggle = getEl<HTMLInputElement>('audio-cue-toggle');
const minDurationSlider = getEl<HTMLInputElement>('min-duration-slider');
const minDurationDisplay = getEl<HTMLSpanElement>('min-duration-display');
const categoryTogglesContainer = getEl<HTMLDivElement>('category-toggles-container');
const keybindRowsContainer = getEl<HTMLDivElement>('keybind-rows-container');
const profilesContainer = getEl<HTMLDivElement>('profiles-container');
const newProfileNameInput = getEl<HTMLInputElement>('new-profile-name');
const createProfileBtn = getEl<HTMLButtonElement>('create-profile-btn');
const colorPickersContainer = getEl<HTMLDivElement>('color-pickers-container');
const rulesContainer = getEl<HTMLDivElement>('rules-container');
const addRuleBtn = getEl<HTMLButtonElement>('add-rule-btn');
const exportSegmentsBtn = getEl<HTMLButtonElement>('export-segments-btn');
const debugExportBtn = getEl<HTMLButtonElement>('debug-export-btn');
const resetBtn = getEl<HTMLButtonElement>('reset-btn');

// State ────

let currentPreferences: UserPreferences = { ...DEFAULT_USER_PREFERENCES };
let currentKeybinds: KeybindMap = { ...DEFAULT_KEYBINDS };
let currentColors: CategoryColors = {};
let currentRules: SkipRule[] = [];

// Utilities

function applyEnabled(enabled: boolean): void {
  enableToggle.checked = enabled;
  statusBadge.classList.toggle('active', enabled);
  statusText.textContent = enabled ? 'Active' : 'Inactive';
  settingsPanel.classList.toggle('disabled', !enabled);
}

function save(patch: Partial<LocalStorageSchema>): void {
  void chrome.storage.local.set(patch);
}

function showButtonFeedback(btn: HTMLButtonElement, msg: string): void {
  const orig = btn.textContent;
  btn.textContent = msg;
  btn.disabled = true;
  setTimeout(() => {
    btn.textContent = orig;
    btn.disabled = false;
  }, 1800);
}

// Category toggles ─────────────────────────────────────────────────────────

function createCategoryToggle(category: SegmentCategory, autoSkip: boolean): HTMLElement {
  const row = document.createElement('div');
  row.className = 'setting-row';

  const label = category.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

  row.innerHTML = `
    <div class="setting-info">
      <span class="setting-label">${label}</span>
      <span class="setting-desc">Auto-skip ${label.toLowerCase()}</span>
    </div>
    <label class="switch" aria-label="Auto-skip ${label}">
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

function renderCategoryToggles(): void {
  categoryTogglesContainer.innerHTML = '';
  for (const category of Object.keys(currentPreferences) as SegmentCategory[]) {
    categoryTogglesContainer.appendChild(
      createCategoryToggle(category, currentPreferences[category].autoSkip),
    );
  }
}

// Keybinds

function renderKeybinds(): void {
  keybindRowsContainer.innerHTML = '';
  for (const [action, label] of Object.entries(KEYBIND_LABELS) as [KeybindAction, string][]) {
    const row = document.createElement('div');
    row.className = 'setting-row';
    row.innerHTML = `
      <div class="setting-info">
        <span class="setting-label">${label}</span>
      </div>
      <input type="text" class="sp-keybind-input" maxlength="20"
             id="kb-${action}" value="${currentKeybinds[action]}"
             aria-label="Keybind for ${label}" />
    `;
    const input = row.querySelector(`#kb-${action}`) as HTMLInputElement;
    input.addEventListener('keydown', (e) => {
      e.preventDefault();
      const key = e.key === ' ' ? 'Space' : e.key;
      input.value = key;
      currentKeybinds[action] = key;
      save({ keybinds: currentKeybinds });
    });
    keybindRowsContainer.appendChild(row);
  }
}

// Skip Profiles ───────────────────────────────────────────────────────────

async function renderProfiles(): Promise<void> {
  const profiles = await getAllProfiles();
  profilesContainer.innerHTML = '';

  if (profiles.length === 0) {
    profilesContainer.innerHTML =
      '<div class="setting-row setting-row--info"><span class="setting-desc">No profiles yet.</span></div>';
    return;
  }

  for (const profile of profiles) {
    const row = document.createElement('div');
    row.className = 'setting-row';
    row.innerHTML = `
      <div class="setting-info">
        <span class="setting-label">${profile.name}</span>
        <span class="setting-desc">Min duration: ${profile.minSegmentDuration}s</span>
      </div>
      <button class="sp-btn sp-btn--ghost" data-delete-profile="${profile.id}" aria-label="Delete ${profile.name}">✕</button>
    `;
    const delBtn = row.querySelector(`[data-delete-profile]`) as HTMLButtonElement;
    delBtn.addEventListener('click', async () => {
      await deleteProfile(profile.id);
      await renderProfiles();
    });
    profilesContainer.appendChild(row);
  }
}

createProfileBtn.addEventListener('click', async () => {
  const name = newProfileNameInput.value.trim();
  if (!name) return;
  await createProfile(name, currentPreferences);
  newProfileNameInput.value = '';
  await renderProfiles();
  showButtonFeedback(createProfileBtn, '✓ Created');
});

// Color pickers ───────────────────────────────────────────────────────────

function renderColorPickers(): void {
  colorPickersContainer.innerHTML = '';
  for (const category of SEGMENT_CATEGORIES) {
    const current = currentColors[category] ?? DEFAULT_CATEGORY_COLORS[category];
    const label = category.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

    const row = document.createElement('div');
    row.className = 'setting-row';
    row.innerHTML = `
      <div class="setting-info">
        <span class="setting-label">${label}</span>
      </div>
      <input type="color" id="color-${category}" value="${current}"
             aria-label="${label} color" class="sp-color-input" />
    `;
    const input = row.querySelector(`#color-${category}`) as HTMLInputElement;
    input.addEventListener('input', () => {
      currentColors[category] = input.value;
      save({ categoryColors: currentColors });
    });
    colorPickersContainer.appendChild(row);
  }
}

// Skip Rules ──────────────────────────────────────────────────────────────

function renderRules(): void {
  rulesContainer.innerHTML = '';
  if (currentRules.length === 0) {
    rulesContainer.innerHTML =
      '<div class="setting-row setting-row--info"><span class="setting-desc">No rules. Rules override category defaults.</span></div>';
    return;
  }

  for (let i = 0; i < currentRules.length; i++) {
    const rule = currentRules[i];
    const row = document.createElement('div');
    row.className = 'setting-row setting-row--rule';
    row.innerHTML = `
      <div class="setting-info" style="flex:1">
        <div class="sp-rule-editor">
          <select class="sp-rule-attr" aria-label="Rule attribute">
            <option value="category" ${rule.attribute === 'category' ? 'selected' : ''}>category</option>
            <option value="duration" ${rule.attribute === 'duration' ? 'selected' : ''}>duration</option>
            <option value="startTime" ${rule.attribute === 'startTime' ? 'selected' : ''}>start</option>
            <option value="endTime" ${rule.attribute === 'endTime' ? 'selected' : ''}>end</option>
          </select>
          <select class="sp-rule-op" aria-label="Rule operator">
            ${getOperatorsForAttribute(rule.attribute)
              .map(
                (op) =>
                  `<option value="${op}" ${rule.operator === op ? 'selected' : ''}>${op}</option>`,
              )
              .join('')}
          </select>
          <input type="text" class="sp-rule-val sp-text-input" value="${rule.value}"
                 placeholder="value" aria-label="Rule value" />
          <select class="sp-rule-action" aria-label="Rule action">
            <option value="auto-skip" ${rule.action === 'auto-skip' ? 'selected' : ''}>auto-skip</option>
            <option value="mute" ${rule.action === 'mute' ? 'selected' : ''}>mute</option>
            <option value="manual" ${rule.action === 'manual' ? 'selected' : ''}>manual</option>
            <option value="disabled" ${rule.action === 'disabled' ? 'selected' : ''}>disabled</option>
          </select>
        </div>
      </div>
      <button class="sp-btn sp-btn--ghost" aria-label="Delete rule">✕</button>
    `;

    // Wire changes
    const attrSel = row.querySelector('.sp-rule-attr') as HTMLSelectElement;
    const opSel = row.querySelector('.sp-rule-op') as HTMLSelectElement;
    const valInput = row.querySelector('.sp-rule-val') as HTMLInputElement;
    const actionSel = row.querySelector('.sp-rule-action') as HTMLSelectElement;
    const delBtn = row.querySelector('.sp-btn--ghost') as HTMLButtonElement;

    const updateRule = () => {
      currentRules[i] = {
        ...currentRules[i],
        attribute: attrSel.value as SkipRule['attribute'],
        operator: opSel.value as SkipRule['operator'],
        value: Number.isNaN(Number(valInput.value)) ? valInput.value : Number(valInput.value),
        action: actionSel.value as SkipRule['action'],
      };
      save({ skipRules: currentRules });
    };

    attrSel.addEventListener('change', () => {
      // Refresh operator options when attribute changes
      currentRules[i].attribute = attrSel.value as SkipRule['attribute'];
      renderRules();
      save({ skipRules: currentRules });
    });
    opSel.addEventListener('change', updateRule);
    valInput.addEventListener('change', updateRule);
    actionSel.addEventListener('change', updateRule);
    delBtn.addEventListener('click', () => {
      currentRules.splice(i, 1);
      save({ skipRules: currentRules });
      renderRules();
    });

    rulesContainer.appendChild(row);
  }
}

addRuleBtn.addEventListener('click', () => {
  currentRules.push(createRule());
  save({ skipRules: currentRules });
  renderRules();
});

// Data & Debug ─────────────────────────────────────────────────────────────

exportSegmentsBtn.addEventListener('click', async () => {
  // Get segments from the active tab's content script via storage
  const { currentSegments = [] } = (await chrome.storage.local.get('currentSegments')) as {
    currentSegments: import('../types/types').SponsorSegment[];
  };
  if (currentSegments.length === 0) {
    showButtonFeedback(exportSegmentsBtn, 'No segments');
    return;
  }
  await exportSegmentsToClipboard(currentSegments);
  showButtonFeedback(exportSegmentsBtn, '✓ Copied!');
});

debugExportBtn.addEventListener('click', async () => {
  const all = (await chrome.storage.local.get(null)) as Partial<LocalStorageSchema>;
  const sanitised = {
    extensionVersion: chrome.runtime.getManifest().version,
    aiProvider: all.aiProvider,
    enabled: all.enabled,
    categoryPreferences: all.userPreferences,
    skipRuleCount: (all.skipRules ?? []).length,
    profileCount: (all.skipProfiles ?? []).length,
    dismissedVideoCount: Object.keys(all.dismissedSegments ?? {}).length,
    noticeVisibilityMode: all.noticeVisibilityMode,
    minSegmentDuration: all.minSegmentDuration,
  };
  await navigator.clipboard.writeText(JSON.stringify(sanitised, null, 2));
  showButtonFeedback(debugExportBtn, '✓ Copied!');
});

resetBtn.addEventListener('click', async () => {
  if (!confirm('Reset ALL SponsorPulse settings to defaults? This cannot be undone.')) return;
  await chrome.storage.local.clear();
  await chrome.storage.local.set({
    userPreferences: DEFAULT_USER_PREFERENCES,
    creatorWhitelist: [],
    ...DEFAULT_GLOBAL_SETTINGS,
  });
  showButtonFeedback(resetBtn, '✓ Reset');
  setTimeout(() => void init(), 500);
});

// Init ─────

async function init(): Promise<void> {
  const result = (await chrome.storage.local.get([
    'enabled',
    'showNotification',
    'aiProvider',
    'userPreferences',
    'noticeVisibilityMode',
    'showUpcomingHint',
    'audioNotificationOnSkip',
    'minSegmentDuration',
    'keybinds',
    'categoryColors',
    'skipRules',
  ])) as Partial<LocalStorageSchema>;

  const enabled = result.enabled ?? DEFAULT_GLOBAL_SETTINGS.enabled;
  const showNotification = result.showNotification ?? DEFAULT_GLOBAL_SETTINGS.showNotification;
  const aiProvider = result.aiProvider ?? DEFAULT_GLOBAL_SETTINGS.aiProvider;
  const noticeMode = result.noticeVisibilityMode ?? DEFAULT_GLOBAL_SETTINGS.noticeVisibilityMode;
  const showUpcomingHint = result.showUpcomingHint ?? DEFAULT_GLOBAL_SETTINGS.showUpcomingHint;
  const audioCue =
    result.audioNotificationOnSkip ?? DEFAULT_GLOBAL_SETTINGS.audioNotificationOnSkip;
  const minDuration = result.minSegmentDuration ?? DEFAULT_GLOBAL_SETTINGS.minSegmentDuration;

  currentPreferences = result.userPreferences ?? DEFAULT_USER_PREFERENCES;
  currentKeybinds = result.keybinds ?? DEFAULT_KEYBINDS;
  currentColors = result.categoryColors ?? {};
  currentRules = result.skipRules ?? [];

  applyEnabled(enabled);
  notificationToggle.checked = showNotification;
  aiProviderSelect.value = aiProvider;
  noticeModeSelect.value = noticeMode;
  upcomingHintToggle.checked = showUpcomingHint;
  audioCueToggle.checked = audioCue;
  minDurationSlider.value = String(minDuration);
  minDurationDisplay.textContent = String(minDuration);

  renderCategoryToggles();
  renderKeybinds();
  renderColorPickers();
  renderRules();
  await renderProfiles();
}

// Event listeners ──────────────────────────────────────────────────────────

enableToggle.addEventListener('change', () => {
  applyEnabled(enableToggle.checked);
  save({ enabled: enableToggle.checked });
});

notificationToggle.addEventListener('change', () =>
  save({ showNotification: notificationToggle.checked }),
);

aiProviderSelect.addEventListener('change', () =>
  save({ aiProvider: aiProviderSelect.value as AIProvider }),
);

noticeModeSelect.addEventListener('change', () =>
  save({ noticeVisibilityMode: noticeModeSelect.value as NoticeVisibilityMode }),
);

upcomingHintToggle.addEventListener('change', () =>
  save({ showUpcomingHint: upcomingHintToggle.checked }),
);

audioCueToggle.addEventListener('change', () =>
  save({ audioNotificationOnSkip: audioCueToggle.checked }),
);

minDurationSlider.addEventListener('input', () => {
  const v = Number(minDurationSlider.value);
  minDurationDisplay.textContent = String(v);
  save({ minSegmentDuration: v });
});

void init();
