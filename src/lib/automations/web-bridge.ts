// ===== WEB BRIDGE =====
// Handles browser-based automation: open sites, search, YouTube, Maps, etc.
// Uses native bridge when running on Android for better integration

import type { AutomationCommand, AutomationResult } from "./types";
import { isNativePlatform, openExternalUrl, openYouTube, openGoogleMaps } from "../native/native-bridge";
import { nativeLaunchApp, nativeSetAlarm, nativeOpenYouTubeSearch, nativeUiCommand } from "../native/maya-native";

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const YOUTUBE_SEARCH_URL = "https://www.youtube.com/results?search_query=";
const GOOGLE_SEARCH_URL = "https://www.google.com/search?q=";
const GOOGLE_MAPS_URL = "https://www.google.com/maps/search/";

// Known app → deep link mapping
const APP_LINKS: Record<string, string> = {
  youtube: "https://www.youtube.com",
  gmail: "https://mail.google.com",
  maps: "https://www.google.com/maps",
  drive: "https://drive.google.com",
  docs: "https://docs.google.com",
  photos: "https://photos.google.com",
  calendar: "https://calendar.google.com",
  meet: "https://meet.google.com",
  chat: "https://chat.google.com",
  keep: "https://keep.google.com",
  news: "https://news.google.com",
  translate: "https://translate.google.com",
  twitter: "https://twitter.com",
  x: "https://x.com",
  instagram: "https://www.instagram.com",
  facebook: "https://www.facebook.com",
  reddit: "https://www.reddit.com",
  linkedin: "https://www.linkedin.com",
  tiktok: "https://www.tiktok.com",
  pinterest: "https://www.pinterest.com",
  netflix: "https://www.netflix.com",
  spotify: "https://open.spotify.com",
  amazon: "https://www.amazon.in",
  flipkart: "https://www.flipkart.com",
  chrome: "https://www.google.com",
  google: "https://www.google.com",
  telegram: "https://web.telegram.org",
  whatsapp: "https://web.whatsapp.com",
  discord: "https://discord.com/app",
  slack: "https://slack.com/signin",
  notion: "https://www.notion.so",
  github: "https://github.com",
};

function openUrl(url: string, target = "_blank"): void {
  // Use native bridge on Android for better integration
  if (isNativePlatform()) {
    openExternalUrl(url);
    return;
  }
  
  // Web fallback
  const a = document.createElement("a");
  a.href = url;
  a.target = target;
  a.rel = "noopener noreferrer";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

function cleanUrl(url: string): string {
  // Remove trailing punctuation that might be part of the sentence
  return url.replace(/[.,!?;:]+$/, "").trim();
}

export async function executeWebCommand(
  command: AutomationCommand
): Promise<AutomationResult> {
  const { action, params } = command;
  const result: AutomationResult = {
    success: false,
    message: "",
    action,
    executedAt: Date.now(),
  };

  try {
    switch (action) {
      case "open_website": {
        const url = params.url ? cleanUrl(params.url) : "";
        const query = params.query || "";
        if (url) {
          openUrl(url);
          result.success = true;
          result.message = `Opening ${url}`;
        } else if (query) {
          // Search for it on Google
          openUrl(`${GOOGLE_SEARCH_URL}${encodeURIComponent(query)}`);
          result.success = true;
          result.message = `Searching Google for "${query}"`;
        } else {
          result.message = "What website should I open?";
        }
        break;
      }

      case "web_search": {
        const query = params.query || "";
        if (!query) {
          result.message = "What should I search for?";
          break;
        }
        openUrl(`${GOOGLE_SEARCH_URL}${encodeURIComponent(query)}`);
        result.success = true;
        result.message = `Searching Google for "${query}"`;
        break;
      }

      case "youtube_search": {
        const query = params.query || "";
        if (!query) {
          openUrl("https://www.youtube.com");
          result.success = true;
          result.message = "Opening YouTube";
          break;
        }
        openUrl(`${YOUTUBE_SEARCH_URL}${encodeURIComponent(query)}`);
        result.success = true;
        result.message = `Searching YouTube for "${query}"`;
        break;
      }

      case "youtube_play": {
        const query = params.query || "";
        if (!query) {
          if (isNativePlatform()) {
            openYouTube();
          } else {
            openUrl("https://www.youtube.com");
          }
          result.success = true;
          result.message = "Opening YouTube";
          break;
        }
        if (isNativePlatform()) {
          // NATIVE FLOW: YouTube APP me search kholo → pehli video auto-tap (sach mein song chalta hai!)
          const res = await nativeOpenYouTubeSearch(query);
          if (res.success) {
            // Results load hone do (YouTube app thoda slow hai mobile par)
            await delay(3500);
            // 4 baar try karo — kabhi kabhi pehli baar layout ready nahi hota
            let played = false;
            for (let attempt = 0; attempt < 4 && !played; attempt++) {
              const play = await nativeUiCommand("playFirstResult", { timeoutMs: 6000 });
              if (play.success) {
                played = true;
                break;
              }
              await delay(1200);
            }
            result.success = true;
            result.message = played
              ? `"${query}" YouTube app me play ho rahi hai 🎵`
              : `YouTube app me "${query}" search khul gaya — video par tap kar do 🎵`;
          } else {
            result.success = false;
            result.message = res.message;
          }
        } else {
          openUrl(`${YOUTUBE_SEARCH_URL}${encodeURIComponent(query)}`);
          result.success = true;
          result.message = `Playing "${query}" on YouTube`;
        }
        break;
      }

      case "open_google_maps": {
        const query = params.query || "";
        if (!query) {
          if (isNativePlatform()) {
            openGoogleMaps("");
          } else {
            openUrl("https://www.google.com/maps");
          }
          result.success = true;
          result.message = "Opening Google Maps";
          break;
        }
        if (isNativePlatform()) {
          openGoogleMaps(query);
        } else {
          openUrl(`${GOOGLE_MAPS_URL}${encodeURIComponent(query)}`);
        }
        result.success = true;
        result.message = `Opening maps for "${query}"`;
        break;
      }

      case "open_app": {
        const appName = params.app?.toLowerCase().trim() || "";
        if (!appName) {
          result.message = "Which app should I open?";
          break;
        }
        // Native Android: launch the real installed app by name
        if (isNativePlatform()) {
          const res = await nativeLaunchApp(params.app?.trim());
          result.success = res.success;
          result.message = res.message;
          // "open instagram and scroll reels" → app kholo + swipe karo
          if (res.success && params.autoScroll === "true") {
            await delay(1600);
            for (let i = 0; i < 3; i++) {
              await nativeUiCommand("swipe", { direction: "up" });
              await delay(800);
            }
            result.message = `App khol diya aur ${params.app} me scroll bhi kar diya 👇`;
          }
          break;
        }
        // Web fallback: Check known apps first
        const directUrl = APP_LINKS[appName];
        if (directUrl) {
          openUrl(directUrl);
          result.success = true;
          result.message = `Opening ${appName}`;
          break;
        }
        // Try intent URL for Android
        try {
          window.open(`intent://${appName}#Intent;end`, "_blank");
          result.success = true;
          result.message = `Launching ${appName}`;
        } catch {
          // Fallback: search for it
          openUrl(`${GOOGLE_SEARCH_URL}${encodeURIComponent(appName)}`);
          result.success = true;
          result.message = `Can't launch ${appName} directly. Opening search instead.`;
        }
        break;
      }

      case "set_alarm": {
        const time = params.time || "";
        const period = params.period || "";
        if (!time) {
          result.message = "What time should I set the alarm for?";
          break;
        }
        // Convert to 24h format if period is specified
        let [hours, minutes] = time.split(":").map(Number);
        if (period?.toLowerCase() === "pm" && hours < 12) hours += 12;
        if (period?.toLowerCase() === "am" && hours === 12) hours = 0;
        
        if (isNativePlatform()) {
          // Native Android: system AlarmClock API (Google Clock)
          const res = await nativeSetAlarm(hours || 0, minutes || 0, params.label || "");
          result.success = res.success;
          result.message = res.message;
          break;
        } else {
          // Web fallback
          openUrl(`https://www.google.com/search?q=set+alarm+for+${encodeURIComponent(time + (period || ""))}`);
        }
        result.success = true;
        result.message = `Setting alarm for ${time}${period || ""}`;
        break;
      }

      case "share_text": {
        const text = params.text || "";
        if (navigator.share) {
          navigator.share({ text }).catch(() => {});
          result.success = true;
          result.message = `Sharing text`;
        } else {
          // Fallback: copy to clipboard
          navigator.clipboard.writeText(text).catch(() => {});
          result.success = true;
          result.message = `Copied to clipboard (sharing not supported on this browser)`;
        }
        break;
      }

      default:
        result.message = `Web bridge doesn't handle "${action}"`;
    }
  } catch (error) {
    result.success = false;
    result.message = `Failed to execute: ${error}`;
  }

  return result;
}
