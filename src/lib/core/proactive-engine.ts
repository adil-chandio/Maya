// ===== PROACTIVE AI ENGINE =====
// Generates smart suggestions based on context, time, user behavior

import type { MayaContext, Suggestion } from "./types";

// ===== SUGGESTION GENERATOR =====

export function generateSuggestions(ctx: MayaContext): Suggestion[] {
  const suggestions: Suggestion[] = [];
  const { time, device, user } = ctx;

  // === MORNING ROUTINE ===
  if (time.isMorning && time.hour >= 6 && time.hour <= 9) {
    suggestions.push({
      id: "morning-greeting",
      type: "routine",
      title: "☀️ Good Morning Routine",
      description: "Weather, schedule, aur news sunna hai?",
      action: "good morning",
      priority: "high",
      icon: "☀️",
      dismissible: true,
      timestamp: Date.now(),
    });
  }

  // === BATTERY WARNINGS ===
  if (device.batteryLevel > 0 && device.batteryLevel <= 20 && !device.isCharging) {
    suggestions.push({
      id: "battery-low",
      type: "device",
      title: "🔋 Battery Low!",
      description: `Sirf ${device.batteryLevel}% battery hai. Charger lagao ya power save on karo.`,
      action: "volume to 30",
      priority: "urgent",
      icon: "🔋",
      dismissible: true,
      timestamp: Date.now(),
    });
  }

  // === NIGHT MODE ===
  if (time.isNight && time.hour >= 22) {
    suggestions.push({
      id: "night-mode",
      type: "health",
      title: "🌙 Good Night",
      description: "Sone ka time hai. Alarm lagau? Phone silent kar dun?",
      action: "set alarm for 7am",
      priority: "medium",
      icon: "🌙",
      dismissible: true,
      timestamp: Date.now(),
    });
  }

  // === WEEKEND SUGGESTIONS ===
  if (time.isWeekend) {
    suggestions.push({
      id: "weekend-fun",
      type: "entertainment",
      title: "🎮 Weekend Vibes!",
      description: "Kuch mast karte hain? Movies, music, ya games?",
      action: "kuch interesting suggest karo",
      priority: "low",
      icon: "🎮",
      dismissible: true,
      timestamp: Date.now(),
    });
  }

  // === LUNCH TIME ===
  if (time.hour >= 12 && time.hour <= 14) {
    suggestions.push({
      id: "lunch-time",
      type: "proactive",
      title: "🍽️ Lunch Time!",
      description: "Kuch tasty order karun? Zomato ya Swiggy?",
      action: "lunch suggest karo",
      priority: "low",
      icon: "🍽️",
      dismissible: true,
      timestamp: Date.now(),
    });
  }

  // === EVENING WRAP ===
  if (time.isEvening && time.hour === 18) {
    suggestions.push({
      id: "evening-summary",
      type: "schedule",
      title: "📊 Day Summary",
      description: "Aaj ka din kaisa raha? Kya kya kiya?",
      action: "aaj ka summary batao",
      priority: "medium",
      icon: "📊",
      dismissible: true,
      timestamp: Date.now(),
    });
  }

  // === FAVORITE ACTIONS ===
  if (user.favoriteActions.length > 0) {
    const topAction = user.favoriteActions[user.favoriteActions.length - 1];
    suggestions.push({
      id: "favorite-action",
      type: "smart-reply",
      title: `⚡ Quick: ${topAction}`,
      description: "Ye tumhara favorite action hai. Karun?",
      action: topAction,
      priority: "low",
      icon: "⚡",
      dismissible: true,
      timestamp: Date.now(),
    });
  }

  // === ONLINE STATUS ===
  if (!device.isOnline) {
    suggestions.push({
      id: "offline-mode",
      type: "device",
      title: "📡 Offline Mode",
      description: "Internet nahi hai. Offline features use kar sakte ho.",
      action: "",
      priority: "medium",
      icon: "📡",
      dismissible: true,
      timestamp: Date.now(),
    });
  }

  return suggestions.sort((a, b) => {
    const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 };
    return priorityOrder[a.priority] - priorityOrder[b.priority];
  });
}

// ===== QUICK REPLY SUGGESTIONS =====
export function getQuickReplies(lastMessage: string): string[] {
  const lower = lastMessage.toLowerCase();

  // Context-aware quick replies
  if (lower.includes("song") || lower.includes("music") || lower.includes("gaana")) {
    return ["Aur chalao", "Next song", "Favorite playlist", "Mood change karo"];
  }
  if (lower.includes("call") || lower.includes("phone")) {
    return ["Thanks!", "Doosre ko bhi call karo", "Message bhej do"];
  }
  if (lower.includes("whatsapp") || lower.includes("message")) {
    return ["Aur kuch?", "Thanks bhej do", "Voice note bhejo"];
  }
  if (lower.includes("weather") || lower.includes("mausam")) {
    return ["Umbrella lagau?", "Bahar jana hai", "Weekend ka batao"];
  }
  if (lower.includes("schedule") || lower.includes("meeting")) {
    return ["Reminder lagao", "Cancel karo", "Next meeting kya hai?"];
  }

  // Default quick replies
  return [
    "Kuch aur batao",
    "YouTube kholo",
    "Gaana lagao",
    "Thanks Maya! 🙏",
  ];
}

// ===== SMART SUGGESTION REMOVAL =====
const dismissedSuggestions = new Set<string>();

export function dismissSuggestion(id: string) {
  dismissedSuggestions.add(id);
}

export function isSuggestionDismissed(id: string): boolean {
  return dismissedSuggestions.has(id);
}
