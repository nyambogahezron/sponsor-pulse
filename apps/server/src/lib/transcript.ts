import { YoutubeTranscript, YoutubeTranscriptError } from 'youtube-transcript';

export class TranscriptNotAvailableError extends Error {
  constructor(videoId: string) {
    super(`No transcript available for video: ${videoId}`);
    this.name = 'TranscriptNotAvailableError';
  }
}

function formatSecondsAsTimestamp(totalSeconds: number): string {
  const roundedSeconds = Math.floor(totalSeconds);
  const hours = Math.floor(roundedSeconds / 3600);
  const minutes = Math.floor((roundedSeconds % 3600) / 60);
  const seconds = roundedSeconds % 60;
  return `[${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}]`;
}

export async function fetchTranscript(videoId: string): Promise<string> {
  console.log(`[fetchTranscript] Fetching transcript for video: ${videoId}`);

  let transcriptItems: Array<{ text: string; offset: number; duration: number }>;

  try {
    transcriptItems = await YoutubeTranscript.fetchTranscript(videoId, { lang: 'en' });
  } catch (fetchError) {
    if (
      fetchError instanceof YoutubeTranscriptError ||
      (fetchError instanceof Error && fetchError.message.toLowerCase().includes('transcript'))
    ) {
      throw new TranscriptNotAvailableError(videoId);
    }
    throw fetchError;
  }

  if (!transcriptItems || transcriptItems.length === 0) {
    throw new TranscriptNotAvailableError(videoId);
  }

  const formattedTranscriptText = transcriptItems
    .map((item) => `${formatSecondsAsTimestamp(item.offset / 1000)} ${item.text.trim()}`)
    .join('\n');

  console.log(
    `[fetchTranscript] Got ${transcriptItems.length} transcript entries for video: ${videoId}`,
  );

  return formattedTranscriptText;
}
