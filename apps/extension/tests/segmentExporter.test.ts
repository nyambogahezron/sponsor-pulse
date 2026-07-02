import { describe, expect, test } from 'bun:test';
import type { SponsorSegment } from '../src/types/types';
import { exportSegments, importSegments } from '../src/utils/segmentExporter';

const mockSegments: SponsorSegment[] = [
  {
    uuid: 'a',
    startTime: 30,
    endTime: 60,
    category: 'sponsor',
    confidence: 1.0,
    source: 'ai-server',
    actionType: 'skip',
  },
  {
    uuid: 'b',
    startTime: 120,
    endTime: 150,
    category: 'merch',
    confidence: 1.0,
    source: 'ai-server',
    actionType: 'skip',
  },
];

describe('exportSegments', () => {
  test('formats segments as text lines', () => {
    const result = exportSegments(mockSegments);
    expect(result).toBe('0:30 - 1:00 sponsor\n2:00 - 2:30 merch');
  });

  test('returns empty string for empty array', () => {
    expect(exportSegments([])).toBe('');
  });
});

describe('importSegments', () => {
  test('parses exported text back into segments', () => {
    const text = '0:30 - 1:00 sponsor\n2:00 - 2:30 merch';
    const result = importSegments(text, 300);
    expect(result).toHaveLength(2);
    expect(result[0].startTime).toBe(30);
    expect(result[0].endTime).toBe(60);
    expect(result[0].category).toBe('sponsor');
    expect(result[1].startTime).toBe(120);
    expect(result[1].endTime).toBe(150);
    expect(result[1].category).toBe('merch');
  });

  test('handles single segment without end time', () => {
    const text = '1:30 sponsor';
    const result = importSegments(text, 300);
    expect(result).toHaveLength(1);
    expect(result[0].startTime).toBe(90);
    expect(result[0].endTime).toBe(300);
  });

  test('infers end time when missing and next segment exists', () => {
    const text = '0:00 sponsor\n2:00 merch';
    const result = importSegments(text, 500);
    expect(result).toHaveLength(2);
    expect(result[0].endTime).toBe(120);
    expect(result[1].endTime).toBe(500);
  });

  test('returns empty array for empty input', () => {
    expect(importSegments('', 300)).toEqual([]);
  });

  test('handles h:mm:ss timestamps', () => {
    const text = '1:02:30 - 1:05:00 sponsor';
    const result = importSegments(text, 5000);
    expect(result).toHaveLength(1);
    expect(result[0].startTime).toBe(3750);
    expect(result[0].endTime).toBe(3900);
  });
});
