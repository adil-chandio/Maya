// ===== AUTOMATION ROUTER =====
// Central dispatcher: intent → correct bridge → execute → return result

import type { AutomationResult } from "./types";
import { parseIntent } from "./intent-parser";
import { executeWebCommand } from "./web-bridge";
import { executePhoneCommand } from "./phone-bridge";

// Web-based actions that go through web-bridge
const WEB_ACTIONS = new Set([
  "open_website",
  "web_search",
  "youtube_search",
  "youtube_play",
  "open_google_maps",
  "open_app",
  "set_alarm",
  "share_text",
]);

// Phone-based actions that go through phone-bridge
const PHONE_ACTIONS = new Set([
  "make_call",
  "send_sms",
  "send_whatsapp",
  "set_brightness",
  "set_volume",
]);

// ===== MAIN EXECUTE FUNCTION =====

export function executeAutomation(input: string): AutomationResult | null {
  const command = parseIntent(input);
  if (!command) return null;

  let result: AutomationResult;

  if (WEB_ACTIONS.has(command.action)) {
    result = executeWebCommand(command);
  } else if (PHONE_ACTIONS.has(command.action)) {
    result = executePhoneCommand(command);
  } else {
    result = {
      success: false,
      message: `I don't know how to handle "${command.action}" yet.`,
      action: command.action,
      executedAt: Date.now(),
    };
  }

  // Store in history
  storeAutomationResult(result);

  return result;
}

// ===== ACTION FORMAT FOR AI RESPONSE =====

export function formatActionResult(result: AutomationResult): string {
  if (result.success) {
    return `✅ Done! ${result.message}`;
  }
  return `⚠️ ${result.message}`;
}

// ===== HISTORY =====

function storeAutomationResult(result: AutomationResult) {
  try {
    const history = JSON.parse(localStorage.getItem("maya_automation_history") || "[]");
    history.unshift(result);
    // Keep last 50
    if (history.length > 50) history.length = 50;
    localStorage.setItem("maya_automation_history", JSON.stringify(history));
  } catch { /* ignore */ }
}

export function getAutomationHistory(): AutomationResult[] {
  try {
    return JSON.parse(localStorage.getItem("maya_automation_history") || "[]");
  } catch {
    return [];
  }
}

// ===== RE-EXPORTS =====

export { isAutomationCommand, getCapabilities } from "./intent-parser";
export { saveContact } from "./phone-bridge";
export type { AutomationCommand, AutomationResult, AutomationAction } from "./types";
