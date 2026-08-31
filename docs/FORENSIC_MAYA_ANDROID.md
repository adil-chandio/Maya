# 🔬 MAYA AI Android — Full Forensic Study + Build Plan
## (Video: GMqckXxK46c — "Maya AI Android Full Setup Hindi")

---

## 1. VIDEO KA DEEP ANALYSIS (chapter-by-chapter)

| Time | Kya dikhaya | Asli kaam (under the hood) |
|---|---|---|
| 0:00–3:38 | App overview + overlay UI | Fullscreen **voice HUD** — app ke upar floating layer |
| 3:38–7:06 | Download + license | Paid app — **license key + device activation** (hamara version free/GitHub) |
| 7:06–10:04 | APK install | Normal sideload install (humara same) |
| 10:04–12:51 | **Gemini API key setup** | LLM = Gemini free tier (hum same kar sakte hain — vision ke liye zaroori) |
| 12:51–17:24 | **Permissions setup** | Mic, notifications, **Accessibility (core)**, overlay permission |
| 17:24–18:44 | Personal settings, music | Spotify + YouTube default apps, music memory |
| 18:44–20:53 | **Name, memory, voices, personalities** | Persona system: GF / Professional / Venom + voice per persona |
| 20:53–23:44 | Conversation mode, language, call alerts | Continuous conversation loop + caller ID announce |
| 23:44–24:39 | **Skills** | Plugin-like modules (humara Automation core = ready) |
| 24:39–30:42 | **Sub-agents, model/API** | Background mini-agent tasks (research, files) |
| 30:42–32:14 | Social media automation | Instagram/FB — screen tap automation |
| 32:14–35:10 | Connectors, backup, customization | Backend + settings + theme |
| 35:10–37:23 | Audio, screen recording, typing | Screen recording + accessibility typing |
| 37:23–45:19 | **Voice Guardian, security** | Speaker recognition (voice ID — verify owner) |
| 45:19–50:07 | **Touch Guard, phone protection** | Anti-tamper: strangers try karein to lock |
| 50:07–55:42 | WhatsApp auto-reply, event triggers | Notification listener → auto-reply |
| 55:42–56:12 | Maya Home dashboard | ESP32 smart-home (paise wala feature) |
| 56:12–1:00:15 | Memory, files, camera, screen input | File manager + camera vision |
| 1:00:15–1:03:08 | PC connection, YouTube stats | PC ⇄ phone link |
| 1:03:08–1:05:50 | YouTube, proactive mode, conversation demo | Wake word + proactive suggestions |
| 1:05:50–1:06:57 | **Sub-agent research demo** | Background task handoff |
| 1:06:57–1:09:26 | **Facebook story automation demo** | Real UI automation demo |
| 1:09:26 | Download + community | — |

## 2. UI/INTERFACE (jo screen par dikhta hai)

- **Fullscreen voice HUD** (app ke upar) — circular avatar/core, waveform, live transcript, status (Listening/Speaking/Thinking)
- **Chat UI** — message bubbles, timestamp, "Powered by Gemini" footer (humara already hai)
- **Settings screens** — AI model, voices, personas, permissions, security
- **Persona switch chips** — Maya / Friday / Venom (humara ab hai ✅)
- **Sleep/Wake state** — offline wake word (paid feature — humara app-open-based)
- **Notification overlay** — caller name, WhatsApp events

## 3. ASLI ARCHITECTURE (inference — paid app ka "secret" recipe)

```
[Voice HUD] ←── AccessibilityService ←── [Any app: WhatsApp/IG/YT]
     │                                          ▲
     ▼                                          │ UI tap/type/scroll
[SpeechRecognizer] → [LLM (Gemini/Groq)] → [Action Planner]
     │                                          │
     ▼                                          ▼
[TTS (natural voice)]                [Native Actions: app launch, torch,
                                              volume, screenshot, macros]
```

**Core 5 cheezein jo "works like magic" banati hain:**
1. **AccessibilityService** — screen dekho + tap karo (✅ humare paas)
2. **Gemini vision** — screenshot samajh kar decision lo (✅ ab wiring ho gayi)
3. **LLM function-calling** — AI khud decide kare kaunsa action (humara regex + LLM prompt hybrid hai — isko LLM tool-calling tak upgrade karna hai)
4. **Natural TTS** — pyari awaaz (✅ cloud TTS + fallback)
5. **Event triggers** — notification listener se proactive kaam (❌ naya banana hai)

## 4. HAMARE PAAS KYA HAI vs KYA MISSING HAI

| Module | Status |
|---|---|
| Chat UI + Gemini/Groq/OpenRouter | ✅ |
| Voice (STT/TTS) — native + cloud | ✅ (voice quality improve ho rahi hai) |
| YouTube app song play (chrome fix) | ✅ (is build mein) |
| Instagram/WhatsApp open + scroll | ✅ (parser fix + native launch) |
| Torch (flash open karo) | ✅ |
| Personas (Maya/Friday/Venom) | ✅ |
| Screen vision (Gemini) | ✅ (Gemini key require) |
| Accessibility tap/type/swipe | ✅ |
| **Floating voice HUD (app ke upar)** | ❌ NEXT — overlay window |
| **Wake word (offline)** | ❌ NEXT — small on-device detect |
| **Notification listener (WhatsApp auto-reply)** | ❌ NEXT |
| **Caller name announce** | ❌ NEXT |
| **LLM tool-calling (AI khud plan kare)** | ❌ NEXT — bada upgrade |
| **Sub-agents (background tasks)** | ❌ LATER |
| **Macros/routines saved** | ⚠️ partial (core me routine-builder hai) |
| **Speaker recognition (Voice Guardian)** | ❌ LATER (hard, biometric-ish) |
| **PC link / Home dashboard** | ❌ LATER (paid niche) |

## 5. BUILD PLAN (phase-by-phase — jab aap "Haan" bologe)

**Phase 1 — "Jaisa video" (isi week):**
1. Floating Voice HUD: app band/background hote hue bhi overlay window + mic
2. Offline wake word ("Hey Maya" — chhota on-device model) + Sleep/Wake
3. Notification listener: WhatsApp aaye → Maya bataye + auto-reply
4. LLM tool-calling: AI khud decide kare — "Instagram kholke reels scroll karo" ek hi baar me (ab multi-step manual hai)
5. Caller ID announce (call aaye to "Ravi call kar raha hai")

**Phase 2 — polish:**
6. Natural voices pack (multi-voice AI TTS — Gemini/streamelements optimize)
7. Voice Guard light (voice match — sirf owner ko commands)
8. Sub-agent: "research karo" → background answer
9. Macros: "morning routine" save karo

**Phase 3 — pro:**
10. PC link, home automation (ESP32), file/docs creation, camera vision

---

> 📌 NOTE: Video wala app **₹699 ka paid license + backend server** hai. Hum iska **open-source clone** bana rahe hain — same concept, better control, zero license. Some paid features (offline wake word model, server-side sub-agents) ko humara approach thoda different hoga (sirf device par + free cloud APIs).
