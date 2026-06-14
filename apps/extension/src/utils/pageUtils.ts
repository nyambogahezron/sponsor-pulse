export function getUrlStartTime(): number {
  const param =
    new URLSearchParams(window.location.search).get('t') ??
    new URLSearchParams(window.location.search).get('time_continue');
  return urlTimeToSeconds(param ?? '');
}

export function urlTimeToSeconds(time: string): number {
  if (!time) return 0;
  const match = /(?:(\d{1,3})h)?(?:(\d{1,2})m)?(\d+)s?/.exec(time);
  if (match) {
    return +(match[1] ?? 0) * 3600 + +(match[2] ?? 0) * 60 + +match[3];
  }
  return /^\d+$/.test(time) ? parseInt(time, 10) : 0;
}

export function isInPreviewPlayer(element: Element): boolean {
  return !!element.closest('#inline-preview-player');
}

export function isVisible(element: HTMLElement): boolean {
  return !!element && element.offsetWidth > 0 && element.offsetHeight > 0;
}

export function isPlayingPlaylist(): boolean {
  return window.location.search.includes('&list=');
}
