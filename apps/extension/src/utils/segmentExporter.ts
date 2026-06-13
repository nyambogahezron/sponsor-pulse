import type { SegmentCategory } from '../types/shared';
import { SEGMENT_CATEGORIES } from '../types/shared';
import type { SponsorSegment } from '../types/types';

function secondsToTimestamp(s: number): string {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = Math.floor(s % 60);
  const ms = Math.round((s % 1) * 10);
  const base =
    h > 0
      ? `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
      : `${m}:${String(sec).padStart(2, '0')}`;
  return ms > 0 ? `${base}.${ms}` : base;
}

function timestampToSeconds(ts: string): number | null {
  const parts = ts.split(':').map(Number);
  if (parts.some(Number.isNaN)) return null;
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  return null;
}

export function exportSegments(segments: SponsorSegment[]): string {
  return segments
    .map(
      (seg) =>
        `${secondsToTimestamp(seg.startTime)} - ${secondsToTimestamp(seg.endTime)} ${seg.category}`,
    )
    .join('\n');
}

const TIME_PATTERN = /(\d+:\d+(?::\d+)?(?:\.\d+)?)/g;

export function importSegments(text: string, videoDuration: number): SponsorSegment[] {
  const lines = text.trim().split('\n').filter(Boolean);
  const results: SponsorSegment[] = [];

  for (const line of lines) {
    const times = [...line.matchAll(TIME_PATTERN)].map((m) => timestampToSeconds(m[1]));
    if (times.length === 0 || times[0] === null) continue;

    const startTime = times[0] as number;
    const endTime = times.length >= 2 && times[1] !== null ? (times[1] as number) : null;
    const lineLower = line.toLowerCase();
    const detectedCategory = (SEGMENT_CATEGORIES as readonly string[]).find(
      (cat) => lineLower.includes(cat.replace('_', ' ')) || lineLower.includes(cat),
    ) as SegmentCategory | undefined;

    results.push({
      startTime,
      endTime: endTime ?? videoDuration,
      category: detectedCategory ?? ('sponsor' as SegmentCategory),
      confidence: 1.0,
      source: 'crowdsourced',
      actionType: 'skip',
    });
  }

  for (let i = 0; i < results.length - 1; i++) {
    if (results[i].endTime === videoDuration && i + 1 < results.length) {
      results[i] = { ...results[i], endTime: results[i + 1].startTime };
    }
  }

  return results;
}

export async function exportSegmentsToClipboard(segments: SponsorSegment[]): Promise<string> {
  const text = exportSegments(segments);
  if (text) await navigator.clipboard.writeText(text);
  return text;
}
