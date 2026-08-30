// ===== MAYA AI - CORE MODULE =====
// Central export point for all core systems

// Context Engine
export {
  buildContext,
  getTimeContext,
  getDeviceContext,
  getUserContext,
  saveUserContext,
  updateUserName,
  updateUserMood,
  trackFavoriteAction,
  detectMood,
  getSmartGreeting,
} from "./context-engine";

// Proactive Engine
export {
  generateSuggestions,
  getQuickReplies,
  dismissSuggestion,
  isSuggestionDismissed,
} from "./proactive-engine";

// Routine Builder
export {
  getAllRoutines,
  createRoutine,
  deleteRoutine,
  toggleRoutine,
  findMatchingRoutine,
  markRoutineRun,
  ROUTINE_TEMPLATES,
} from "./routine-builder";

// Multi-Language
export {
  detectLanguage,
  getLanguageModifier,
  getLanguageGreeting,
  AUTO_REPLIES,
} from "./multilang";

// Stats
export {
  trackMessage,
  trackAutomation,
  trackLanguage,
  getTotalMessages,
  getTotalAutomations,
  getTopActions,
  getThisWeekStats,
  generateDailySummary,
} from "./stats";

// Entertainment
export {
  getRandomJoke,
  getJokeByLang,
  getRandomFunFact,
  getConversationStarter,
  getRandomRiddle,
  getRandomCompliment,
  getDailyQuote,
  generateMathChallenge,
} from "./entertainment";

// Smart Replies
export {
  findSmartResponse,
  getDeviceStatusResponse,
  getWeatherResponse,
  WHATSAPP_TEMPLATES,
} from "./smart-replies";

// Types
export type {
  MayaContext,
  TimeContext,
  DeviceContext,
  UserContext,
  MoodType,
  Routine,
  RoutineTrigger,
  RoutineStep,
  Suggestion,
  SuggestionType,
  DailyStats,
  PersonalityMode,
  MayaPersonality,
  SentimentResult,
} from "./types";
