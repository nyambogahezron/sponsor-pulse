import type { Runtime } from 'webextension-polyfill';
import {
  DEFAULT_GAMIFICATION_STATS,
  DEFAULT_GLOBAL_SETTINGS,
  DEFAULT_USER_PREFERENCES,
} from '../types/storage';
import type {
  FetchSponsorsMessage,
  FetchSponsorsResponse,
  ServerSponsorSegment,
  SponsorSegment,
} from '../types/types';
import { runtime, storage, tabs } from '../utils/browserApi';

const LOG_PREFIX = '[SponsorPulse:BG]';
const SERVER_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1/analyze';

runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    void storage.local
      .set({
        userPreferences: DEFAULT_USER_PREFERENCES,
        creatorWhitelist: [],
        gamificationStats: DEFAULT_GAMIFICATION_STATS,
        ...DEFAULT_GLOBAL_SETTINGS,
      })
      .then(() => {
        console.log(LOG_PREFIX, 'Default storage schema initialized.');
        void tabs.create({ url: runtime.getURL('index.html') });
      });
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

runtime.onMessage.addListener(
  (message: unknown, _sender: Runtime.MessageSender): Promise<FetchSponsorsResponse> => {
    const typedMessage = message as FetchSponsorsMessage;
    if (typedMessage.action !== 'FETCH_SPONSORS') {
      return Promise.resolve({ segments: [] });
    }

    return (async (): Promise<FetchSponsorsResponse> => {
      console.log(LOG_PREFIX, `Fetching sponsors for videoId: ${typedMessage.videoId}`);

      try {
        const result = await storage.local.get(['aiProvider']);
        const provider = (result.aiProvider as string) || 'gemini';

        const res = await fetch(SERVER_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ videoId: typedMessage.videoId, provider }),
        });

        if (!res.ok) {
          const errBody = (await res.json()) as { error: string; code: string };
          console.warn(LOG_PREFIX, `Server error ${res.status}:`, errBody);
          return { error: errBody };
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

        return { segments: data.segments };
      } catch (err) {
        const errMessage = err instanceof Error ? err.message : String(err);
        console.error(LOG_PREFIX, 'Server unreachable:', errMessage);
        return {
          error: {
            code: 'SERVER_OFFLINE',
            error: `Could not connect to server: ${errMessage}`,
          },
        };
      }
    })();
  },
);

export { mapServerSegment };
