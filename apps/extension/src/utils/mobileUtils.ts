export function isMobileControlsOpen(): boolean {
  return !!document.getElementById('player-control-overlay')?.classList.contains('fadein');
}
