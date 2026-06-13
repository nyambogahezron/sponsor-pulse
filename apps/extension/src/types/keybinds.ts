export type KeybindAction =
  | 'skipSegment'
  | 'closeNotice'
  | 'skipToEnd'
  | 'prevSegment'
  | 'nextSegment';

export type KeybindMap = Record<KeybindAction, string>;

export const DEFAULT_KEYBINDS: KeybindMap = {
  skipSegment: 's',
  closeNotice: 'x',
  skipToEnd: 'e',
  prevSegment: '[',
  nextSegment: ']',
};

export const KEYBIND_LABELS: Record<KeybindAction, string> = {
  skipSegment: 'Skip segment',
  closeNotice: 'Close notice',
  skipToEnd: 'Jump to end',
  prevSegment: 'Previous segment',
  nextSegment: 'Next segment',
};
