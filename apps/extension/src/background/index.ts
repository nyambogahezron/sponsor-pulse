import { DEFAULT_GAMIFICATION_STATS, DEFAULT_USER_PREFERENCES } from '../types/storage';
import type {
  FetchSponsorsMessage,
  FetchSponsorsResponse,
  ServerSponsorSegment,
  SponsorSegment,
} from '../types/types';

const LOG_PREFIX = '[SponsorPulse:BG]';
const SERVER_URL = 'http://localhost:3000/api/v1/analyze';

chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === chrome.runtime.OnInstalledReason.INSTALL) {
    chrome.storage.local.set(
      {
        userPreferences: DEFAULT_USER_PREFERENCES,
        creatorWhitelist: [],
        gamificationStats: DEFAULT_GAMIFICATION_STATS,
      },
      () => {
        console.log(LOG_PREFIX, 'Default storage schema initialized.');
        void chrome.tabs.create({ url: chrome.runtime.getURL('index.html') });
      },
    );
  }
});

function mapServerSegment(seg: ServerSponsorSegment): SponsorSegment {
  return {
    startTime: seg.start,
    endTime: seg.end,
    category: seg.category,
    confidence: 1.0,
    source: 'ai-server',
  };
}

chrome.runtime.onMessage.addListener(
  (
    message: FetchSponsorsMessage,
    _sender: chrome.runtime.MessageSender,
    sendResponse: (response: FetchSponsorsResponse) => void,
  ): boolean => {
    if (message.action !== 'FETCH_SPONSORS') return false;

    void (async () => {
      console.log(LOG_PREFIX, `Fetching sponsors for videoId: ${message.videoId}`);

      try {
        const encoder = new TextEncoder();
        const encodedData = encoder.encode(message.videoId);
        const hashBuffer = await crypto.subtle.digest('SHA-256', encodedData);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const hashedVideoId = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');

        const res = await fetch(SERVER_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ videoId: hashedVideoId }),
        });

        if (!res.ok) {
          const errBody = (await res.json()) as { error: string; code: string };
          console.warn(LOG_PREFIX, `Server error ${res.status}:`, errBody);
          sendResponse({ error: errBody });
          return;
        }

        const data = (await res.json()) as {
          videoId: string;
          segments: ServerSponsorSegment[];
          provider: string;
          analyzedAt: number;
        };

        console.log(
          LOG_PREFIX,
          `Analysis complete — ${data.segments.length} segment(s) via ${data.provider}.`,
        );

        sendResponse({ segments: data.segments });
      } catch (err) {
        // Network-level failure: server is offline, DNS failure, etc.
        const message = err instanceof Error ? err.message : String(err);
        console.error(LOG_PREFIX, 'Server unreachable:', message);
        sendResponse({
          error: {
            code: 'SERVER_OFFLINE',
            error: `Could not connect to server: ${message}`,
          },
        });
      }
    })();

    return true;
  },
);

export { mapServerSegment };
