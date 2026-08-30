// ===== MAYA AI - MASTER TYPES =====

// === CONTEXT & SENSES ===
export interface MayaContext {
  time: TimeContext;
  device: DeviceContext;
  user: UserContext;
  location: LocationContext | null;
}

export interface TimeContext {
  hour: number;
  minute: number;
  day: string;
  date: number;
  month: number;
  year: number;
  isMorning: boolean;
  isAfternoon: boolean;
  isEvening: boolean;
  isNight: boolean;
  isWeekend: boolean;
}

export interface DeviceContext {
  batteryLevel: number;
  isCharging: boolean;
  networkType: "wifi" | "cellular" | "none";
  isOnline: boolean;
  screenWidth: number;
  screenHeight: number;
  platform: string;
}

export interface UserContext {
  name: string;
  language: "en" | "hi" | "ur" | "mixed";
  mood: MoodType;
  lastActive: number;
  todayMessageCount: number;
  favoriteActions: string[];
}

export interface LocationContext {
  latitude: number;
  longitude: number;
  city: string;
  country: string;
}

export type MoodType =
  | "neutral"
  | "happy"
  | "sad"
  | "angry"
  | "excited"
  | "bored"
  | "tired"
  | "curious";

// === ROUTINES ===
export interface Routine {
  id: string;
  name: string;
  trigger: RoutineTrigger;
  steps: RoutineStep[];
  enabled: boolean;
  createdAt: number;
  lastRun: number | null;
  runCount: number;
}

export type RoutineTrigger =
  | { type: "time"; hour: number; minute: number; days: string[] }
  | { type: "command"; phrase: string }
  | { type: "greeting" }
  | { type: "location"; enter?: string; exit?: string }
  | { type: "manual" };

export interface RoutineStep {
  action: string;
  params: Record<string, string>;
  delay?: number; // ms before next step
}

// === SUGGESTIONS ===
export interface Suggestion {
  id: string;
  type: SuggestionType;
  title: string;
  description: string;
  action: string;
  priority: "low" | "medium" | "high" | "urgent";
  icon: string;
  dismissible: boolean;
  timestamp: number;
}

export type SuggestionType =
  | "proactive"
  | "smart-reply"
  | "routine"
  | "health"
  | "schedule"
  | "social"
  | "device"
  | "entertainment"
  | "weather"
  | "travel";

// === CHAT ENHANCED ===
export interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: number;
  isVoice?: boolean;
  sentiment?: SentimentResult;
  intent?: string;
  language?: string;
  metadata?: Record<string, unknown>;
}

export interface SentimentResult {
  score: number; // -1 to 1
  mood: MoodType;
  confidence: number;
}

// === STATS ===
export interface DailyStats {
  date: string;
  messageCount: number;
  automationCount: number;
  topActions: { action: string; count: number }[];
  sessionDuration: number;
  languagesUsed: string[];
}

// === PERSONALITY ===
export type PersonalityMode =
  | "professional"
  | "friendly"
  | "witty"
  | "caring"
  | "energetic"
  | "chill";

export interface MayaPersonality {
  mode: PersonalityMode;
  nickname: string; // What Maya calls the user
  catchphrase: string; // Daily catchphrase
  responseLength: "short" | "medium" | "detailed";
}
