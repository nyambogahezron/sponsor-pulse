import type { LocalStorageSchema, SkipProfile, UserPreferences } from '../types/storage';
import { DEFAULT_USER_PREFERENCES } from '../types/storage';

function generateId(): string {
  return `profile_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

async function getStorage(): Promise<
  Pick<LocalStorageSchema, 'skipProfiles' | 'channelProfileMap'>
> {
  return chrome.storage.local.get(['skipProfiles', 'channelProfileMap']) as Promise<
    Pick<LocalStorageSchema, 'skipProfiles' | 'channelProfileMap'>
  >;
}

export async function getAllProfiles(): Promise<SkipProfile[]> {
  const { skipProfiles = [] } = await getStorage();
  return skipProfiles;
}

export async function getProfileForChannel(channelId: string): Promise<SkipProfile | null> {
  const { skipProfiles = [], channelProfileMap = {} } = await getStorage();
  const profileId = channelProfileMap[channelId];
  if (!profileId) return null;
  return skipProfiles.find((p) => p.id === profileId) ?? null;
}

export async function createProfile(
  name: string,
  prefs: UserPreferences = DEFAULT_USER_PREFERENCES,
  minSegmentDuration = 0,
): Promise<SkipProfile> {
  const { skipProfiles = [] } = await getStorage();
  const profile: SkipProfile = {
    id: generateId(),
    name: name.trim() || 'Unnamed Profile',
    categoryPreferences: prefs,
    minSegmentDuration,
  };
  await chrome.storage.local.set({ skipProfiles: [...skipProfiles, profile] });
  return profile;
}

export async function updateProfile(
  id: string,
  patch: Partial<Omit<SkipProfile, 'id'>>,
): Promise<void> {
  const { skipProfiles = [] } = await getStorage();
  const updated = skipProfiles.map((p) => (p.id === id ? { ...p, ...patch } : p));
  await chrome.storage.local.set({ skipProfiles: updated });
}

export async function deleteProfile(id: string): Promise<void> {
  const { skipProfiles = [], channelProfileMap = {} } = await getStorage();
  const newProfiles = skipProfiles.filter((p) => p.id !== id);
  const newMap = Object.fromEntries(Object.entries(channelProfileMap).filter(([, v]) => v !== id));
  await chrome.storage.local.set({ skipProfiles: newProfiles, channelProfileMap: newMap });
}

export async function assignProfileToChannel(
  channelId: string,
  profileId: string | null,
): Promise<void> {
  const { channelProfileMap = {} } = await getStorage();
  if (profileId === null) {
    delete channelProfileMap[channelId];
  } else {
    channelProfileMap[channelId] = profileId;
  }
  await chrome.storage.local.set({ channelProfileMap });
}

export function detectChannelId(): string | null {
  const channelLink = document.querySelector<HTMLAnchorElement>(
    'ytd-channel-name a, #channel-name a, yt-formatted-string.ytd-channel-name a',
  );
  if (channelLink?.href) {
    const match = channelLink.href.match(/\/(channel|c|@)\/([^/?]+)/);
    if (match) return match[2];
  }

  try {
    const ytData = (window as unknown as Record<string, unknown>).ytInitialData;
    if (ytData && typeof ytData === 'object') {
      const str = JSON.stringify(ytData);
      const m = str.match(/"channelId":"(UC[a-zA-Z0-9_-]{22})"/);
      if (m) return m[1];
    }
  } catch {
    // ignore
  }

  return null;
}
