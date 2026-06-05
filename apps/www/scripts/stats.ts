interface StatsData {
  totalSkipped: number;
  totalTimeSavedSeconds: number;
  videosAnalyzed: number;
}

const DEFAULT_STATS: StatsData = {
  totalSkipped: 0,
  totalTimeSavedSeconds: 0,
  videosAnalyzed: 0,
};

const els = {
  skipped: document.getElementById('stat-skipped') as HTMLElement,
  time: document.getElementById('stat-time') as HTMLElement,
  videos: document.getElementById('stat-videos') as HTMLElement,
};

function animateValue(obj: HTMLElement, start: number, end: number, duration: number, suffix = '') {
  let startTimestamp: number | null = null;
  const step = (timestamp: number) => {
    if (!startTimestamp) startTimestamp = timestamp;
    const progress = Math.min((timestamp - startTimestamp) / duration, 1);

    // easeOutQuart
    const easeProgress = 1 - (1 - progress) ** 4;

    const current = Math.floor(easeProgress * (end - start) + start);

    // Add inner HTML with styled suffix if provided
    if (suffix) {
      obj.innerHTML = `${current}<span style="font-size: 24px; color: var(--muted); margin-left: 4px;">${suffix}</span>`;
    } else {
      obj.innerHTML = current.toString();
    }

    if (progress < 1) {
      window.requestAnimationFrame(step);
    }
  };
  window.requestAnimationFrame(step);
}

async function loadStats() {
  const data = (await chrome.storage.local.get(DEFAULT_STATS)) as StatsData;

  const minutesSaved = Math.floor(data.totalTimeSavedSeconds / 60);

  animateValue(els.skipped, 0, data.totalSkipped, 1500);
  animateValue(els.time, 0, minutesSaved, 1500, 'min');
  animateValue(els.videos, 0, data.videosAnalyzed, 1500);
}

document.addEventListener('DOMContentLoaded', () => {
  void loadStats();
});
