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

export interface LocalStorageSchema {
  userPreferences: UserPreferences;
  creatorWhitelist: string[];
  gamificationStats: GamificationStats;
  aiProvider: AIProvider;
  enabled: boolean;
  showNotification: boolean;
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
};
