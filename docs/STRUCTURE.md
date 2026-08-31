# 📁 Project Structure — MAYA AI (Android)

Maya ek **Capacitor** app hai: React + TypeScript (web UI) Android WebView me chalti hai, aur native Android plugins se asli device control karti hai.

```
Maya/
├── package.json                  # npm scripts (dev, build, apk:build, apk:release)
├── capacitor.config.ts           # appId, appName, android settings
├── vite.config.ts                # Vite config
├── tsconfig*.json                # TypeScript configs
│
├── src/                          # 🔹 WEB APP (React + TS)
│   ├── main.tsx                  # React entry
│   ├── App.tsx                   # Router (/, /chat)
│   ├── index.css                 # Tailwind + Maya theme
│   │
│   ├── pages/
│   │   ├── LandingPage.tsx       # Hero / features page
│   │   └── ChatPage.tsx          # Main chat + automation UI
│   │
│   ├── components/
│   │   ├── VoiceAgent.tsx        # Voice overlay: mic, TTS settings, conversation
│   │   ├── SetupWizard.tsx       # First-run wizard: API key + NATIVE PERMISSIONS
│   │   ├── AutomationPanel.tsx   # Features / Contacts / History panel
│   │   └── CommandFeedback.tsx   # Command execution feedback
│   │
│   ├── hooks/
│   │   ├── useVoice.ts           # STT + TTS (Native Android FIRST, Web fallback)
│   │   └── useChat.ts            # LLM streaming (Groq/OpenRouter/Gemini) + automation routing
│   │
│   └── lib/
│       ├── automations/          # 🔹 AUTOMATION CORE
│       │   ├── types.ts          # AutomationAction / Command / Result types
│       │   ├── intent-parser.ts  # Hinglish/English regex → structured command
│       │   ├── index.ts          # Router: NATIVE → WEB → PHONE
│       │   ├── native-actions.ts # Torch, WiFi, BT, status, screenshot, UI actions
│       │   ├── web-bridge.ts     # Websites, search, YouTube, Maps, apps, alarms
│       │   └── phone-bridge.ts   # Call, SMS, WhatsApp, volume, brightness
│       │
│       ├── native/               # 🔹 NATIVE BRIDGE (TS side)
│       │   ├── maya-native.ts    # Typed Capacitor plugins (MayaAutomation/Speech/Tts)
│       │   └── native-bridge.ts  # Capacitor core helpers (notifications, haptics...)
│       │
│       └── core/                 # Smart replies, context, multilingual, routines, stats
│
├── android/                      # 🔹 ANDROID PROJECT (Capacitor)
│   ├── app/src/main/
│   │   ├── AndroidManifest.xml   # Permissions + accessibility service declaration
│   │   ├── res/xml/maya_accessibility_service.xml
│   │   └── java/com/maya/ai/assistant/
│   │       ├── MainActivity.java # Registers the 3 native plugins
│   │       ├── plugins/
│   │       │   ├── MayaAutomationPlugin.java  # volume/brightness/torch/wifi/bt/apps/alarm/settings
│   │       │   ├── MayaSpeechPlugin.java      # native SpeechRecognizer (continuous)
│   │       │   └── MayaTtsPlugin.java         # native TextToSpeech (offline, Hindi)
│   │       └── services/
│   │           └── MayaAccessibilityService.java  # tap/type/swipe/scroll/screenshot
│   └── app/build.gradle          # Optional release signing ke liye keystore.properties
│
├── convex/                       # (optional) Convex action helpers (legacy chat path)
├── docs/                         # Documentation
├── public/                       # Static assets (icons, manifest, sw.js)
├── dist/                         # Web build output (Capacitor isko package karta hai)
└── .github/workflows/
    └── build-apk.yml             # GitHub Actions: web build → cap sync → APK (+release)
```

## 🔄 Data Flow

```
┌─────────────┐     ┌──────────────────┐     ┌───────────────────────┐
│ Voice (Mic) │ ──▶ │ useVoice         │ ──▶ │ useChat / VoiceAgent  │
│ Text (Chat) │     │ (native STT/TTS) │     │                       │
└─────────────┘     └──────────────────┘     └──────────┬────────────┘
                                                         │
                                            parseIntent() (Hinglish+EN)
                                                         │
                                      ┌──────────────────┼──────────────────┐
                                      ▼                  ▼                  ▼
                              Native Actions      Web Bridge        Phone Bridge
                              (torch, screenshot,  (open site,       (call, sms,
                               ui automation...)    search, maps)     whatsapp, volume)
                                      │
                              MayaAutomationPlugin  ◀── Capacitor JS bridge
                              MayaAccessibilityService
                                      │
                              Android OS (apps, screen, system)
```

## 🧩 Native Plugins (Java)

| Plugin | Kya karta hai |
|---|---|
| `MayaAutomationPlugin` | `getDeviceInfo`, `launchApp`, `setVolume`, `setBrightness`, `setTorch`, `toggleWifi`, `toggleBluetooth`, `setAlarm` (AlarmClock API), `openSettings`, `uiCommand`, `takeScreenshot` |
| `MayaSpeechPlugin` | Android `SpeechRecognizer` — single/continuous, partial results, error events, runtime `RECORD_AUDIO` permission |
| `MayaTtsPlugin` | Android `TextToSpeech` — rate/pitch/language, Hindi support, start/end/error events |
| `MayaAccessibilityService` | tap by text/desc, type text, swipe, scroll, back/home/recents/notifications, read screen, wait-for-text, screenshot (API 30+), UI dump |
