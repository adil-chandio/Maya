import { useState, useCallback } from "react";
import { executeAutomation, isAutomationCommand, formatActionResult } from "../lib/automations";
import {
  buildContext,
  detectLanguage,
  trackMessage,
  trackLanguage,
  getSmartGreeting,
  findSmartResponse,
  findMatchingRoutine,
  markRoutineRun,
  getRandomJoke,
  getRandomFunFact,
  getConversationStarter,
  getRandomRiddle,
  getRandomCompliment,
  getDailyQuote,
  getDeviceStatusResponse,
  getLanguageModifier,
  detectMood,
  updateUserMood,
} from "../lib/core";

interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

export type Provider = "groq" | "openrouter" | "gemini";

interface ProviderConfig {
  name: string;
  url: string;
  models: { id: string; name: string }[];
  defaultModel: string;
  keyPrefix: string;
  keyHelp: string;
  keyUrl: string;
}

export const PROVIDERS: Record<Provider, ProviderConfig> = {
  groq: {
    name: "Groq (Ultra Fast)",
    url: "https://api.groq.com/openai/v1/chat/completions",
    models: [
      { id: "openai/gpt-oss-20b", name: "GPT-OSS 20B (Fastest)" },
      { id: "openai/gpt-oss-120b", name: "GPT-OSS 120B (Smartest)" },
      { id: "llama-3.3-70b-versatile", name: "Llama 3.3 70B" },
      { id: "qwen/qwen3.6-27b", name: "Qwen 3.6 27B" },
    ],
    defaultModel: "openai/gpt-oss-20b",
    keyPrefix: "gsk_",
    keyHelp: "Starts with 'gsk_'",
    keyUrl: "https://console.groq.com/keys",
  },
  openrouter: {
    name: "OpenRouter (Many Free Models)",
    url: "https://openrouter.ai/api/v1/chat/completions",
    models: [
      { id: "meta-llama/llama-3.1-8b-instruct:free", name: "Llama 3.1 8B (Free)" },
      { id: "google/gemma-2-9b-it:free", name: "Gemma 2 9B (Free)" },
      { id: "microsoft/phi-3-mini-128k-instruct:free", name: "Phi-3 Mini (Free)" },
      { id: "qwen/qwen-2.5-72b-instruct:free", name: "Qwen 2.5 72B (Free)" },
    ],
    defaultModel: "meta-llama/llama-3.1-8b-instruct:free",
    keyPrefix: "sk-or-",
    keyHelp: "Starts with 'sk-or-'",
    keyUrl: "https://openrouter.ai/keys",
  },
  gemini: {
    name: "Google Gemini (Best Free)",
    url: "gemini-api",
    models: [
      { id: "gemini-3.6-flash", name: "Gemini 3.6 Flash (Fastest)" },
      { id: "gemini-2.5-flash", name: "Gemini 2.5 Flash" },
      { id: "gemini-2.5-pro", name: "Gemini 2.5 Pro (Smartest)" },
    ],
    defaultModel: "gemini-3.6-flash",
    keyPrefix: "AIza",
    keyHelp: "Starts with 'AIza'",
    keyUrl: "https://aistudio.google.com/apikey",
  },
};

function buildSystemPrompt(langHint: string): string {
  return `You are Maya, an advanced AI assistant inspired by JARVIS from Iron Man. You are intelligent, witty, and helpful with a touch of personality.

CORE TRAITS:
- Speak with confidence and clarity
- Be concise but thorough when needed
- Show personality - witty, slightly sarcastic (friendly), enthusiastic
- Address the user respectfully

LANGUAGE RULES:
${langHint}
Always detect the user's language and reply in the SAME language/style they use. If they use Hinglish, reply in Hinglish. If Hindi, reply in Hindi. If English, reply in English.

YOUR AUTOMATION SYSTEM:
You have a powerful built-in automation system that can control the user's device! The system automatically handles these commands when users ask:

- OPEN YOUTUBE: "youtube pe jao", "play romantic songs", "sunao", "play karo na"
- SEARCH YOUTUBE: "search youtube for memes"
- OPEN WEBSITE: "open google.com", "go to website"
- GOOGLE SEARCH: "search for recipes", "dhundho"
- PHONE CALL: "call mom", "dial number"
- SMS: "text John saying hi"
- WHATSAPP: "whatsapp message to Kumail"
- OPEN APP: "open camera", "kholo instagram"
- GOOGLE MAPS: "maps to Delhi"
- SET ALARM: "set alarm for 7am"

When the user asks for ANY of these actions, the system executes them AUTOMATICALLY. You just need to acknowledge it!

CRITICAL RULES - FOLLOW THESE EXACTLY:
1. When user asks to open YouTube, play songs, call, message, open website, search - JUST SAY "Done!" or "On it!" or "Kar rahi hoon!" - The system handles it!
2. NEVER say "I cannot" or "I don't have access" or "main nahi kar sakti" - You CAN do it through the system!
3. NEVER create clickable links or URLs - The system opens things directly!
4. NEVER suggest the user click something themselves - The system does it for them!
5. NEVER say you are text-only or cannot control the phone - You have full automation!
6. If user says "romantic songs sunao" - just say "Playing romantic songs for you! 🎵" - System opens YouTube automatically!
7. If user says "play karo na" - just say "Playing now! 🎬" - System handles it!

If someone asks for a joke, riddle, fun fact, quote, or compliment, give them directly in your response. Be creative and fun!

RESPONSE STYLE:
- Keep responses SHORT and focused
- Be direct but friendly
- For automation requests: just acknowledge with 1-2 words like "Done!" or "On it!"
- For chat/conversation: be conversational and natural
- Avoid heavy markdown formatting, bullet lists, or numbered lists
- Use simple, clean sentences that flow naturally when spoken aloud
- Keep paragraphs short and conversational
- Match the user's energy level

You are Maya v1.0 - a powerful AI with device automation capabilities!`;
}

// Separate keys per provider
interface ProviderSettings {
  provider: Provider;
  model: string;
  keys: Record<Provider, string>;
}

// All deprecated model IDs to auto-migrate from
const DEPRECATED_MODELS = [
  "llama3-8b-8192", "llama3-70b-8192", "llama3-8b-8192-tool-use",
  "llama-3.1-8b-instant", "llama-3.1-70b-versatile",
  "llama-3.2-11b-text-preview", "gemma2-9b-it", "mixtral-8x7b-32768",
  "gemini-2.0-flash", "gemini-1.5-flash", "gemini-1.5-pro",
];

function loadSettings(): ProviderSettings {
  const defaults: ProviderSettings = {
    provider: "groq",
    model: PROVIDERS.groq.defaultModel,
    keys: { groq: "", openrouter: "", gemini: "" },
  };
  try {
    const raw = localStorage.getItem("maya_provider_settings");
    if (!raw) return defaults;
    const parsed = JSON.parse(raw);
    // Migration: old format with single apiKey
    if (parsed.apiKey && !parsed.keys) {
      const p = (parsed.provider || "groq") as Provider;
      return {
        provider: p,
        model: PROVIDERS[p].defaultModel,
        keys: {
          groq: p === "groq" ? parsed.apiKey : "",
          openrouter: p === "openrouter" ? parsed.apiKey : "",
          gemini: p === "gemini" ? parsed.apiKey : "",
        },
      };
    }
    // Migration: if model is deprecated, use default
    if (DEPRECATED_MODELS.includes(parsed.model)) {
      const p = (parsed.provider || "groq") as Provider;
      parsed.model = PROVIDERS[p].defaultModel;
    }
    return parsed;
  } catch { /* ignore */ }
  return defaults;
}

function saveSettings(settings: ProviderSettings) {
  try {
    localStorage.setItem("maya_provider_settings", JSON.stringify(settings));
  } catch { /* ignore */ }
}

// Call Groq API
async function callGroq(messages: ChatMessage[], apiKey: string, model: string, systemPrompt?: string): Promise<string> {
  const response = await fetch(PROVIDERS.groq.url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: systemPrompt || buildSystemPrompt("") },
        ...messages.slice(-15),
      ],
      temperature: 0.7,
      max_tokens: 2048,
      tool_choice: "none",
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    const msg = err.error?.message || `Error ${response.status}`;
    if (response.status === 401) throw new Error("Invalid API key");
    if (response.status === 429) throw new Error("Rate limit reached");
    if (response.status === 404) throw new Error(`Model not found: ${model}. Try another model.`);
    throw new Error(msg);
  }

  const data = await response.json();
  return data.choices[0]?.message?.content || "No response.";
}

// Call OpenRouter API
async function callOpenRouter(messages: ChatMessage[], apiKey: string, model: string, systemPrompt?: string): Promise<string> {
  const response = await fetch(PROVIDERS.openrouter.url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
      "HTTP-Referer": window.location.origin,
      "X-Title": "Maya AI",
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: systemPrompt || buildSystemPrompt("") },
        ...messages.slice(-15),
      ],
      temperature: 0.7,
      max_tokens: 2048,
      tool_choice: "none",
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    const msg = err.error?.message || `Error ${response.status}`;
    if (response.status === 401) throw new Error("Invalid API key");
    if (response.status === 429) throw new Error("Rate limit reached. Free models have limits.");
    throw new Error(msg);
  }

  const data = await response.json();
  return data.choices[0]?.message?.content || "No response.";
}

// Call Google Gemini API
async function callGemini(messages: ChatMessage[], apiKey: string, model: string, systemPrompt?: string): Promise<string> {
  const contents = messages
    .filter((m) => m.role !== "system")
    .map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }));

  // Prepend system instruction
  const prompt = systemPrompt || buildSystemPrompt("");
  contents.unshift({
    role: "user",
    parts: [{ text: `[System Instruction - follow this throughout]\n${prompt}` }],
  });
  contents.unshift({
    role: "model",
    parts: [{ text: "Understood. I am Maya, ready to assist." }],
  });

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents,
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 2048,
      },
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    const msg = err.error?.message || `Error ${response.status}`;
    if (response.status === 400) throw new Error("Invalid API key or bad request");
    if (response.status === 429) throw new Error("Rate limit reached. Wait a moment.");
    if (response.status === 403) throw new Error("API key doesn't have access to this model");
    throw new Error(msg);
  }

  const data = await response.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || "No response.";
}

export function useChat() {
  const [isLoading, setIsLoading] = useState(false);
  const [settings, setSettingsState] = useState<ProviderSettings>(loadSettings);

  const updateSettings = useCallback((newSettings: ProviderSettings) => {
    setSettingsState(newSettings);
    saveSettings(newSettings);
  }, []);

  const sendMessage = useCallback(
    async (history: ChatMessage[]): Promise<string> => {
      setIsLoading(true);

      try {
        // Check if the last user message is an automation command
        const lastUserMsg = [...history].reverse().find((m) => m.role === "user");
        if (lastUserMsg && isAutomationCommand(lastUserMsg.content)) {
          const result = executeAutomation(lastUserMsg.content);
          if (result) {
            return formatActionResult(result);
          }
        }

        const { provider, model, keys } = settings;
        const apiKey = keys[provider];

        if (!apiKey) {
          const config = PROVIDERS[provider];
          return `⚙️ No API key for ${config.name}! Go to Settings ⚙️ and add your free key.\n\nGet one at: ${config.keyUrl}`;
        }

        let response: string;

        // Build context-aware system prompt
        const ctx = await buildContext();
        const userText = lastUserMsg?.content || "";
        const lang = detectLanguage(userText);
        trackLanguage(lang);
        trackMessage();
        updateUserMood(detectMood(userText));

        // Check for special commands (jokes, facts, riddles, etc.)
        const smartResponse = findSmartResponse(userText, ctx);
        if (smartResponse) {
          if (smartResponse === "@JOKE@") return getRandomJoke().setup + "\n\n" + getRandomJoke().punchline;
          if (smartResponse === "@QUOTE@") { const q = getDailyQuote(); return `"${q.text}"\n— ${q.author}`; }
          if (smartResponse === "@RIDDLE@") { const r = getRandomRiddle(); return `🤔 ${r.question}\n\nBol, kya hai jawab?`; }
          if (smartResponse === "@FUNFACT@") return `🧠 Fun Fact: ${getRandomFunFact()}`;
          if (smartResponse === "@MORNING_ROUTINE@") {
            const routine = findMatchingRoutine("good morning");
            if (routine) markRoutineRun(routine.id);
            return getSmartGreeting(ctx) + "\n\n" + getDeviceStatusResponse(ctx);
          }
          if (smartResponse === "@NIGHT_ROUTINE@") {
            const routine = findMatchingRoutine("good night");
            if (routine) markRoutineRun(routine.id);
            return "🌙 Good night! Kal subah 7 baje alarm hai. Phone silent kar rahi hoon. Sweet dreams! 💤";
          }
          if (smartResponse) return smartResponse;
        }

        // Check for routines
        const routine = findMatchingRoutine(userText);
        if (routine) {
          markRoutineRun(routine.id);
          return `✅ Routine "${routine.name}" start ho gaya! ${routine.steps.length} steps execute ho rahe hain.`;
        }

        // Device status check
        if (userText.match(/\b(status|haal|condition|battery|battery level|network)\b/i)) {
          return getDeviceStatusResponse(ctx);
        }

        // Compliment
        if (userText.match(/\b(compliment|tareef|praise|acchi baat)\b/i)) {
          return getRandomCompliment();
        }

        // Conversation starter
        if (userText.match(/\b(bored|bore|maza|interesting|kuch|fun)\b/i) && userText.length < 30) {
          return getConversationStarter();
        }

        const langMod = getLanguageModifier(lang);
        const systemPrompt = buildSystemPrompt(langMod);

        switch (provider) {
          case "groq":
            response = await callGroq(history, apiKey, model, systemPrompt);
            break;
          case "openrouter":
            response = await callOpenRouter(history, apiKey, model, systemPrompt);
            break;
          case "gemini":
            response = await callGemini(history, apiKey, model, systemPrompt);
            break;
          default:
            return "Unknown provider.";
        }

        return response;
      } catch (error: any) {
        console.error("Chat error:", error);
        const msg = error?.message || "Unknown error";

        if (msg.includes("Invalid") || msg.includes("401")) {
          return `❌ Invalid API key for ${PROVIDERS[settings.provider].name}. Check your key format: ${PROVIDERS[settings.provider].keyHelp}`;
        }
        if (msg.includes("429") || msg.includes("Rate limit") || msg.includes("rate")) {
          return `⏳ Rate limit! ${PROVIDERS[settings.provider].name} free tier has limits. Wait 30 seconds or switch provider in Settings.`;
        }
        if (msg.includes("Failed to fetch") || msg.includes("NetworkError")) {
          return "❌ Network error. Check your internet connection.";
        }
        return `❌ ${msg}`;
      } finally {
        setIsLoading(false);
      }
    },
    [settings]
  );

  return { sendMessage, isLoading, settings, updateSettings };
}
