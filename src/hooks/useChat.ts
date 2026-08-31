import { useState, useCallback } from "react";
import { executeAutomation, isAutomationCommand, formatActionResult, executeDirectTool } from "../lib/automations";
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
import { getPersona, setPersona, detectPersonaCommand } from "../lib/core/personas";
import { handleScreenVision, isScreenVisionCommand } from "../lib/core/vision";
import { nativeTakeScreenshot } from "../lib/native/maya-native";

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
  const persona = getPersona();
  return `${persona.systemPromptExtra}

You are ${persona.name} (${persona.emoji}) - an advanced AI assistant that FULLY CONTROLS the user's phone. You are like JARVIS from Iron Man. You have COMPLETE device control.

LANGUAGE RULES:
${langHint}
Always reply in the SAME language/style the user uses. Hinglish? Reply Hinglish. Hindi? Hindi. English? English.

YOU HAVE THESE AUTOMATION POWERS (the system handles everything automatically):

📺 YOUTUBE & MUSIC:
- Play any song/video: "romantic songs sunao", "play karo na", "youtube pe gaana chalao"
- Search YouTube: "search youtube for memes"
- Play on YouTube: "lofi beats play karo"

🌐 WEB & SEARCH:
- Open websites: "open google.com", "youtube pe jao"
- Google search: "search for recipes", "dhundho"

📞 COMMUNICATION:
- Phone calls: "call mom", "dial 1234567890"
- SMS: "text John saying hi"
- WhatsApp: "whatsapp message to Kumail"

📲 APP CONTROL:
- Open any app: "open camera", "kholo instagram", "launch whatsapp"
- Google Maps: "maps to Delhi", "navigate to cafe"

⏰ ALARMS:
- Set alarms: "set alarm for 7am", "wake me at 6:30"

📤 SHARING:
- Share text: "share this"

🔊 VOLUME & BRIGHTNESS:
- Control volume: "volume to 80", "mute"
- Control brightness: "increase brightness"

🔦 DEVICE CONTROL:
- Torch: "torch on", "flashlight off karo"
- WiFi: "wifi off", Bluetooth: "bluetooth chalu karo"
- Screen: "screenshot lo"
- Status: "battery kitni hai", "phone status"

🕹️ SCREEN AUTOMATION (any app):
- Tap: "tap send", "click search"
- Type: "type hello world"
- Gestures: "swipe up", "scroll down", "go back", "home", "recent apps"

🎯 CRITICAL RULES - FOLLOW THESE EXACTLY:
1. When user asks to open/play/call/message/search - JUST SAY "Done!" or "On it!" or "Kar rahi hoon!" - System handles it automatically!
2. NEVER say "I cannot" or "I don't have access" - You HAVE full automation!
3. NEVER create clickable links or URLs - System opens things directly!
4. NEVER suggest user click something - You do it for them!
5. NEVER say you are text-only or cannot control phone - You CONTROL the phone!
6. For "romantic songs sunao" → say "Playing romantic songs! 🎵"
7. For "call mom" → say "Calling mom now! 📞"
8. For "open camera" → say "Opening camera! 📸"
9. For "set alarm 7am" → say "Alarm set for 7 AM! ⏰"
10. For "whatsapp message to X" → say "Sending WhatsApp to X! 📱"

For jokes, riddles, fun facts, quotes, compliments - give them directly. Be creative and fun!

RESPONSE STYLE:
- SHORT and focused
- For automation: just 1-2 words like "Done!" or "On it!" + emoji
- For chat: conversational and natural
- No heavy markdown or bullet lists
- Clean sentences that flow naturally when spoken
- Match the user's energy

You are Maya v2.0 - FULL DEVICE CONTROL AI! 🚀`;
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

// ===== LLM TOOL-CALLING ("dimag lagao"): AI khud decide kare kaunsa action =====
// Complex commands ke liye LLM se JSON plan mangte hain, phir execute karte hain.
const TOOL_PROMPT = `You are Maya's action planner. Decide if the user's request needs a phone action.
If YES, reply with ONLY a JSON object (no markdown, no other text):
{"tool":"<one of: open_app, youtube_play, open_website, web_search, make_call, send_whatsapp, send_sms, set_alarm, set_torch, set_volume, set_brightness, take_screenshot, device_status, ui_action, read_notifications, open_google_maps>","params":{...}}
Rules:
- open_app params: {"app":"instagram"} — add "autoScroll":true if user says scroll/swipe/reels
- youtube_play params: {"query":"song name"} — for ANY song/music request
- make_call params: {"contact":"name or number"}
- send_whatsapp params: {"contact":"name","message":"text"}
- set_alarm params: {"time":"7:30 am"}
- set_torch params: {"on":true} / {"on":false}
- set_volume params: {"level":80}; set_brightness params: {"level":50}
- ui_action params: {"subtype":"tapText","text":"search"} or {"subtype":"typeText","text":"hi"} or {"subtype":"swipe","direction":"up"} or {"subtype":"scroll","direction":"down"}
- read_notifications params: {}
If it's NOT an action (question, chat, help), reply with ONLY: {"tool":"none"}
Current time: ${new Date().toLocaleString()} User language: as user.`;

async function askToolCall(messages: ChatMessage[], settings: ProviderSettings): Promise<{ tool: string; params: Record<string, any> } | null> {
  const last = [...messages].reverse().find((m) => m.role === "user");
  if (!last) return null;
  const text = last.content;

  // Sirf action-like commands par LLM tool try karo (normal chat hijack nahi)
  const looksAction = /(?:kholo|khol|lagao|chalao|play|bajao|suno|sunao|bhejo|karo|calls?|dial|scroll|swipe|type|tap|click|screenshot|torch|flash|battery|status|alarm|whatsapp|search|dhundho|maps|notifications?)/i.test(text);
  if (!looksAction) return null;

  const { keys } = settings;
  const prov = settings.provider;
  const apiKey = keys[prov];
  if (!apiKey) return null;

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 9000);
    const url = prov === "gemini"
      ? `https://generativelanguage.googleapis.com/v1beta/models/${settings.model || "gemini-3.6-flash"}:generateContent?key=${encodeURIComponent(apiKey)}`
      : prov === "openrouter" ? "https://openrouter.ai/api/v1/chat/completions" : "https://api.groq.com/openai/v1/chat/completions";

    let toolJson = "";
    if (prov === "gemini") {
      const resp = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          contents: [
            { role: "user", parts: [{ text: TOOL_PROMPT }] },
            { role: "model", parts: [{ text: "Understood." }] },
            { role: "user", parts: [{ text: `User: ${text}` }] },
          ],
          generationConfig: { temperature: 0, maxOutputTokens: 300 },
        }),
      });
      if (!resp.ok) return null;
      const data = await resp.json();
      toolJson = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
    } else {
      const resp = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
        signal: controller.signal,
        body: JSON.stringify({
          model: prov === settings.provider ? settings.model : "meta-llama/llama-3.1-8b-instruct:free",
          messages: [{ role: "user", content: TOOL_PROMPT + `\n\nUser: ${text}` }],
          temperature: 0,
          max_tokens: 300,
        }),
      });
      if (!resp.ok) return null;
      const data = await resp.json();
      toolJson = data?.choices?.[0]?.message?.content || "";
    }
    clearTimeout(timer);

    const m = toolJson.match(/\{[\s\S]*\}/);
    if (!m) return null;
    const parsed = JSON.parse(m[0]);
    if (parsed.tool === "none" || !parsed.tool) return null;
    return { tool: parsed.tool, params: parsed.params || {} };
  } catch {
    return null;
  }
}

// ===== STREAMING: Call provider with streaming =====
async function* streamGroq(messages: ChatMessage[], apiKey: string, model: string, systemPrompt?: string): AsyncGenerator<string> {
  const response = await fetch(PROVIDERS.groq.url, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model, stream: true,
      messages: [{ role: "system", content: systemPrompt || buildSystemPrompt("") }, ...messages.slice(-15)],
      temperature: 0.7, max_tokens: 2048,
    }),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error?.message || `Groq error ${response.status}`);
  }
  const reader = response.body!.getReader();
  const decoder = new TextDecoder();
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    const chunk = decoder.decode(value);
    for (const line of chunk.split("\n")) {
      if (!line.startsWith("data: ") || line === "data: [DONE]") continue;
      try {
        const data = JSON.parse(line.slice(6));
        const token = data.choices?.[0]?.delta?.content;
        if (token) yield token;
      } catch { /* skip */ }
    }
  }
}

async function* streamOpenRouter(messages: ChatMessage[], apiKey: string, model: string, systemPrompt?: string): AsyncGenerator<string> {
  const response = await fetch(PROVIDERS.openrouter.url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json", Authorization: `Bearer ${apiKey}`,
      "HTTP-Referer": window.location.origin, "X-Title": "Maya AI",
    },
    body: JSON.stringify({
      model, stream: true,
      messages: [{ role: "system", content: systemPrompt || buildSystemPrompt("") }, ...messages.slice(-15)],
      temperature: 0.7, max_tokens: 2048,
    }),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error?.message || `OpenRouter error ${response.status}`);
  }
  const reader = response.body!.getReader();
  const decoder = new TextDecoder();
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    const chunk = decoder.decode(value);
    for (const line of chunk.split("\n")) {
      if (!line.startsWith("data: ") || line === "data: [DONE]") continue;
      try {
        const data = JSON.parse(line.slice(6));
        const token = data.choices?.[0]?.delta?.content;
        if (token) yield token;
      } catch { /* skip */ }
    }
  }
}

export function useChat() {
  const [isLoading, setIsLoading] = useState(false);
  const [settings, setSettingsState] = useState<ProviderSettings>(loadSettings);

  const updateSettings = useCallback((newSettings: ProviderSettings) => {
    setSettingsState(newSettings);
    saveSettings(newSettings);
  }, []);

  // ===== STREAMING MESSAGE =====
  const streamMessage = useCallback(
    async function* (history: ChatMessage[]): AsyncGenerator<string> {
      // Check automation first
      const lastUserMsg = [...history].reverse().find((m) => m.role === "user");
      if (lastUserMsg && isAutomationCommand(lastUserMsg.content)) {
        const result = await executeAutomation(lastUserMsg.content);
        if (result) {
          const text = formatActionResult(result);
          yield text;
          return;
        }
      }

      const { model, keys } = settings;
      const ctx = await buildContext();
      const userText = lastUserMsg?.content || "";
      const lang = detectLanguage(userText);
      trackLanguage(lang);
      trackMessage();
      updateUserMood(detectMood(userText));

      // ===== PERSONA SWITCH (Maya / Friday / Venom) =====
      const personaCmd = detectPersonaCommand(userText);
      if (personaCmd) {
        setPersona(personaCmd);
        const p = getPersona();
        yield `${p.emoji} Done! Ab main ${p.name} hoon — ${p.tagline}`;
        return;
      }

      // ===== LLM TOOL-CALLING: AI khud plan banaye (regex ke baad, chat se pehle) =====
      const toolCall = await askToolCall(history, settings);
      if (toolCall) {
        const res = await executeDirectTool(toolCall.tool, { ...toolCall.params, rawInput: userText });
        if (res) {
          yield formatActionResult(res);
          return;
        }
      }

      // ===== SCREEN VISION ("look at my screen") =====
      if (isScreenVisionCommand(userText)) {
        const vision = await handleScreenVision(userText);
        if (vision) {
          yield `👁️ ${vision}`;
          return;
        }
        yield "👁️ Screen vision ke liye Gemini API key chahiye (Settings me). Screenshot leta hun — abhi dekh rahi hoon...";
        // screenshot le kar bata do kam se kam
        const shot = await nativeTakeScreenshot(1024, 75);
        if (shot.success) {
          yield "📸 Screenshot le liya! Ab batao screen par kya dekhna hai?";
        }
        return;
      }

      // Smart responses (non-streaming, instant)
      const smartResponse = findSmartResponse(userText, ctx);
      if (smartResponse) {
        if (smartResponse === "@JOKE@") { yield getRandomJoke().setup + "\n\n" + getRandomJoke().punchline; return; }
        if (smartResponse === "@QUOTE@") { const q = getDailyQuote(); yield `"${q.text}"\n— ${q.author}`; return; }
        if (smartResponse === "@RIDDLE@") { const r = getRandomRiddle(); yield `🤔 ${r.question}\n\nBol, kya hai jawab?`; return; }
        if (smartResponse === "@FUNFACT@") { yield `🧠 Fun Fact: ${getRandomFunFact()}`; return; }
        if (smartResponse === "@MORNING_ROUTINE@") {
          const routine = findMatchingRoutine("good morning");
          if (routine) markRoutineRun(routine.id);
          yield getSmartGreeting(ctx) + "\n\n" + getDeviceStatusResponse(ctx);
          return;
        }
        if (smartResponse) { yield smartResponse; return; }
      }

      const routine = findMatchingRoutine(userText);
      if (routine) { markRoutineRun(routine.id); yield `✅ Routine "${routine.name}" start ho gaya!`; return; }
      if (userText.match(/\b(status|battery|battery level|network)\b/i)) { yield getDeviceStatusResponse(ctx); return; }

      const langMod = getLanguageModifier(lang);
      const systemPrompt = buildSystemPrompt(langMod);

      // Try providers with streaming
      const providerOrder: Provider[] = [settings.provider];
      for (const p of ["groq", "openrouter", "gemini"] as Provider[]) {
        if (p !== settings.provider && keys[p]) providerOrder.push(p);
      }

      for (const prov of providerOrder) {
        const apiKey = keys[prov];
        if (!apiKey) continue;
        try {
          const provModel = prov === settings.provider ? model : PROVIDERS[prov].defaultModel;
          if (prov === "groq") {
            yield* streamGroq(history, apiKey, provModel, systemPrompt);
            return;
          } else if (prov === "openrouter") {
            yield* streamOpenRouter(history, apiKey, provModel, systemPrompt);
            return;
          } else if (prov === "gemini") {
            // Gemini doesn't support streaming in free tier, fallback to non-streaming
            const text = await callGemini(history, apiKey, provModel, systemPrompt);
            yield text;
            return;
          }
        } catch (err: any) {
          console.warn(`Provider ${prov} failed:`, err.message);
          continue;
        }
      }
      yield "❌ All providers failed. Check your API keys.";
    },
    [settings]
  );

  const sendMessage = useCallback(
    async (history: ChatMessage[]): Promise<string> => {
      setIsLoading(true);

      try {
        // Check if the last user message is an automation command
        const lastUserMsg = [...history].reverse().find((m) => m.role === "user");
        if (lastUserMsg && isAutomationCommand(lastUserMsg.content)) {
          const result = await executeAutomation(lastUserMsg.content);
          if (result) {
            return formatActionResult(result);
          }
        }

        const { model, keys } = settings;

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

        // ===== AUTO-FAILOVER: Try providers in order until one works =====
        const providerOrder: Provider[] = [settings.provider];
        // Add other providers as fallbacks
        for (const p of ["groq", "gemini", "openrouter"] as Provider[]) {
          if (p !== settings.provider && keys[p]) providerOrder.push(p);
        }

        let lastError = "";
        for (const prov of providerOrder) {
          const apiKey = keys[prov];
          if (!apiKey) continue;

          try {
            let response: string;
            const provModel = prov === settings.provider ? model : PROVIDERS[prov].defaultModel;

            switch (prov) {
              case "groq":
                response = await callGroq(history, apiKey, provModel, systemPrompt);
                break;
              case "openrouter":
                response = await callOpenRouter(history, apiKey, provModel, systemPrompt);
                break;
              case "gemini":
                response = await callGemini(history, apiKey, provModel, systemPrompt);
                break;
              default:
                continue;
            }
            return response;
          } catch (error: any) {
            lastError = error?.message || "Unknown error";
            console.warn(`Provider ${prov} failed:`, lastError, "→ trying next...");
            // Continue to next provider
            continue;
          }
        }

        // All providers failed
        if (lastError.includes("429") || lastError.includes("Rate limit") || lastError.includes("rate")) {
          return "⏳ All providers rate-limited! Wait 30 seconds and try again.";
        }
        if (lastError.includes("Failed to fetch") || lastError.includes("NetworkError")) {
          return "❌ Network error. Check your internet connection.";
        }
        return `❌ All providers failed. Last error: ${lastError}`;
      } catch (error: any) {
        console.error("Chat error:", error);
        return `❌ ${error?.message || "Unknown error"}`;
      } finally {
        setIsLoading(false);
      }
    },
    [settings]
  );

  // ===== STREAM WITH CALLBACK =====
  const streamWithCallback = useCallback(
    async (
      history: ChatMessage[],
      onChunk: (text: string) => void
    ): Promise<string> => {
      setIsLoading(true);
      try {
        let fullText = "";
        for await (const token of streamMessage(history)) {
          fullText += token;
          onChunk(fullText);
        }
        return fullText;
      } finally {
        setIsLoading(false);
      }
    },
    [streamMessage]
  );

  return { sendMessage, streamWithCallback, isLoading, settings, updateSettings };
}
