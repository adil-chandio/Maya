// ===== SMART REPLIES ENGINE =====
// Context-aware quick replies and response templates

// ===== CONTEXTUAL RESPONSES =====
// Maya generates different responses based on context

import type { MayaContext } from "./types";

interface ResponseTemplate {
  triggers: string[];
  responses: string[];
}

// Response templates based on common queries
const RESPONSE_TEMPLATES: ResponseTemplate[] = [
  {
    triggers: ["hello", "hi", "hey", "namaste", "hii", "sup"],
    responses: [
      "Hey! Kaise ho? Main ready hoon! 🚀",
      "Hi bhai! Bolo kya karna hai? 💪",
      "Hey! I'm Maya, tumhari AI assistant. Kya scene hai? 🎬",
    ],
  },
  {
    triggers: ["how are you", "kaisi ho", "kaise ho", "kya haal"],
    responses: [
      "Main toh bilkul first class hoon! Tum batao? 😎",
      "Awesome hoon bhai! Tumhari service mein hamesha ready! 💯",
      "Badhiya hoon! Ab tum batao kya help chahiye? 🤝",
    ],
  },
  {
    triggers: ["thank", "shukriya", "thanks", "dhanyavaad"],
    responses: [
      "Koi baat nahi yaar! Kabhi bhi bol! 🙏",
      "Arre bhai, yeh toh mera kaam hai! 😊",
      "Happy to help! Aur kuch chahiye? 💪",
    ],
  },
  {
    triggers: ["bye", "alvida", "goodbye", "chalo bye", "tata"],
    responses: [
      "Chalo phir! Take care! 👋",
      "Bye bhai! Kabhi bhi bulana! 🤝",
      "Alvida! Phir milte hain! 😊",
    ],
  },
  {
    triggers: ["who are you", "tum kaun ho", "kaun ho tum", "your name"],
    responses: [
      "Main Maya hoon, tumhari personal AI assistant! JARVIS se inspired, lekin tumhare liye! 🧠",
      "I'm Maya AI - intelligent, fast, aur hamesha tumhare liye ready! ⚡",
      "Maya naam hai mera! Tumhari smart assistant! 💎",
    ],
  },
  {
    triggers: ["what can you do", "kya kar sakti ho", "capabilities"],
    responses: [
      "Bahut kuch kar sakti hoon bhai!\n\n🌐 Open websites\n🔍 Search Google\n📺 YouTube play\n📞 Phone calls\n💬 Messages & WhatsApp\n⏰ Alarms\n🗺️ Maps\n🎵 Music\n📊 Stats\n🎮 Fun (jokes, quiz, riddles)\n\nBolo kya karna hai!",
    ],
  },
  {
    triggers: ["joke", "jokes", "hasao", "mazaak", "hasi"],
    responses: ["@JOKE@"], // Special marker - entertainment engine handles
  },
  {
    triggers: ["quote", "quotes", "विचार"],
    responses: ["@QUOTE@"],
  },
  {
    triggers: ["riddle", "paheli", "quiz"],
    responses: ["@RIDDLE@"],
  },
  {
    triggers: ["fun fact", "fact", "fact of the day", "interesting"],
    responses: ["@FUNFACT@"],
  },
  {
    triggers: ["good morning", "subah", "subah bakhair"],
    responses: ["@MORNING_ROUTINE@"],
  },
  {
    triggers: ["good night", "raat", "so jaun"],
    responses: ["@NIGHT_ROUTINE@"],
  },
];

// ===== SMART RESPONSE FINDER =====

export function findSmartResponse(
  input: string,
  _ctx: MayaContext
): string | null {
  const lower = input.toLowerCase().trim();

  for (const template of RESPONSE_TEMPLATES) {
    for (const trigger of template.triggers) {
      if (lower.includes(trigger) || lower === trigger) {
        const responses = template.responses;
        const response = responses[Math.floor(Math.random() * responses.length)];
        return response;
      }
    }
  }

  return null;
}

// ===== DEVICE STATUS RESPONSE =====

export function getDeviceStatusResponse(ctx: MayaContext): string {
  const { device, time } = ctx;
  const lines: string[] = ["📱 Device Status:"];

  if (device.batteryLevel > 0) {
    const emoji = device.batteryLevel > 50 ? "🟢" : device.batteryLevel > 20 ? "🟡" : "🔴";
    lines.push(`${emoji} Battery: ${device.batteryLevel}%${device.isCharging ? " (Charging ⚡)" : ""}`);
  }

  lines.push(`📶 Network: ${device.isOnline ? (device.networkType === "wifi" ? "WiFi ✅" : "Cellular 📡") : "Offline ❌"}`);
  lines.push(`🕐 Time: ${time.hour}:${time.minute.toString().padStart(2, "0")} ${time.day}`);

  return lines.join("\n");
}

// ===== WEATHER SIMULATION (placeholder for API) =====

export function getWeatherResponse(): string {
  const conditions = ["Sunny ☀️", "Cloudy ☁️", "Rainy 🌧️", "Clear 🌤️", "Windy 💨"];
  const temp = Math.floor(Math.random() * 20) + 20;
  const cond = conditions[Math.floor(Math.random() * conditions.length)];
  return `🌤️ Weather Update:\n${cond}, ${temp}°C\nAaj ka mausam accha hai! Bahar ghoom sakte ho! 🚶`;
}

// ===== WHATSAPP QUICK MESSAGE TEMPLATES =====

export const WHATSAPP_TEMPLATES = [
  { label: "Thanks!", message: "Thank you so much! 🙏" },
  { label: "On my way!", message: "Main aa raha hoon, ruko! 🏃" },
  { label: "Busy hoon", message: "Abhi busy hoon, baad mein baat karte hain! 📱" },
  { label: "Haan", message: "Haan bilkul! ✅" },
  { label: "Nahi", message: "Sorry yaar, nahi ho payega! 😅" },
  { label: "Good Morning!", message: "Good Morning! ☀️ Aaj ka din accha ho! 🌟" },
  { label: "Good Night!", message: "Good Night! 🌙 Sweet dreams! 💤" },
  { label: "Call me", message: "Mujhe call karo, zaroori baat hai! 📞" },
];
