// ===== SMART CONTEXT ENGINE =====
// Gathers real-time context about device, time, user for intelligent responses

import type {
  MayaContext,
  TimeContext,
  DeviceContext,
  UserContext,
  MoodType,
} from "./types";

// ===== TIME CONTEXT =====
export function getTimeContext(): TimeContext {
  const now = new Date();
  const hour = now.getHours();
  return {
    hour,
    minute: now.getMinutes(),
    day: now.toLocaleDateString("en-US", { weekday: "long" }),
    date: now.getDate(),
    month: now.getMonth() + 1,
    year: now.getFullYear(),
    isMorning: hour >= 5 && hour < 12,
    isAfternoon: hour >= 12 && hour < 17,
    isEvening: hour >= 17 && hour < 21,
    isNight: hour >= 21 || hour < 5,
    isWeekend: now.getDay() === 0 || now.getDay() === 6,
  };
}

// ===== DEVICE CONTEXT =====
export async function getDeviceContext(): Promise<DeviceContext> {
  const navigator = window.navigator;
  let batteryLevel = -1;
  let isCharging = false;

  try {
    const battery = await (navigator as any).getBattery?.();
    if (battery) {
      batteryLevel = Math.round(battery.level * 100);
      isCharging = battery.charging;
    }
  } catch { /* ignore */ }

  return {
    batteryLevel,
    isCharging,
    networkType: navigator.onLine
      ? ((navigator as any).connection?.type === "wifi" ? "wifi" : "cellular")
      : "none",
    isOnline: navigator.onLine,
    screenWidth: window.innerWidth,
    screenHeight: window.innerHeight,
    platform: navigator.platform,
  };
}

// ===== USER CONTEXT =====
export function getUserContext(): UserContext {
  try {
    const stored = localStorage.getItem("maya_user_context");
    if (stored) {
      const parsed = JSON.parse(stored);
      return {
        ...parsed,
        lastActive: Date.now(),
        todayMessageCount: isToday(parsed.lastActive)
          ? parsed.todayMessageCount + 1
          : 0,
      };
    }
  } catch { /* ignore */ }

  return {
    name: "Boss",
    language: "mixed",
    mood: "neutral",
    lastActive: Date.now(),
    todayMessageCount: 0,
    favoriteActions: [],
  };
}

export function saveUserContext(ctx: UserContext) {
  try {
    localStorage.setItem("maya_user_context", JSON.stringify(ctx));
  } catch { /* ignore */ }
}

export function updateUserName(name: string) {
  const ctx = getUserContext();
  ctx.name = name;
  saveUserContext(ctx);
}

export function updateUserMood(mood: MoodType) {
  const ctx = getUserContext();
  ctx.mood = mood;
  saveUserContext(ctx);
}

export function trackFavoriteAction(action: string) {
  const ctx = getUserContext();
  const existing = ctx.favoriteActions.find((a) => a === action);
  if (!existing) {
    ctx.favoriteActions.push(action);
    if (ctx.favoriteActions.length > 10) ctx.favoriteActions.shift();
  }
  saveUserContext(ctx);
}

// ===== MOOD DETECTION (Local, no API) =====
const MOOD_KEYWORDS: Record<MoodType, string[]> = {
  happy: ["happy", "great", "awesome", "amazing", "love", "best", "yay", "haha", "lol", "nice", "accha", "badhiya", "mast", "maza"],
  sad: ["sad", "upset", "depressed", "lonely", "miss", "cry", "hate", "worst", "bura", "udaas", "dukh"],
  angry: ["angry", "frustrated", "annoying", "stupid", "hate", "irritate", "gussa", "bakwas", "pagal"],
  excited: ["excited", "wow", "cant wait", "omg", "insane", "fire", "let's go", "chalo", "bhai", "hype"],
  bored: ["bored", "boring", "nothing", "meh", "whatever", "bore", "timepass"],
  tired: ["tired", "sleepy", "exhausted", "sleep", "rest", "thak", "neend", "so jaun"],
  curious: ["how", "what", "why", "when", "where", "tell me", "explain", "kya", "kaise", "kyun"],
  neutral: [],
};

export function detectMood(text: string): MoodType {
  const lower = text.toLowerCase();
  let bestMood: MoodType = "neutral";
  let bestScore = 0;

  for (const [mood, keywords] of Object.entries(MOOD_KEYWORDS)) {
    if (mood === "neutral") continue;
    let score = 0;
    for (const kw of keywords) {
      if (lower.includes(kw)) score++;
    }
    if (score > bestScore) {
      bestScore = score;
      bestMood = mood as MoodType;
    }
  }

  return bestMood;
}

// ===== FULL CONTEXT BUILDER =====
export async function buildContext(): Promise<MayaContext> {
  const [device, user] = await Promise.all([getDeviceContext(), getUserContext()]);
  return {
    time: getTimeContext(),
    device,
    user,
    location: null, // GPS requires user permission
  };
}

// ===== HELPER: Is it today? =====
function isToday(timestamp: number): boolean {
  const d = new Date(timestamp);
  const now = new Date();
  return (
    d.getDate() === now.getDate() &&
    d.getMonth() === now.getMonth() &&
    d.getFullYear() === now.getFullYear()
  );
}

// ===== GREETING GENERATOR =====
export function getSmartGreeting(ctx: MayaContext): string {
  const { time, device, user } = ctx;
  const name = user.name || "Boss";

  // Time-based greeting
  let greeting = "";
  if (time.isMorning) greeting = "Good morning";
  else if (time.isAfternoon) greeting = "Good afternoon";
  else if (time.isEvening) greeting = "Good evening";
  else greeting = "Hey night owl";

  // Battery warning
  let batteryNote = "";
  if (device.batteryLevel > 0 && device.batteryLevel < 20 && !device.isCharging) {
    batteryNote = ` ⚠️ Battery sirf ${device.batteryLevel}% hai, charger lagao.`;
  }

  // Weekend note
  const weekendNote = time.isWeekend ? " Enjoy your weekend!" : "";

  return `${greeting}, ${name}!${weekendNote}${batteryNote} Main Maya hoon, tumhari AI assistant. Bolo kya karna hai?`;
}
