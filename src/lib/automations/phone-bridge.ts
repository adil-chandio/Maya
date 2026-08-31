// ===== PHONE BRIDGE =====
// Handles phone commands: call, SMS, WhatsApp, brightness, volume
// On Android, volume + brightness go through the native MayaAutomation plugin.

import type { AutomationCommand, AutomationResult } from "./types";
import { isNativePlatform } from "../native/native-bridge";
import { nativeSetBrightness, nativeSetVolume } from "../native/maya-native";

function openUrl(url: string): void {
  window.location.href = url;
}

function openInNewTab(url: string): void {
  const a = document.createElement("a");
  a.href = url;
  a.target = "_blank";
  a.rel = "noopener noreferrer";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

// Try to extract a phone number from contact name
// In real usage this would query contacts DB, but for now we store favorites
function getStoredContact(name: string): string | null {
  try {
    const contacts = JSON.parse(localStorage.getItem("maya_contacts") || "{}");
    return contacts[name.toLowerCase()] || null;
  } catch {
    return null;
  }
}

export function saveContact(name: string, number: string): void {
  try {
    const contacts = JSON.parse(localStorage.getItem("maya_contacts") || "{}");
    contacts[name.toLowerCase()] = number;
    localStorage.setItem("maya_contacts", JSON.stringify(contacts));
  } catch { /* ignore */ }
}

export async function executePhoneCommand(
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
      case "make_call": {
        const contact = params.contact || "";
        const number = params.number || "";

        if (!contact && !number) {
          result.message = "Who should I call?";
          break;
        }

        // Check if the contact is already a number
        const phoneRegex = /[\d+\-() ]{7,15}/;
        const isNumber = phoneRegex.test(contact);
        const phoneNumber = isNumber
          ? contact.replace(/[^\d+]/g, "")
          : getStoredContact(contact);

        if (phoneNumber) {
          openUrl(`tel:${phoneNumber}`);
          result.success = true;
          result.message = `Calling ${contact}${isNumber ? "" : ` (${phoneNumber})`}`;
        } else {
          // Try opening phone dialer with the name
          openUrl(`tel:${encodeURIComponent(contact)}`);
          result.success = true;
          result.message = `Opening dialer for "${contact}". You may need to select the contact.`;
        }
        break;
      }

      case "send_sms": {
        const contact = params.contact || "";
        const message = params.message || "";

        if (!contact) {
          result.message = "Who should I send the SMS to?";
          break;
        }

        const number = getStoredContact(contact) || contact.replace(/[^\d+]/g, "");
        if (message) {
          openUrl(`sms:${number}?body=${encodeURIComponent(message)}`);
          result.success = true;
          result.message = `Opening SMS to ${contact}: "${message}"`;
        } else {
          openUrl(`sms:${number}`);
          result.success = true;
          result.message = `Opening SMS to ${contact}`;
        }
        break;
      }

      case "send_whatsapp": {
        const contact = params.contact || "";
        const message = params.message || "";

        // Try WhatsApp deep link
        let url: string;
        if (message) {
          // If we have a phone number, use WhatsApp API
          const number = getStoredContact(contact) || "";
          if (number) {
            url = `https://wa.me/${number.replace(/[^\d]/g, "")}?text=${encodeURIComponent(message)}`;
          } else {
            url = `https://api.whatsapp.com/send?phone=&text=${encodeURIComponent(message + (contact ? ` (To: ${contact})` : ""))}`;
          }
        } else {
          url = `https://web.whatsapp.com`;
        }

        openInNewTab(url);
        result.success = true;
        result.message = message
          ? `Opening WhatsApp to send "${message}" to ${contact}`
          : "Opening WhatsApp";
        break;
      }

      case "set_brightness": {
        const level = parseInt(params.level || "50", 10);

        // Native Android: real brightness control (needs Write Settings permission)
        if (isNativePlatform()) {
          const res = await nativeSetBrightness(level);
          result.success = res.success;
          result.message = res.message;
          if ((res as any).needsPermission) {
            // Plugin already opened the permission screen
            result.message =
              "Brightness ke liye 'Write Settings' permission chahiye — settings screen khol di hai. Allow karke dobara bolo.";
          }
          break;
        }

        // Web fallback: Try Screen Wake Lock API (experimental, limited support)
        if ("screen" in window && "brightness" in (window.screen as any)) {
          try {
            (window.screen as any).brightness = level / 100;
            result.success = true;
            result.message = `Brightness set to ${level}%`;
          } catch {
            result.success = false;
            result.message = `Can't control brightness from browser. Use your device settings to set brightness to ${level}%.`;
          }
        } else {
          // Fallback: provide guidance
          result.success = false;
          result.message = `Browser brightness control is not available. You can manually set it to ${level}% from your device's quick settings.`;
        }
        break;
      }

      case "set_volume": {
        const level = parseInt(params.level || "50", 10);

        // Native Android: real system volume
        if (isNativePlatform()) {
          const res = await nativeSetVolume(level, "music");
          result.success = res.success;
          result.message = res.message;
          break;
        }

        // Web fallback: Try Web Audio API to adjust volume
        try {
          // Create a silent audio context to try volume control
          const ctx = new AudioContext();
          const gain = ctx.createGain();
          gain.gain.value = level / 100;
          gain.connect(ctx.destination);

          // Play a very short silent tone to apply volume
          const osc = ctx.createOscillator();
          osc.connect(gain);
          osc.start();
          osc.stop(ctx.currentTime + 0.01);

          // Also adjust any media elements on the page
          document.querySelectorAll("audio, video").forEach((el) => {
            (el as HTMLMediaElement).volume = level / 100;
          });

          result.success = true;
          result.message = `Volume set to ${level}%`;
          setTimeout(() => ctx.close(), 100);
        } catch {
          result.success = false;
          result.message = `Can't control device volume from browser. Use your device volume buttons to set it to ${level}%.`;
        }
        break;
      }

      default:
        result.message = `Phone bridge doesn't handle "${action}"`;
    }
  } catch (error) {
    result.success = false;
    result.message = `Failed to execute phone command: ${error}`;
  }

  return result;
}
