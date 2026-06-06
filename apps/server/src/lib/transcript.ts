import { YoutubeTranscript, YoutubeTranscriptError } from 'youtube-transcript';

export class TranscriptNotAvailableError extends Error {
  constructor(videoId: string) {
    super(`No transcript available for video: ${videoId}`);
    this.name = 'TranscriptNotAvailableError';
  }
}

function secondsToTimestamp(seconds: number): string {
  const totalSeconds = Math.floor(seconds);
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return `[${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}]`;
}

export async function fetchTranscript(videoId: string): Promise<string> {
  console.log(`[fetchTranscript] Fetching transcript for video: ${videoId}`);

  let items: Array<{ text: string; offset: number; duration: number }>;

  try {
    items = await YoutubeTranscript.fetchTranscript(videoId, { lang: 'en' });
  } catch (err) {
    if (
      err instanceof YoutubeTranscriptError ||
      (err instanceof Error && err.message.toLowerCase().includes('transcript'))
    ) {
      throw new TranscriptNotAvailableError(videoId);
    }
    throw err;
  }

  if (!items || items.length === 0) {
    throw new TranscriptNotAvailableError(videoId);
  }

  const formatted = items
    .map((item) => `${secondsToTimestamp(item.offset / 1000)} ${item.text.trim()}`)
    .join('\n');

  console.log(`[fetchTranscript] Got ${items.length} transcript entries for video: ${videoId}`);

  return formatted;
}
