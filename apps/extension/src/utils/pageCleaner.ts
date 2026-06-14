const SP_INJECTED_SELECTORS = [
  '.sp-skip-notice',
  '.sp-toast-visible',
  '#sp-toast',
  '#sp-upcoming-bar',
  '.sp-timeline-block',
].join(', ');

export function cleanPage(): void {
  if (document.readyState !== 'complete') return;
  for (const el of document.querySelectorAll(SP_INJECTED_SELECTORS)) {
    el.remove();
  }
}
