// ===== MAYA NATIVE BRIDGE =====
// Typed access to the native Android plugins (MayaAutomation, MayaSpeech, MayaTts).
// All functions are safe to call on web — they return fallbacks when not native.

import { Capacitor, registerPlugin } from "@capacitor/core";

export const isNativePlatform = () => Capacitor.isNativePlatform();
export const isAndroidPlatform = () => Capacitor.getPlatform() === "android";

// =====================================================================
// MAYA AUTOMATION PLUGIN
// =====================================================================

export interface InstalledApp {
  name: string;
  packageName: string;
  isSystem: boolean;
}

export interface DeviceInfo {
  model: string;
  manufacturer: string;
  androidVersion: string;
  sdkInt: number;
  battery: number;
  charging: boolean;
  canWriteSettings: boolean;
  accessibilityEnabled: boolean;
  torchAvailable: boolean;
}

export interface NativeResult {
  success: boolean;
  message: string;
  [key: string]: any;
}

interface MayaAutomationNativePlugin {
  getDeviceInfo(): Promise<DeviceInfo>;
  getCapabilities(): Promise<Record<string, boolean>>;
  isAccessibilityEnabled(): Promise<{ enabled: boolean }>;
  launchApp(options: { packageName?: string; name?: string }): Promise<NativeResult>;
  getInstalledApps(options?: { limit?: number }): Promise<{ apps: InstalledApp[]; total: number }>;
  setVolume(options: { level: number; stream?: string }): Promise<NativeResult>;
  getVolume(options?: { stream?: string }): Promise<NativeResult>;
  setBrightness(options: { level: number }): Promise<NativeResult>;
  canWriteSettings(): Promise<{ canWrite: boolean }>;
  setTorch(options: { on: boolean }): Promise<NativeResult>;
  toggleWifi(options: { on: boolean }): Promise<NativeResult>;
  toggleBluetooth(options: { on: boolean }): Promise<NativeResult>;
  setAlarm(options: { hours: number; minutes: number; label?: string }): Promise<NativeResult>;
  openSettings(options: { screen: string }): Promise<NativeResult>;
  uiCommand(options: { type: string; params?: Record<string, any> }): Promise<NativeResult>;
  takeScreenshot(options?: { maxWidth?: number; quality?: number }): Promise<NativeResult>;
  getForegroundApp(): Promise<NativeResult>;
}

interface MayaSpeechNativePlugin {
  isAvailable(): Promise<{ available: boolean; language: string }>;
  startListening(options: { language?: string; continuous?: boolean }): Promise<NativeResult>;
  stopListening(): Promise<NativeResult>;
  addListener(eventName: string, listener: (data: any) => void): Promise<{ remove: () => void }>;
}

interface MayaTtsNativePlugin {
  isAvailable(): Promise<{ available: boolean; ready: boolean }>;
  speak(options: { text: string; rate?: number; pitch?: number; language?: string }): Promise<NativeResult>;
  stop(): Promise<NativeResult>;
  addListener(eventName: string, listener: (data: any) => void): Promise<{ remove: () => void }>;
}

export const MayaAutomation = registerPlugin<MayaAutomationNativePlugin>("MayaAutomation");
export const MayaSpeech = registerPlugin<MayaSpeechNativePlugin>("MayaSpeech");
export const MayaTts = registerPlugin<MayaTtsNativePlugin>("MayaTts");

// =====================================================================
// SAFE WRAPPERS (native-first, web fallback)
// =====================================================================

function fallback(message: string, extra: Record<string, any> = {}): NativeResult {
  return { success: false, message, ...extra };
}

/** True when the native plugin is actually present (not on web). */
export function nativePluginsAvailable(): boolean {
  return isNativePlatform() && (MayaAutomation as any) !== undefined;
}

export async function nativeGetDeviceInfo(): Promise<DeviceInfo | null> {
  if (!nativePluginsAvailable()) return null;
  try {
    return await MayaAutomation.getDeviceInfo();
  } catch {
    return null;
  }
}

export async function nativeLaunchApp(name?: string, packageName?: string): Promise<NativeResult> {
  if (!nativePluginsAvailable()) return fallback("Native app launch not available");
  try {
    return await MayaAutomation.launchApp({ name, packageName });
  } catch (e: any) {
    return fallback(`App launch failed: ${e?.message || e}`);
  }
}

export async function nativeSetVolume(level: number, stream = "music"): Promise<NativeResult> {
  if (!nativePluginsAvailable()) return fallback("Native volume control not available");
  try {
    return await MayaAutomation.setVolume({ level, stream });
  } catch (e: any) {
    return fallback(`Volume failed: ${e?.message || e}`);
  }
}

export async function nativeGetVolume(stream = "music"): Promise<NativeResult> {
  if (!nativePluginsAvailable()) return fallback("Native volume not available");
  try {
    return await MayaAutomation.getVolume({ stream });
  } catch (e: any) {
    return fallback(`Volume failed: ${e?.message || e}`);
  }
}

export async function nativeSetBrightness(level: number): Promise<NativeResult> {
  if (!nativePluginsAvailable()) return fallback("Native brightness not available");
  try {
    return await MayaAutomation.setBrightness({ level });
  } catch (e: any) {
    return fallback(`Brightness failed: ${e?.message || e}`);
  }
}

export async function nativeCanWriteSettings(): Promise<boolean> {
  if (!nativePluginsAvailable()) return false;
  try {
    const res = await MayaAutomation.canWriteSettings();
    return !!res.canWrite;
  } catch {
    return false;
  }
}

export async function nativeSetTorch(on: boolean): Promise<NativeResult> {
  if (!nativePluginsAvailable()) return fallback("Native torch not available");
  try {
    return await MayaAutomation.setTorch({ on });
  } catch (e: any) {
    return fallback(`Torch failed: ${e?.message || e}`);
  }
}

export async function nativeToggleWifi(on: boolean): Promise<NativeResult> {
  if (!nativePluginsAvailable()) return fallback("Native WiFi control not available");
  try {
    return await MayaAutomation.toggleWifi({ on });
  } catch (e: any) {
    return fallback(`WiFi failed: ${e?.message || e}`);
  }
}

export async function nativeToggleBluetooth(on: boolean): Promise<NativeResult> {
  if (!nativePluginsAvailable()) return fallback("Native Bluetooth control not available");
  try {
    return await MayaAutomation.toggleBluetooth({ on });
  } catch (e: any) {
    return fallback(`Bluetooth failed: ${e?.message || e}`);
  }
}

export async function nativeSetAlarm(hours: number, minutes: number, label?: string): Promise<NativeResult> {
  if (!nativePluginsAvailable()) return fallback("Native alarm not available");
  try {
    return await MayaAutomation.setAlarm({ hours, minutes, label });
  } catch (e: any) {
    return fallback(`Alarm failed: ${e?.message || e}`);
  }
}

export async function nativeOpenSettings(screen: string): Promise<NativeResult> {
  if (!nativePluginsAvailable()) return fallback("Native settings not available");
  try {
    return await MayaAutomation.openSettings({ screen });
  } catch (e: any) {
    return fallback(`Open settings failed: ${e?.message || e}`);
  }
}

export async function nativeUiCommand(
  type: string,
  params: Record<string, any> = {}
): Promise<NativeResult> {
  if (!nativePluginsAvailable()) return fallback("Native UI automation not available");
  try {
    return await MayaAutomation.uiCommand({ type, params });
  } catch (e: any) {
    return fallback(`UI command failed: ${e?.message || e}`);
  }
}

export async function nativeTakeScreenshot(maxWidth = 720, quality = 70): Promise<NativeResult> {
  if (!nativePluginsAvailable()) return fallback("Native screenshot not available");
  try {
    return await MayaAutomation.takeScreenshot({ maxWidth, quality });
  } catch (e: any) {
    return fallback(`Screenshot failed: ${e?.message || e}`);
  }
}

export async function nativeGetForegroundApp(): Promise<NativeResult> {
  if (!nativePluginsAvailable()) return fallback("Native foreground not available");
  try {
    return await MayaAutomation.getForegroundApp();
  } catch (e: any) {
    return fallback(`Foreground failed: ${e?.message || e}`);
  }
}

export async function nativeIsAccessibilityEnabled(): Promise<boolean> {
  if (!nativePluginsAvailable()) return false;
  try {
    const res = await MayaAutomation.isAccessibilityEnabled?.();
    return !!res?.enabled;
  } catch {
    return false;
  }
}

export async function nativeListApps(limit = 200): Promise<InstalledApp[]> {
  if (!nativePluginsAvailable()) return [];
  try {
    const res = await MayaAutomation.getInstalledApps({ limit });
    return res?.apps || [];
  } catch {
    return [];
  }
}

// =====================================================================
// NATIVE SPEECH (SpeechRecognizer) — WebView mein Web Speech API nahi hoti
// =====================================================================

export async function nativeSpeechAvailable(): Promise<boolean> {
  if (!nativePluginsAvailable()) return false;
  try {
    const res = await MayaSpeech.isAvailable();
    return !!res.available;
  } catch {
    return false;
  }
}

export async function nativeStartListening(
  language: string,
  continuous: boolean
): Promise<NativeResult> {
  if (!nativePluginsAvailable()) return fallback("Native speech not available");
  try {
    return await MayaSpeech.startListening({ language, continuous });
  } catch (e: any) {
    return fallback(`Speech start failed: ${e?.message || e}`);
  }
}

export async function nativeStopListening(): Promise<NativeResult> {
  if (!nativePluginsAvailable()) return fallback("Native speech not available");
  try {
    return await MayaSpeech.stopListening();
  } catch (e: any) {
    return fallback(`Speech stop failed: ${e?.message || e}`);
  }
}

export async function nativeOnSpeech(
  handlers: {
    onFinal?: (text: string) => void;
    onPartial?: (text: string) => void;
    onError?: (code: string) => void;
  }
): Promise<() => void> {
  const removes: Array<() => void> = [];
  const attach = async (event: string, cb: (data: any) => void) => {
    try {
      const h = await (MayaSpeech as any).addListener(event, cb);
      if (h && typeof h.remove === "function") removes.push(h.remove);
    } catch {
      /* web */
    }
  };
  if (handlers.onFinal) await attach("finalTranscript", (d) => handlers.onFinal?.(d?.text || ""));
  if (handlers.onPartial) await attach("partialTranscript", (d) => handlers.onPartial?.(d?.text || ""));
  if (handlers.onError) await attach("error", (d) => handlers.onError?.(d?.code || d?.error || "error"));
  return () => removes.forEach((r) => r());
}

// =====================================================================
// NATIVE TTS
// =====================================================================

export async function nativeTtsAvailable(): Promise<boolean> {
  if (!nativePluginsAvailable()) return false;
  try {
    const res = await MayaTts.isAvailable();
    return !!res.available;
  } catch {
    return false;
  }
}

export async function nativeSpeak(
  text: string,
  opts: { rate?: number; pitch?: number; language?: string } = {}
): Promise<NativeResult> {
  if (!nativePluginsAvailable()) return fallback("Native TTS not available");
  try {
    return await MayaTts.speak({ text, ...opts });
  } catch (e: any) {
    return fallback(`TTS failed: ${e?.message || e}`);
  }
}

export async function nativeStopSpeaking(): Promise<NativeResult> {
  if (!nativePluginsAvailable()) return fallback("Native TTS not available");
  try {
    return await MayaTts.stop();
  } catch (e: any) {
    return fallback(`TTS stop failed: ${e?.message || e}`);
  }
}

export async function nativeOnTtsEnd(handlers: {
  onEnd?: () => void;
  onError?: () => void;
  onStart?: () => void;
}): Promise<() => void> {
  const removes: Array<() => void> = [];
  const attach = async (event: string, cb: (data: any) => void) => {
    try {
      const h = await (MayaTts as any).addListener(event, cb);
      if (h && typeof h.remove === "function") removes.push(h.remove);
    } catch {
      /* web */
    }
  };
  if (handlers.onEnd) await attach("end", () => handlers.onEnd?.());
  if (handlers.onError) await attach("error", () => handlers.onError?.());
  if (handlers.onStart) await attach("start", () => handlers.onStart?.());
  return () => removes.forEach((r) => r());
}
