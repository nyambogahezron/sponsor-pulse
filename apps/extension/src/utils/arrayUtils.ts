export function partition<T>(arr: T[], pred: (el: T) => boolean): [T[], T[]] {
  const pass: T[] = [];
  const fail: T[] = [];
  for (const el of arr) {
    (pred(el) ? pass : fail).push(el);
  }
  return [pass, fail];
}
