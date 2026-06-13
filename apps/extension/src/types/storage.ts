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

/** Notice display style when a segment is detected or auto-skipped */
export type NoticeVisibilityMode = 'full' | 'mini' | 'faded';

/** Per-channel skip profile */
export interface SkipProfile {
  id: string;
  name: string;
  categoryPreferences: UserPreferences;
  minSegmentDuration: number;
}

/** Stored dismissed segment — keyed by videoId */
export type DismissedSegments = Record<string, string[]>; // videoId → segment fingerprints

/** User-defined category color overrides (CSS hex) */
export type CategoryColors = Partial<Record<SegmentCategory, string>>;

/** A single structured skip rule */
export interface SkipRule {
  id: string;
  enabled: boolean;
  /** The attribute to test */
  attribute: 'category' | 'duration' | 'startTime' | 'endTime';
  /** Comparison operator */
  operator: '==' | '!=' | '>' | '<' | '>=' | '<=' | 'contains';
  /** Value to compare against */
  value: string | number;
  /** Action to take if rule matches */
  action: 'auto-skip' | 'manual' | 'mute' | 'disabled';
  /** Optional label */
  label?: string;
}

export interface LocalStorageSchema {
  // Core
  userPreferences: UserPreferences;
  creatorWhitelist: string[];
  gamificationStats: GamificationStats;
  aiProvider: AIProvider;
  enabled: boolean;

  // Notifications & UX
  showNotification: boolean;
  noticeVisibilityMode: NoticeVisibilityMode;
  showUpcomingHint: boolean;
  upcomingHintSeconds: number;
  audioNotificationOnSkip: boolean;

  // Segment filtering
  minSegmentDuration: number;

  // Keybinds
  keybinds: KeybindMap;

  // Skip profiles
  skipProfiles: SkipProfile[];
  channelProfileMap: Record<string, string>; // channelId → profileId

  // Dismissed (wrong) segments
  dismissedSegments: DismissedSegments;

  // Color customisation
  categoryColors: CategoryColors;

  // Advanced skip rules
  skipRules: SkipRule[];
}

// Defaults

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
