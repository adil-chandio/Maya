# 🤖 MAYA AI — Android Voice Assistant (Full Device Control)

> **"JARVIS jaisi AI — jo aapka poora phone control karti hai!"**
> Voice-first AI assistant built as an **Android APK** — chat, bol ke commands do, aur Maya phone ke andar apps bhi control kare (tap / type / swipe / screenshot). GitHub Actions se ek click me APK banta hai.

---

## ✨ Kya kya kar sakti hai?

| Category | Commands |
|---|---|
| 🎵 **YouTube & Music** | `romantic songs sunao`, `play karo na`, `youtube pe gaana chalao` |
| 🌐 **Web & Search** | `open google.com`, `search for recipes`, `youtube pe jao` |
| 📞 **Calls / SMS / WhatsApp** | `call mom`, `text John saying hi`, `whatsapp message to Kumail ki hi` |
| 🔆 **Volume & Brightness** | `volume to 80`, `mute`, `brightness 50%` (native Android) |
| 🔦 **Torch (Flashlight)** | `torch on`, `flash off karo` |
| 📶 **WiFi / Bluetooth** | `wifi off`, `bluetooth chalu karo` (Android 10+ par settings khulti hai) |
| 🔋 **Device Status** | `battery kitni hai`, `phone status`, `device info` |
| 📸 **Screenshot** | `screenshot lo` (Android 11+) |
| 🕹️ **Screen Automation** | `tap send`, `type hello world`, `swipe up`, `scroll down`, `go back`, `home`, `recent apps` — kisi bhi app me! |
| 📲 **App Launch** | `open camera`, `launch instagram`, `kholo whatsapp` (koi bhi installed app) |
| 🗺️ **Maps** | `maps to New Delhi`, `navigate to cafe` |
| ⏰ **Alarms** | `set alarm for 7am`, `wake me at 6:30` |
| 💬 **AI Chat** | Groq / OpenRouter / Gemini — free models se streaming chat |
| 🎙️ **Voice** | Native Android speech recognition + on-device TTS (Hindi supported) |

> Poori command list: [`docs/CAPABILITIES.md`](docs/CAPABILITIES.md)

---

## 🏗️ Project Structure

```
Maya/
├── src/                        # React + TypeScript web app (UI, voice, logic)
│   ├── components/             # VoiceAgent, SetupWizard, AutomationPanel...
│   ├── hooks/                  # useVoice (STT/TTS), useChat (LLM streaming)
│   ├── lib/
│   │   ├── automations/        # Intent parser → bridges → device actions
│   │   ├── core/               # Smart replies, context, multilingual, routines
│   │   └── native/             # Native Android plugin bridge (TypeScript)
│   └── pages/                  # Landing + Chat UI
├── android/                    # Capacitor Android project
│   └── app/src/main/java/com/maya/ai/assistant/
│       ├── plugins/            # MayaAutomationPlugin, MayaSpeechPlugin, MayaTtsPlugin
│       └── services/           # MayaAccessibilityService (UI automation)
├── convex/                     # (optional) Convex backend helpers
├── docs/                       # Setup + structure + capabilities docs
└── .github/workflows/          # build-apk.yml — GitHub Actions APK build
```

Poora tree + explanation: [`docs/STRUCTURE.md`](docs/STRUCTURE.md)

---

## 🚀 Quick Start

### Web mode (browser me test karo)

```bash
npm install
npm run dev        # http://localhost:5173
```

### Android APK banana (GitHub Actions — recommended)

1. Is repo ko **fork / clone** karo aur GitHub par push karo.
2. **Actions** tab → **Build MAYA APK** → **Run workflow**.
3. Run complete hone ke baad **Artifacts** section se `MAYA-Debug-APK` download karo.
4. APK phone par install karo (unknown sources allow karo).

> ⚠️ **Build pipeline upgrade:** is branch ke saath ek behtar workflow (debug + signed release + tag releases) `docs/GITHUB_BUILD.md` me ready hai — apne account se `.github/workflows/build-apk.yml` me paste karo (GitHub App ki `workflows` permission ki wajah se auto-commit nahi hua).

### Android APK banana (local — Android Studio / JDK 17 + Android SDK chahiye)

```bash
npm install
npm run build
npx cap sync android
cd android && ./gradlew assembleDebug
# APK: android/app/build/outputs/apk/debug/app-debug.apk
```

### Signed Release APK (optional)

`android/keystore.properties` banao, ya GitHub Secrets set karo:

| Secret | Value |
|---|---|
| `ANDROID_KEYSTORE_BASE64` | `base64 -w0 maya-release.jks` ka output |
| `ANDROID_KEYSTORE_PASSWORD` | keystore password |
| `ANDROID_KEY_ALIAS` | key alias |
| `ANDROID_KEY_PASSWORD` | key password |

---

## 📲 Phone Setup (APK install ke baad)

1. **AI API Key** — Setup Wizard me free key dalo:
   - **Groq** → https://console.groq.com/keys (sabse fast, free)
   - **Gemini** → https://aistudio.google.com/apikey
   - **OpenRouter** → https://openrouter.ai/keys (bahut saare free models)
2. **Microphone** — voice commands ke liye allow karo.
3. **Write Settings** (optional) — brightness control ke liye.
4. **Maya AI Remote Control** — Settings → Accessibility → **ON** karo.
   Ye step Maya ko *screen control* (tap/type/swipe/screenshot) deta hai.

Detail guide + troubleshooting: [`docs/ANDROID_SETUP.md`](docs/ANDROID_SETUP.md)

---

## 🧠 Architecture (ek line me)

```
Voice/Text  →  Intent Parser (Hindi/Hinglish/English)  →  Automation Router
                                                              ├── Web Bridge (open URLs, search...)
                                                              ├── Phone Bridge (call, SMS, WhatsApp)
                                                              └── Native Bridge (Android plugins)
                                                                      ├── MayaAutomationPlugin
                                                                      ├── MayaSpeechPlugin
                                                                      ├── MayaTtsPlugin
                                                                      └── MayaAccessibilityService
```

Normal chat (jo automation nahi hai) → **Groq / OpenRouter / Gemini** streaming se → answer + **TTS** se boli jati hai.

---

## ⚠️ Notes

- **Privacy-first:** Accessibility service sirf **aapke command par** screen padhti hai; koi data device se bahar nahi jata (sirf AI chat ke liye API key use hota hai).
- **Play Store:** `QUERY_ALL_PACKAGES` + Accessibility jaise permissions ke liye Play Store policy justification chahiye hogi. Personal / sideload use ke liye bilkul fine hai.
- Ye project JARVIS-style *personal assistant* hai — device control commands user ke special permissions par depend karti hain.

---

## 📚 Docs

| File | Content |
|---|---|
| [docs/STRUCTURE.md](docs/STRUCTURE.md) | Full file tree + module explanation |
| [docs/ANDROID_SETUP.md](docs/ANDROID_SETUP.md) | APK install, permissions, troubleshooting |
| [docs/CAPABILITIES.md](docs/CAPABILITIES.md) | Har voice command ka list (EN + Hinglish) |

Happy building! 🚀
