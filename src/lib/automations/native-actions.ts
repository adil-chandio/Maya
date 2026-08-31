// ===== NATIVE ACTIONS =====
// Executes device-control automations that need the native Android plugins:
// torch, wifi, bluetooth, device status, screenshot, UI automation.

import type { AutomationCommand, AutomationResult } from "./types";
import {
  nativeGetDeviceInfo,
  nativeSetTorch,
  nativeToggleWifi,
  nativeToggleBluetooth,
  nativeTakeScreenshot,
  nativeUiCommand,
} from "../native/maya-native";

export async function executeNativeAction(
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
      case "set_torch": {
        const on = params.on === "true" || params.on === "1";
        const res = await nativeSetTorch(on);
        result.success = res.success;
        result.message = res.message;
        break;
      }

      case "toggle_wifi": {
        const on = params.on === "true" || params.on === "1";
        const res = await nativeToggleWifi(on);
        result.success = res.success;
        result.message = res.message;
        break;
      }

      case "toggle_bluetooth": {
        const on = params.on === "true" || params.on === "1";
        const res = await nativeToggleBluetooth(on);
        result.success = res.success;
        result.message = res.message;
        break;
      }

      case "device_status": {
        const info = await nativeGetDeviceInfo();
        if (!info) {
          result.message =
            "Device status sirf Android app me available hai (web mode nahi).";
          break;
        }
        const battery = info.battery >= 0 ? `${info.battery}%` : "unknown";
        result.success = true;
        result.message = `📱 ${info.manufacturer} ${info.model}\n🤖 Android ${info.androidVersion} (${info.sdkInt})\n🔋 Battery: ${battery}${info.charging ? " (charging ⚡)" : ""}\n🛡️ Write Settings: ${info.canWriteSettings ? "✓" : "✗"} • Accessibility: ${info.accessibilityEnabled ? "✓" : "✗"}`;
        break;
      }

      case "take_screenshot": {
        const res = await nativeTakeScreenshot(720, 70);
        result.success = res.success;
        result.message = res.message;
        if (res.success && res.data) {
          result.message = "📸 Screenshot le liya!";
          // Store data URL so UI can show it if it wants
          (result as any).dataUrl = res.data;
        }
        break;
      }

      case "ui_action": {
        const subtype = params.subtype || "tapText";

        if (subtype === "tapText") {
          const res = await nativeUiCommand("tapText", { text: params.text || "" });
          result.success = res.success;
          result.message = res.message;
          break;
        }
        if (subtype === "typeText") {
          const res = await nativeUiCommand("typeText", { text: params.text || "" });
          result.success = res.success;
          result.message = res.message;
          break;
        }
        if (subtype === "swipe") {
          const res = await nativeUiCommand("swipe", {
            direction: params.direction || "up",
          });
          result.success = res.success;
          result.message = res.message;
          break;
        }
        if (subtype === "scroll") {
          const res = await nativeUiCommand("scroll", {
            direction: params.direction || "down",
          });
          result.success = res.success;
          result.message = res.message;
          break;
        }
        if (subtype === "back") {
          const res = await nativeUiCommand("back");
          result.success = res.success;
          result.message = "⬅️ Back pressed";
          break;
        }
        if (subtype === "home") {
          const res = await nativeUiCommand("home");
          result.success = res.success;
          result.message = "🏠 Home screen par aa gaye";
          break;
        }
        if (subtype === "recents") {
          const res = await nativeUiCommand("recents");
          result.success = res.success;
          result.message = "🗂️ Recents open kiye";
          break;
        }
        if (subtype === "notifications") {
          const res = await nativeUiCommand("notifications");
          result.success = res.success;
          result.message = "🔔 Notification shade khol di";
          break;
        }

        if (subtype === "waitForText") {
          const res = await nativeUiCommand("waitForText", {
            text: params.text || "",
            timeoutMs: params.timeoutMs || 8000,
            tap: params.tap !== "false",
          });
          result.success = res.success;
          result.message = res.message;
          break;
        }
        if (subtype === "readScreen") {
          const res = await nativeUiCommand("readScreen", {
            maxLength: 3000,
          });
          result.success = res.success;
          result.message = res.message;
          (result as any).screenText = (res as any).text || "";
          break;
        }

        result.message = `UI action "${subtype}" abhi support nahi hai.`;
        break;
      }

      default:
        result.message = `Native bridge doesn't handle "${action}"`;
    }
  } catch (error: any) {
    result.success = false;
    result.message = `Failed to execute: ${error?.message || error}`;
  }

  return result;
}
