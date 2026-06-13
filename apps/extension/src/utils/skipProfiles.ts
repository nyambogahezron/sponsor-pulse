import type { LocalStorageSchema, SkipProfile, UserPreferences } from '../types/storage';
import { DEFAULT_USER_PREFERENCES } from '../types/storage';

type ProfileStorageSlice = Pick<LocalStorageSchema, 'skipProfiles' | 'channelProfileMap'>;

const CHANNEL_ID_PATTERN = /\/(channel|c|@)\/([^/?]+)/;
const YOUTUBE_CHANNEL_ID_PATTERN = /"channelId":"(UC[a-zA-Z0-9_-]{22})"/;

function generateProfileId(): string {
  return `profile_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

async function readProfileStorage(): Promise<ProfileStorageSlice> {
  return chrome.storage.local.get([
    'skipProfiles',
    'channelProfileMap',
  ]) as Promise<ProfileStorageSlice>;
}

export async function getAllProfiles(): Promise<SkipProfile[]> {
  const { skipProfiles = [] } = await readProfileStorage();
  return skipProfiles;
}

export async function getProfileForChannel(channelId: string): Promise<SkipProfile | null> {
  const { skipProfiles = [], channelProfileMap = {} } = await readProfileStorage();
  const profileId = channelProfileMap[channelId];
  if (!profileId) return null;
  return skipProfiles.find((profile) => profile.id === profileId) ?? null;
}

export async function createProfile(
  name: string,
  preferences: UserPreferences = DEFAULT_USER_PREFERENCES,
  minSegmentDuration = 0,
): Promise<SkipProfile> {
  const { skipProfiles = [] } = await readProfileStorage();
  const newProfile: SkipProfile = {
    id: generateProfileId(),
    name: name.trim() || 'Unnamed Profile',
    categoryPreferences: preferences,
    minSegmentDuration,
  };
  await chrome.storage.local.set({ skipProfiles: [...skipProfiles, newProfile] });
  return newProfile;
}

export async function updateProfile(
  profileId: string,
  patch: Partial<Omit<SkipProfile, 'id'>>,
): Promise<void> {
  const { skipProfiles = [] } = await readProfileStorage();
  const updatedProfiles = skipProfiles.map((profile) =>
    profile.id === profileId ? { ...profile, ...patch } : profile,
  );
  await chrome.storage.local.set({ skipProfiles: updatedProfiles });
}

export async function deleteProfile(profileId: string): Promise<void> {
  const { skipProfiles = [], channelProfileMap = {} } = await readProfileStorage();
  const remainingProfiles = skipProfiles.filter((profile) => profile.id !== profileId);
  const updatedChannelMap = Object.fromEntries(
    Object.entries(channelProfileMap).filter(
      ([, assignedProfileId]) => assignedProfileId !== profileId,
    ),
  );
  await chrome.storage.local.set({
    skipProfiles: remainingProfiles,
    channelProfileMap: updatedChannelMap,
  });
}

export async function assignProfileToChannel(
  channelId: string,
  profileId: string | null,
): Promise<void> {
  const { channelProfileMap = {} } = await readProfileStorage();
  if (profileId === null) {
    delete channelProfileMap[channelId];
  } else {
    channelProfileMap[channelId] = profileId;
  }
  await chrome.storage.local.set({ channelProfileMap });
}

export function detectChannelId(): string | null {
  const channelLinkElement = document.querySelector<HTMLAnchorElement>(
    'ytd-channel-name a, #channel-name a, yt-formatted-string.ytd-channel-name a',
  );

  if (channelLinkElement?.href) {
    const domMatch = channelLinkElement.href.match(CHANNEL_ID_PATTERN);
    if (domMatch) return domMatch[2];
  }

  try {
    const youTubePageData = (window as unknown as Record<string, unknown>).ytInitialData;
    if (youTubePageData && typeof youTubePageData === 'object') {
      const serialized = JSON.stringify(youTubePageData);
      const dataMatch = serialized.match(YOUTUBE_CHANNEL_ID_PATTERN);
      if (dataMatch) return dataMatch[1];
    }
  } catch {
    // ytInitialData may be unavailable on some page types
  }

  return null;
}
