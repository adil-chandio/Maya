# 📲 Android Setup Guide — MAYA AI APK

## 1. APK Install Karna

**Option A — GitHub Actions se (recommended):**
1. Repo ko GitHub par push karo.
2. `Actions` → `Build MAYA APK` → `Run workflow`.
3. Artifacts: `MAYA-Debug-APK` download karo (`app-debug.apk`).
4. Phone par file bhejo → install → "Install from unknown sources" allow karo.

**Option B — Local build:**
```bash
npm install
npm run build
npx cap sync android
cd android && ./gradlew assembleDebug
```
APK: `android/app/build/outputs/apk/debug/app-debug.apk`

---

## 2. Pehli Baar Setup (in-app wizard)

| Step | Kya karna hai |
|---|---|
| 1️⃣ AI Key | Groq (`gsk_...`), Gemini (`AIza...`) ya OpenRouter (`sk-or-...`) — free keys |
| 2️⃣ Microphone | "Allow" karo — voice ke liye |
| 3️⃣ Write Settings | (optional) Brightness control ke liye — app select karke `Allow` |
| 4️⃣ Accessibility | **Zaroori** — screen control (tap/type/screenshot) ke liye |

---

## 3. Accessibility Enable Karna (important)

Settings → Accessibility → **Maya AI Remote Control** → **ON**

- Ye service **sirf** AI ke commands par screen padhti hai.
- Khud WhatsApp/Instagram me actions nahi karti — aap bologe tab karegi.
- **Disable karne par:** tap/type/swipe/screenshot commands kaam nahi karenge. Baaki chat/voice/volume sab chalega.

## 4. Permissions Summary (AndroidManifest)

| Permission | Kyun |
|---|---|
| `RECORD_AUDIO` | Voice commands (SpeechRecognizer) |
| `POST_NOTIFICATIONS` | Reminders / command feedback |
| `WRITE_SETTINGS` | Brightness control (special permission) |
| `CAMERA` | Flashlight (torch) |
| `BLUETOOTH_CONNECT` | Bluetooth toggle (best-effort) |
| `QUERY_ALL_PACKAGES` | Installed apps list → "open camera" jaise commands |
| `BIND_ACCESSIBILITY_SERVICE` | UI automation service |

---

## 5. Troubleshooting

**"Speech recognition not available"**
- Google app / Google speech services installed honi chahiye (almost sab phones me hoti hai).
- Play Store → Google → Update.

**Voice commands sun nahi rahi**
- Mic permission allow karo, app restart karo.
- Hindi ke liye voice settings me language `hi-IN` / `en-IN` karo.

**"Tap/type kaam nahi kar raha"**
- Accessibility service ON hai? (Settings → Accessibility → Maya AI Remote Control)
- Kuch apps (banking/secure apps) accessibility blocks karti hain — wahan Maya screen nahi padh sakti (by design, safety ke liye).

**Brightness nahi ho rahi**
- Write Settings permission: Settings → Apps → Maya AI → "Allow system settings" → Allow.

**"torch" / "screenshot" error**
- Torch: camera permission allow karo.
- Screenshot: Android 11+ chahiye (Maya ke liye).

**APK install nahi ho raha**
- `adb install app-debug.apk` ya file manager se install karo (unknown sources allow).

---

## 6. GitHub Release (signed) — optional

Tag push karo:
```bash
git tag v1.0.0 && git push origin v1.0.0
```
Workflow automatically signed release bana deta hai agar repo secrets me keystore set ho (README dekho).

Local signing:
```
android/keystore.properties:
  storeFile=/absolute/path/maya-release.jks
  storePassword=...
  keyAlias=...
  keyPassword=...
```
