interface StorageData {
  enabled: boolean;
  autoSkip: boolean;
  showNotification: boolean;
  aiFallbackSensitivity: 'low' | 'medium' | 'high';
}

const DEFAULTS: StorageData = {
  enabled: true,
  autoSkip: true,
  showNotification: true,
  aiFallbackSensitivity: 'medium',
};

const els = {
  enableToggle: document.getElementById('enable-toggle') as HTMLInputElement,
  autoSkipToggle: document.getElementById('auto-skip-toggle') as HTMLInputElement,
  notificationToggle: document.getElementById('notification-toggle') as HTMLInputElement,
  sensitivitySelect: document.getElementById('sensitivity-select') as HTMLSelectElement,
  playbackGroup: document.getElementById('playback') as HTMLElement,
  aiGroup: document.getElementById('ai') as HTMLElement,
  sidebarLinks: document.querySelectorAll('.sidebar-link') as NodeListOf<HTMLAnchorElement>,
};

function updateDisabledState(isEnabled: boolean) {
  if (isEnabled) {
    els.playbackGroup.classList.remove('disabled');
    els.aiGroup.classList.remove('disabled');
  } else {
    els.playbackGroup.classList.add('disabled');
    els.aiGroup.classList.add('disabled');
  }
}

async function loadSettings() {
  const data = (await chrome.storage.local.get(DEFAULTS)) as StorageData;

  els.enableToggle.checked = data.enabled;
  els.autoSkipToggle.checked = data.autoSkip;
  els.notificationToggle.checked = data.showNotification;
  els.sensitivitySelect.value = data.aiFallbackSensitivity;

  updateDisabledState(data.enabled);
}

function bindEvents() {
  els.enableToggle.addEventListener('change', () => {
    const isEnabled = els.enableToggle.checked;
    void chrome.storage.local.set({ enabled: isEnabled });
    updateDisabledState(isEnabled);
  });

  els.autoSkipToggle.addEventListener('change', () => {
    void chrome.storage.local.set({ autoSkip: els.autoSkipToggle.checked });
  });

  els.notificationToggle.addEventListener('change', () => {
    void chrome.storage.local.set({ showNotification: els.notificationToggle.checked });
  });

  els.sensitivitySelect.addEventListener('change', () => {
    void chrome.storage.local.set({ aiFallbackSensitivity: els.sensitivitySelect.value });
  });

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const id = entry.target.id;
          els.sidebarLinks.forEach((link) => {
            link.classList.toggle('active', link.getAttribute('href') === `#${id}`);
          });
        }
      });
    },
    { rootMargin: '-20% 0px -80% 0px' },
  );

  document.querySelectorAll('section[id]').forEach((section) => {
    observer.observe(section);
  });
}

document.addEventListener('DOMContentLoaded', () => {
  void loadSettings();
  bindEvents();
});
