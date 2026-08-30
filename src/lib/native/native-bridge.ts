// ===== NATIVE BRIDGE =====
// Bridges web app with Android native features via Capacitor
// Falls back to web APIs when running in browser

import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import { Haptics } from '@capacitor/haptics';
import { Browser } from '@capacitor/browser';

// Check if running on native platform
export const isNativePlatform = () => Capacitor.isNativePlatform();
export const isAndroid = () => Capacitor.getPlatform() === 'android';
export const isIOS = () => Capacitor.getPlatform() === 'ios';
export const isWeb = () => Capacitor.getPlatform() === 'web';

// ===== NOTIFICATIONS =====

export async function requestNotificationPermission(): Promise<boolean> {
  if (isNativePlatform()) {
    try {
      const permission = await LocalNotifications.requestPermissions();
      return permission.display === 'granted';
    } catch (error) {
      console.error('Notification permission error:', error);
      return false;
    }
  }
  // Web fallback
  if ('Notification' in window) {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }
  return false;
}

export async function showNotification(title: string, body: string, id?: number) {
  if (isNativePlatform()) {
    try {
      await LocalNotifications.schedule({
        notifications: [{
          title,
          body,
          id: id || Date.now(),
          smallIcon: 'ic_stat_icon_config_sample',
          largeIcon: 'ic_launcher',
        }],
      });
    } catch (error) {
      console.error('Notification error:', error);
    }
  } else {
    // Web fallback
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(title, { body });
    }
  }
}

// ===== HAPTICS (VIBRATION) =====

export async function vibrate(pattern?: number | number[]) {
  if (isNativePlatform()) {
    try {
      if (typeof pattern === 'number') {
        await Haptics.vibrate({ duration: pattern });
      } else {
        // For patterns, use vibration API
        await Haptics.vibrate({ duration: 100 });
      }
    } catch (error) {
      console.error('Haptics error:', error);
    }
  } else {
    // Web fallback
    if ('vibrate' in navigator) {
      navigator.vibrate(pattern || 100);
    }
  }
}

export async function vibrateLight() {
  if (isNativePlatform()) {
    try {
      await Haptics.vibrate({ duration: 50 });
    } catch (error) {
      console.error('Haptics error:', error);
    }
  } else {
    vibrate(50);
  }
}

export async function vibrateMedium() {
  if (isNativePlatform()) {
    try {
      await Haptics.vibrate({ duration: 100 });
    } catch (error) {
      console.error('Haptics error:', error);
    }
  } else {
    vibrate(100);
  }
}

export async function vibrateHeavy() {
  if (isNativePlatform()) {
    try {
      await Haptics.vibrate({ duration: 200 });
    } catch (error) {
      console.error('Haptics error:', error);
    }
  } else {
    vibrate(200);
  }
}

export async function vibrateSuccess() {
  if (isNativePlatform()) {
    try {
      await Haptics.vibrate({ duration: 100 });
    } catch (error) {
      console.error('Haptics error:', error);
    }
  } else {
    vibrate([50, 50, 50]);
  }
}

export async function vibrateWarning() {
  if (isNativePlatform()) {
    try {
      await Haptics.vibrate({ duration: 150 });
    } catch (error) {
      console.error('Haptics error:', error);
    }
  } else {
    vibrate([100, 50, 100]);
  }
}

export async function vibrateError() {
  if (isNativePlatform()) {
    try {
      await Haptics.vibrate({ duration: 200 });
    } catch (error) {
      console.error('Haptics error:', error);
    }
  } else {
    vibrate([200, 100, 200, 100, 200]);
  }
}

// ===== BROWSER =====

export async function openExternalUrl(url: string) {
  if (isNativePlatform()) {
    try {
      await Browser.open({ url });
    } catch (error) {
      console.error('Browser error:', error);
      // Fallback to window.open
      window.open(url, '_blank');
    }
  } else {
    window.open(url, '_blank');
  }
}

// ===== VOICE (Native Speech Recognition) =====

interface NativeSpeechOptions {
  language?: string;
  continuous?: boolean;
  interimResults?: boolean;
}

export function startNativeSpeechRecognition(
  onResult: (transcript: string, isFinal: boolean) => void,
  onError: (error: string) => void,
  onEnd: () => void,
  options?: NativeSpeechOptions
): () => void {
  // Check for web speech API support (works in WebView)
  const SpeechRecognition = (window as any).SpeechRecognition || 
                            (window as any).webkitSpeechRecognition;
  
  if (!SpeechRecognition) {
    onError('Speech recognition not supported');
    return () => {};
  }

  const recognition = new SpeechRecognition();
  recognition.lang = options?.language || 'en-US';
  recognition.continuous = options?.continuous || false;
  recognition.interimResults = options?.interimResults || false;

  recognition.onresult = (event: any) => {
    const result = event.results[event.results.length - 1];
    const transcript = result[0].transcript;
    const isFinal = result.isFinal;
    onResult(transcript, isFinal);
  };

  recognition.onerror = (event: any) => {
    onError(event.error);
  };

  recognition.onend = () => {
    onEnd();
  };

  try {
    recognition.start();
  } catch (error) {
    onError('Failed to start speech recognition');
  }

  // Return stop function
  return () => {
    try {
      recognition.stop();
    } catch (error) {
      // Ignore errors on stop
    }
  };
}

// ===== TEXT-TO-SPEECH (Native TTS) =====

interface NativeTTSOptions {
  rate?: number;
  pitch?: number;
  volume?: number;
  language?: string;
}

export function speakNative(
  text: string,
  onEnd?: () => void,
  options?: NativeTTSOptions
): () => void {
  // Use Web Speech API (works in WebView)
  if ('speechSynthesis' in window) {
    // Cancel any ongoing speech
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = options?.rate || 1;
    utterance.pitch = options?.pitch || 1;
    utterance.volume = options?.volume || 1;
    
    if (options?.language) {
      utterance.lang = options.language;
    }

    utterance.onend = () => {
      onEnd?.();
    };

    utterance.onerror = () => {
      onEnd?.();
    };

    window.speechSynthesis.speak(utterance);

    return () => {
      window.speechSynthesis.cancel();
    };
  }

  // Fallback - just call onEnd
  onEnd?.();
  return () => {};
}

export function stopSpeaking() {
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel();
  }
}

// ===== DEVICE INFO =====

export async function getDeviceInfo() {
  if (isNativePlatform()) {
    // On native, we can get more device info
    return {
      platform: Capacitor.getPlatform(),
      isNative: true,
      // Battery, network, etc. can be added with more plugins
    };
  }
  
  // Web fallback
  return {
    platform: 'web',
    isNative: false,
    batteryLevel: await getBatteryLevel(),
    isOnline: navigator.onLine,
  };
}

export async function getBatteryLevel(): Promise<number | null> {
  if ('getBattery' in navigator) {
    try {
      const battery = await (navigator as any).getBattery();
      return Math.round(battery.level * 100);
    } catch {
      return null;
    }
  }
  return null;
}

// ===== SHARE =====

export async function shareContent(title: string, text: string, url?: string) {
  if (isNativePlatform() && 'share' in navigator) {
    try {
      await navigator.share({
        title,
        text,
        url,
      });
    } catch (error) {
      console.error('Share error:', error);
    }
  } else {
    // Fallback - copy to clipboard
    try {
      await navigator.clipboard.writeText(text);
      showNotification('Copied!', 'Content copied to clipboard');
    } catch (error) {
      console.error('Clipboard error:', error);
    }
  }
}

// ===== PHONE CALL =====

export function makePhoneCall(number: string) {
  window.open(`tel:${number}`, '_self');
}

// ===== SMS =====

export function sendSMS(number: string, message?: string) {
  const url = message 
    ? `sms:${number}?body=${encodeURIComponent(message)}`
    : `sms:${number}`;
  window.open(url, '_self');
}

// ===== WHATSAPP =====

export function sendWhatsApp(number: string, message?: string) {
  const url = message
    ? `https://wa.me/${number}?text=${encodeURIComponent(message)}`
    : `https://wa.me/${number}`;
  openExternalUrl(url);
}

// ===== YOUTUBE =====

export function openYouTube(query?: string) {
  const url = query
    ? `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`
    : 'https://www.youtube.com';
  openExternalUrl(url);
}

export function playYouTubeSearch(query: string) {
  const url = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}&sp=EgIQAQ%3D%3D`;
  openExternalUrl(url);
}

// ===== GOOGLE MAPS =====

export function openGoogleMaps(query: string) {
  const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
  openExternalUrl(url);
}

// ===== ALARM (Web fallback - opens clock app) =====

export function setAlarm(time: string, label?: string) {
  // Try to open clock app with alarm
  const [hours, minutes] = time.split(':').map(Number);
  
  if (isAndroid()) {
    // Android intent to set alarm
    const intent = `intent:#Intent;action=android.intent.action.SET_ALARM;extra=android.intent.extra.alarm.HOUR:${hours};extra=android.intent.extra.alarm.MINUTES:${minutes};${label ? `extra=android.intent.extra.alarm.MESSAGE:${encodeURIComponent(label)};` : ''}end`;
    window.location.href = intent;
  } else {
    // Web fallback - show notification at time
    showNotification(
      'Alarm Set',
      `Alarm set for ${time}${label ? ` - ${label}` : ''}`,
      hours * 60 + minutes
    );
  }
}

// ===== TIMER (Web fallback) =====

export function setTimer(minutes: number, label?: string) {
  const ms = minutes * 60 * 1000;
  
  setTimeout(() => {
    showNotification(
      'Timer Complete!',
      label || `Timer of ${minutes} minutes completed`,
      Date.now()
    );
    vibrateSuccess();
  }, ms);

  showNotification(
    'Timer Set',
    `Timer set for ${minutes} minutes${label ? ` - ${label}` : ''}`,
    Date.now()
  );
}

// ===== AUTO-LISTEN MODE =====

let autoListenEnabled = false;
let autoListenCallbackRef: (() => void) | null = null;

export function enableAutoListen(callback: () => void) {
  autoListenEnabled = true;
  autoListenCallbackRef = callback;
  
  // Auto-listen will be triggered by the TTS onEnd callback
  // in the speakNative function
}

export function disableAutoListen() {
  autoListenEnabled = false;
  autoListenCallbackRef = null;
}

export function isAutoListenEnabled() {
  return autoListenEnabled;
}

export function triggerAutoListen() {
  if (autoListenEnabled && autoListenCallbackRef) {
    autoListenCallbackRef();
  }
}
