// ===== MULTI-LANGUAGE ENGINE =====
// Detect and support Hindi, English, Hinglish, Urdu

export type Language = "en" | "hi" | "ur" | "mixed";

// Common Hindi/Hinglish words for detection
const HINDI_INDICATORS = [
  "hai", "ho", "hain", "tha", "thi", "the",
  "kya", "kaise", "kahan", "kyun", "kaun",
  "main", "mein", "mujhe", "tum", "tujhe",
  "aur", "ya", "ki", "ka", "ke", "ko",
  "yeh", "woh", "ye", "wo",
  "kar", "karo", "karna", "karna hai",
  "jao", "jana", "aao", "aana",
  "bolo", "batao", "sun", "suno",
  "bhai", "yaar", "dost",
  "accha", "theek", "chalo", "lagao",
  "dhundho", "kholo", "band", "chalu",
  "hoga", "hai", "tha", "raha", "rahi",
  "nahi", "na", "mat", "phir",
  "abhi", "kal", "aaj", "tab",
  "bahut", "thoda", "zyada", "kam",
  "ek", "do", "tin", "char",
  "pehle", "baad", "uske", "iske",
  "kuch", "sab", "koi", "har",
  "kaunsa", "kaisa", "kaisi",
  "chahiye", "mila", "mil",
  "samajh", "pata", "malum",
  "bol", "bolna", "kehna",
  "gaana", "song", "music",
  "phone", "message", "call",
  "photo", "camera", "video",
];

const URDU_INDICATORS = [
  "aap", "ji", "shukriya", "mehrbani",
  "inshallah", "mashaallah", "alhamdulillah",
  "bhaijaan", "begum", "sahab",
];

// ===== LANGUAGE DETECTION =====

export function detectLanguage(text: string): Language {
  const words = text.toLowerCase().split(/\s+/);
  let hindiCount = 0;
  let urduCount = 0;
  let englishCount = 0;

  for (const word of words) {
    if (HINDI_INDICATORS.includes(word)) hindiCount++;
    if (URDU_INDICATORS.includes(word)) urduCount++;
    if (/^[a-z]+$/.test(word) && word.length > 2) englishCount++;
  }

  if (urduCount > 2) return "ur";
  if (hindiCount >= 3) return "hi";
  if (hindiCount >= 1 && englishCount >= 1) return "mixed";
  if (hindiCount >= 1) return "hi";
  return "en";
}

// ===== SMART REPLIES (Auto-suggest in user's language) =====

export const AUTO_REPLIES: Record<Language, Record<string, string[]>> = {
  en: {
    greeting: ["Hey! How can I help?", "What's up!", "Ready to help!"],
    thanks: ["You're welcome!", "Anytime!", "Happy to help!"],
    bye: ["See you later!", "Take care!", "Bye bye!"],
    help: ["Sure, what do you need?", "Tell me, I'm listening!", "Ask away!"],
  },
  hi: {
    greeting: ["Namaste! Kya help chahiye?", "Haan bolo, sun rahi hoon!", "Ready hoon!"],
    thanks: ["Koi baat nahi!", "Arre yaar, kabhi bhi!", "Khushi hui!"],
    bye: ["Alvida! Take care!", "Chalo phir, baad mein baat karte hain!", "Bye!"],
    help: ["Bilkul, batao kya chahiye?", "Haan haan, bol!", "Puchho!"],
  },
  mixed: {
    greeting: ["Hey! Kya scene hai?", "Haan bolo, kya help chahiye?", "Bolo bhai!"],
    thanks: ["Koi baat nahi yaar!", "Anytime bhai!", "No problem!"],
    bye: ["Chalo phir, take care!", "Bye bhai!", "Milte hain!"],
    help: ["Bilkul, batao!", "Haan sun raha hoon!", "Bol!"],
  },
  ur: {
    greeting: ["Assalamualaikum! Kya baat hai?", "Ji haan, bataiye!", "Sunn raha hoon!"],
    thanks: ["Koi baat nahi ji!", "JazakAllah!", "Bilkul!"],
    bye: ["Allah hafiz! Take care!", "Phir milte hain!", "Khuda hafiz!"],
    help: ["Bilkul bataiye!", "Ji haan, poochiye!", "Meherbani!"],
  },
};

// ===== SMART RESPONSE MODIFIER =====
// Adjust Maya's response tone based on user's language

export function getLanguageModifier(lang: Language): string {
  switch (lang) {
    case "hi":
      return "Reply in Hindi (Devanagari script not needed, use Roman Hindi). Mix a few English words naturally.";
    case "ur":
      return "Reply in Roman Urdu, warm and respectful tone. Use 'aap' and 'ji'.";
    case "mixed":
      return "Reply in Hinglish - a natural mix of Hindi and English, like how Indian friends talk.";
    case "en":
    default:
      return "Reply in casual English.";
  }
}

// ===== GREETING GENERATOR =====

export function getLanguageGreeting(lang: Language, hour: number): string {
  const timeGreeting =
    hour >= 5 && hour < 12 ? "Good Morning" :
    hour >= 12 && hour < 17 ? "Good Afternoon" :
    hour >= 17 && hour < 21 ? "Good Evening" :
    "Good Night";

  switch (lang) {
    case "hi":
      return hour >= 5 && hour < 12 ? "Subah bakhair" :
             hour >= 17 && hour < 21 ? "Shaam bakhair" :
             "Namaste";
    case "ur":
      return hour >= 5 && hour < 12 ? "Subah bakhair" :
             hour >= 17 && hour < 21 ? "Shaam bakhair" :
             "Assalamualaikum";
    case "mixed":
      return `${timeGreeting} bhai!`;
    default:
      return `${timeGreeting}!`;
  }
}
