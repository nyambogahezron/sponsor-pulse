import { YoutubeTranscript, YoutubeTranscriptError } from 'youtube-transcript';

// ─── Custom error types ───────────────────────────────────────────────────────

/**
 * Thrown when a video exists but has no transcript / captions available.
 * The analyze route maps this to a 404 response.
 */
export class TranscriptNotAvailableError extends Error {
  constructor(videoId: string) {
    super(`No transcript available for video: ${videoId}`);
    this.name = 'TranscriptNotAvailableError';
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Converts a float number of seconds to an `[HH:MM:SS]` timestamp string,
 * matching the format expected by the AI system prompt.
 */
function secondsToTimestamp(seconds: number): string {
  const totalSeconds = Math.floor(seconds);
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return `[${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}]`;
}

// ─── Main export ──────────────────────────────────────────────────────────────

/**
 * Fetches the English transcript for a YouTube video using the
 * `youtube-transcript` package and formats it for the AI system prompt.
 *
 * Each line is formatted as: `[HH:MM:SS] text`
 *
 * @throws {TranscriptNotAvailableError} if the video has no captions.
 * @throws {Error} on any other network / parsing failure.
 */
export async function fetchTranscript(videoId: string): Promise<string> {
  console.log(`[fetchTranscript] Fetching transcript for video: ${videoId}`);

  let items: Array<{ text: string; offset: number; duration: number }>;

  try {
    items = await YoutubeTranscript.fetchTranscript(videoId, { lang: 'en' });
  } catch (err) {
    // youtube-transcript throws YoutubeTranscriptError variants for known failures
    if (
      err instanceof YoutubeTranscriptError ||
      (err instanceof Error && err.message.toLowerCase().includes('transcript'))
    ) {
      throw new TranscriptNotAvailableError(videoId);
    }
    // Re-throw anything else (network failures, etc.)
    throw err;
  }

  if (!items || items.length === 0) {
    throw new TranscriptNotAvailableError(videoId);
  }

  // Build the timed-text string that matches the AI system prompt format
  const formatted = items
    .map((item) => `${secondsToTimestamp(item.offset / 1000)} ${item.text.trim()}`)
    .join('\n');

  console.log(
    `[fetchTranscript] Got ${items.length} transcript entries for video: ${videoId}`,
  );

  return formatted;
}
