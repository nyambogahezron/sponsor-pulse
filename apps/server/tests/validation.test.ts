import { beforeEach, describe, expect, mock, test } from 'bun:test';
import type { AnalyzeResponse, ErrorResponse } from '../src/types';

// Setup Mocks before importing the app
const mockFetchTranscript = mock();
mock.module('../src/lib/transcript', () => ({
  fetchTranscript: mockFetchTranscript,
  TranscriptNotAvailableError: class TranscriptNotAvailableError extends Error {
    constructor(videoId: string) {
      super(`No transcript available for video: ${videoId}`);
      this.name = 'TranscriptNotAvailableError';
    }
  },
}));

const mockAnalyzeTranscript = mock();
mock.module('../src/ai/providers', () => ({
  AIProviderFactory: {
    create: () => ({
      name: 'mock-provider',
      analyzeTranscript: mockAnalyzeTranscript,
    }),
    reset: () => {},
  },
}));

import app from '../src/index';

const validVideoId = 'a'.repeat(64); // 64-character hex string

describe('Validation & Edge Case Tests', () => {
  beforeEach(() => {
    mockFetchTranscript.mockReset();
    mockAnalyzeTranscript.mockReset();
  });

  test('Valid Payload - Returns 200 OK and expected structure', async () => {
    mockFetchTranscript.mockImplementationOnce(() =>
      Promise.resolve('[00:00:00] Flawless transcript mock'),
    );
    mockAnalyzeTranscript.mockImplementationOnce(() =>
      Promise.resolve([{ start: 0, end: 10, category: 'sponsor' }]),
    );

    const req = new Request('http://localhost/api/v1/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ videoId: validVideoId }),
    });

    const res = await app.fetch(req);
    expect(res.status).toBe(200);

    const json = (await res.json()) as AnalyzeResponse;
    expect(json).toMatchObject({
      videoId: validVideoId,
      provider: 'mock-provider',
      segments: [{ start: 0, end: 10, category: 'sponsor' }],
    });
    expect(typeof json.analyzedAt).toBe('number');
  });

  test('Missing videoId - Returns 400 Bad Request', async () => {
    const req = new Request('http://localhost/api/v1/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });

    const res = await app.fetch(req);
    expect(res.status).toBe(400);

    const json = (await res.json()) as ErrorResponse;
    expect(json.code).toBe('INVALID_VIDEO_ID');
  });

  test('Malformed videoId (too short) - Returns 400 Bad Request', async () => {
    const req = new Request('http://localhost/api/v1/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ videoId: '123' }),
    });

    const res = await app.fetch(req);
    expect(res.status).toBe(400);
    const json = (await res.json()) as ErrorResponse;
    expect(json.code).toBe('INVALID_VIDEO_ID');
  });

  test('Empty Transcript - Returns 200 OK with empty segments (no AI call)', async () => {
    mockFetchTranscript.mockImplementationOnce(() => Promise.resolve('   \n  '));

    const req = new Request('http://localhost/api/v1/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ videoId: validVideoId }),
    });

    const res = await app.fetch(req);
    expect(res.status).toBe(200);

    const json = (await res.json()) as AnalyzeResponse;
    expect(json.segments).toEqual([]);
    expect(mockAnalyzeTranscript).not.toHaveBeenCalled();
  });

  test('Malicious/Hallucinatory AI Response - Invalid Categories Stripped', async () => {
    mockFetchTranscript.mockImplementationOnce(() => Promise.resolve('[00:00:00] Mock transcript'));

    // The provider interface returns SponsorSegment[], but we mock it to return garbage
    // to simulate parseSegments letting something slip through, or just to test the route's safeParse.
    mockAnalyzeTranscript.mockImplementationOnce(() =>
      Promise.resolve([
        { start: 10, end: 20, category: 'sponsor' },
        { start: -5, end: 30, category: 'sponsor' }, // negative start
        { start: 40, end: 50, category: 'fake_category' }, // invalid category
      ] as AnalyzeResponse['segments']),
    );

    const req = new Request('http://localhost/api/v1/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ videoId: validVideoId }),
    });

    const res = await app.fetch(req);
    expect(res.status).toBe(200);

    const json = (await res.json()) as AnalyzeResponse;

    // Only the first one should survive the route's ServerSponsorSegmentSchema validation
    expect(json.segments).toHaveLength(1);
    expect(json.segments[0]).toEqual({
      uuid: expect.any(String),
      start: 10,
      end: 20,
      category: 'sponsor',
    });
  });
});
