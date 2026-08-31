# 🏗️ GitHub Actions — MAYA APK Build (Full Pipeline)

> **Note:** Ye improved workflow repo ke `actions` (workflows) permission ki wajah se direct commit nahi hua tha.
> Aap is file ka content apne GitHub account se `.github/workflows/build-apk.yml` me paste kar do, phir:
> 1. Push karo → automatic **Debug APK** banega
> 2. `v1.0.0` tag push karo → **signed Release + GitHub Release** banega

## Full Workflow (replace kar do)

```yaml
name: Build MAYA APK

on:
  push:
    branches: [ main, master, arena/** ]
    tags: [ 'v*' ]
  workflow_dispatch:

permissions:
  contents: write

jobs:
  build:
    runs-on: ubuntu-latest

    steps:
    - name: Checkout code
      uses: actions/checkout@v4

    - name: Setup Bun
      uses: oven-sh/setup-bun@v2

    - name: Setup Java 17
      uses: actions/setup-java@v4
      with:
        distribution: 'temurin'
        java-version: '17'

    - name: Setup Android SDK
      uses: android-actions/setup-android@v3

    - name: Install dependencies
      run: bun install

    - name: Build web app
      run: bun run build

    - name: Sync Capacitor
      run: bunx cap sync android

    - name: Build APKs
      env:
        KEYSTORE_BASE64: ${{ secrets.ANDROID_KEYSTORE_BASE64 }}
        KEYSTORE_PASSWORD: ${{ secrets.ANDROID_KEYSTORE_PASSWORD }}
        KEY_ALIAS: ${{ secrets.ANDROID_KEY_ALIAS }}
        KEY_PASSWORD: ${{ secrets.ANDROID_KEY_PASSWORD }}
      run: |
        chmod +x android/gradlew
        cd android
        if [ -n "$KEYSTORE_BASE64" ] && [ -n "$KEYSTORE_PASSWORD" ] && [ -n "$KEY_ALIAS" ] && [ -n "$KEY_PASSWORD" ]; then
          echo "$KEYSTORE_BASE64" | base64 -d > "$RUNNER_TEMP/maya-release.jks"
          echo "storeFile=$RUNNER_TEMP/maya-release.jks"   > keystore.properties
          echo "storePassword=$KEYSTORE_PASSWORD"          >> keystore.properties
          echo "keyAlias=$KEY_ALIAS"                       >> keystore.properties
          echo "keyPassword=$KEY_PASSWORD"                 >> keystore.properties
          echo "::notice::Signed release build enabled"
        else
          echo "::warning::Release signing secrets missing - building unsigned release APK"
        fi
        ./gradlew assembleDebug assembleRelease --no-daemon

    - name: Upload Debug APK
      uses: actions/upload-artifact@v4
      with:
        name: MAYA-Debug-APK
        path: android/app/build/outputs/apk/debug/app-debug.apk
        if-no-files-found: warn
        retention-days: 30

    - name: Upload Release APK
      uses: actions/upload-artifact@v4
      with:
        name: MAYA-Release-APK
        path: android/app/build/outputs/apk/release/app-release.apk
        if-no-files-found: warn
        retention-days: 30

    - name: Publish GitHub Release (tags only)
      if: startsWith(github.ref, 'refs/tags/')
      env:
        GH_TOKEN: ${{ github.token }}
      run: |
        if [ -f android/app/build/outputs/apk/release/app-release.apk ]; then
          gh release create "${GITHUB_REF_NAME}" \
            android/app/build/outputs/apk/debug/app-debug.apk \
            android/app/build/outputs/apk/release/app-release.apk \
            --title "Maya AI v${GITHUB_REF_NAME}" \
            --generate-notes || true
        else
          gh release create "${GITHUB_REF_NAME}" \
            android/app/build/outputs/apk/debug/app-debug.apk \
            --title "Maya AI v${GITHUB_REF_NAME}" \
            --generate-notes || true
        fi
```

## Secrets (Release APK signing ke liye — optional)

| Secret | Value |
|---|---|
| `ANDROID_KEYSTORE_BASE64` | `base64 -w0 maya-release.jks` ka output |
| `ANDROID_KEYSTORE_PASSWORD` | keystore password |
| `ANDROID_KEY_ALIAS` | alias (e.g. `maya`) |
| `ANDROID_KEY_PASSWORD` | key password |

`android/app/build.gradle` already `android/keystore.properties` (ya secrets se bani file) padh kar release ko sign karta hai — extra config nahi chahiye.

## APK Download

Build complete hone ke baad **Actions run → Artifacts** me:
- `MAYA-Debug-APK` — install karein (debug signed)
- `MAYA-Release-APK` — signed ho to Play/Release ready
