import type { SegmentCategory } from '../types/shared';
import { SEGMENT_CATEGORIES } from '../types/shared';
import type { SponsorSegment } from '../types/types';

const TIMESTAMP_PATTERN = /(\d+:\d+(?::\d+)?(?:\.\d+)?)/g;

function formatSecondsAsTimestamp(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = Math.floor(totalSeconds % 60);
  const tenths = Math.round((totalSeconds % 1) * 10);

  const base =
    hours > 0
      ? `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
      : `${minutes}:${String(seconds).padStart(2, '0')}`;

  return tenths > 0 ? `${base}.${tenths}` : base;
}

function parseTimestampToSeconds(timestamp: string): number | null {
  const parts = timestamp.split(':').map(Number);
  if (parts.some(Number.isNaN)) return null;
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  return null;
}

function detectCategoryFromLine(line: string): SegmentCategory {
  const normalizedLine = line.toLowerCase();
  const matched = (SEGMENT_CATEGORIES as readonly string[]).find(
    (category) =>
      normalizedLine.includes(category.replace('_', ' ')) || normalizedLine.includes(category),
  ) as SegmentCategory | undefined;
  return matched ?? 'sponsor';
}

export function exportSegments(segments: SponsorSegment[]): string {
  return segments
    .map(
      (segment) =>
        `${formatSecondsAsTimestamp(segment.startTime)} - ${formatSecondsAsTimestamp(segment.endTime)} ${segment.category}`,
    )
    .join('\n');
}

export function importSegments(rawText: string, videoDuration: number): SponsorSegment[] {
  const lines = rawText.trim().split('\n').filter(Boolean);
  const parsedSegments: SponsorSegment[] = [];

  for (const line of lines) {
    const parsedTimestamps = [...line.matchAll(TIMESTAMP_PATTERN)].map((match) =>
      parseTimestampToSeconds(match[1]),
    );

    if (parsedTimestamps.length === 0 || parsedTimestamps[0] === null) continue;

    const startTime = parsedTimestamps[0] as number;
    const endTime =
      parsedTimestamps.length >= 2 && parsedTimestamps[1] !== null
        ? (parsedTimestamps[1] as number)
        : null;

    parsedSegments.push({
      startTime,
      endTime: endTime ?? videoDuration,
      category: detectCategoryFromLine(line),
      confidence: 1.0,
      source: 'crowdsourced',
      actionType: 'skip',
    });
  }

  for (let segmentIndex = 0; segmentIndex < parsedSegments.length - 1; segmentIndex++) {
    const isEndTimeInferred = parsedSegments[segmentIndex].endTime === videoDuration;
    if (isEndTimeInferred) {
      parsedSegments[segmentIndex] = {
        ...parsedSegments[segmentIndex],
        endTime: parsedSegments[segmentIndex + 1].startTime,
      };
    }
  }

  return parsedSegments;
}

export async function exportSegmentsToClipboard(segments: SponsorSegment[]): Promise<string> {
  const exportedText = exportSegments(segments);
  if (exportedText) await navigator.clipboard.writeText(exportedText);
  return exportedText;
}
