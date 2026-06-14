import type { KeybindMap } from './keybinds';
import { DEFAULT_KEYBINDS } from './keybinds';
import type { SegmentCategory } from './types';

export type CategoryPreference = {
  autoSkip: boolean;
  buttonAlerts: boolean;
};

export type UserPreferences = Record<SegmentCategory, CategoryPreference>;

export type GamificationStats = {
  totalSecondsSaved: number;
  totalSegmentsSkipped: Record<SegmentCategory, number>;
};

export type AIProvider = 'gemini' | 'openai' | 'claude' | 'deepseek';

export type NoticeVisibilityMode = 'full' | 'mini' | 'faded';

export interface SkipProfile {
  id: string;
  name: string;
  categoryPreferences: UserPreferences;
  minSegmentDuration: number;
}

export type DismissedSegments = Record<string, string[]>;

export type CategoryColors = Partial<Record<SegmentCategory, string>>;

export interface SkipRule {
  id: string;
  enabled: boolean;
  attribute: 'category' | 'duration' | 'startTime' | 'endTime';
  operator: '==' | '!=' | '>' | '<' | '>=' | '<=' | 'contains';
  value: string | number;
  action: 'auto-skip' | 'manual' | 'mute' | 'disabled';
  label?: string;
}

export interface LocalStorageSchema {
  userPreferences: UserPreferences;
  creatorWhitelist: string[];
  gamificationStats: GamificationStats;
  aiProvider: AIProvider;
  enabled: boolean;
  showNotification: boolean;
  noticeVisibilityMode: NoticeVisibilityMode;
  showUpcomingHint: boolean;
  upcomingHintSeconds: number;
  audioNotificationOnSkip: boolean;
  minSegmentDuration: number;
  keybinds: KeybindMap;
  skipProfiles: SkipProfile[];
  channelProfileMap: Record<string, string>;
  dismissedSegments: DismissedSegments;
  categoryColors: CategoryColors;
  skipRules: SkipRule[];
}

export const DEFAULT_USER_PREFERENCES: UserPreferences = {
  sponsor: { autoSkip: true, buttonAlerts: true },
  shoutout: { autoSkip: false, buttonAlerts: true },
  course_promo: { autoSkip: true, buttonAlerts: true },
  merch: { autoSkip: true, buttonAlerts: true },
  product_sale: { autoSkip: true, buttonAlerts: true },
  event_promo: { autoSkip: false, buttonAlerts: true },
  intro_creator: { autoSkip: false, buttonAlerts: false },
  intro_external: { autoSkip: false, buttonAlerts: false },
};

export const DEFAULT_GAMIFICATION_STATS: GamificationStats = {
  totalSecondsSaved: 0,
  totalSegmentsSkipped: {
    sponsor: 0,
    shoutout: 0,
    course_promo: 0,
    merch: 0,
    product_sale: 0,
    event_promo: 0,
    intro_creator: 0,
    intro_external: 0,
  },
};

export const DEFAULT_GLOBAL_SETTINGS = {
  aiProvider: 'gemini' as AIProvider,
  enabled: true,
  showNotification: true,
  noticeVisibilityMode: 'full' as NoticeVisibilityMode,
  showUpcomingHint: true,
  upcomingHintSeconds: 5,
  audioNotificationOnSkip: false,
  minSegmentDuration: 0,
  keybinds: DEFAULT_KEYBINDS,
  skipProfiles: [] as SkipProfile[],
  channelProfileMap: {} as Record<string, string>,
  dismissedSegments: {} as DismissedSegments,
  categoryColors: {} as CategoryColors,
  skipRules: [] as SkipRule[],
};
