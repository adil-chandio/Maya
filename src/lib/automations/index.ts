// ===== AUTOMATION ROUTER =====
// Central dispatcher: intent → correct bridge → execute → return result

import type { AutomationResult, AutomationAction, AutomationCommand } from "./types";
import { parseIntent } from "./intent-parser";
import { executeWebCommand } from "./web-bridge";
import { executePhoneCommand } from "./phone-bridge";
import { executeNativeAction } from "./native-actions";

// Native-only actions (device control / UI automation)
const NATIVE_ACTIONS = new Set([
  "set_torch",
  "toggle_wifi",
  "toggle_bluetooth",
  "device_status",
  "take_screenshot",
  "ui_action",
  "read_notifications",
]);

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

export async function executeAutomation(input: string): Promise<AutomationResult | null> {
  const command = parseIntent(input);
  if (!command) return null;

  let result: AutomationResult;

  if (NATIVE_ACTIONS.has(command.action)) {
    result = await executeNativeAction(command);
  } else if (WEB_ACTIONS.has(command.action)) {
    result = await executeWebCommand(command);
  } else if (PHONE_ACTIONS.has(command.action)) {
    result = await executePhoneCommand(command);
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

// ===== DIRECT TOOL EXECUTION (LLM tool-calling ke liye) =====
// LLM JSON dega: { tool: "open_app", params: {...} } → hum direct execute karte hain
const TOOL_TO_ACTION: Record<string, AutomationAction> = {
  open_app: "open_app",
  youtube_play: "youtube_play",
  youtube_search: "youtube_search",
  open_website: "open_website",
  web_search: "web_search",
  make_call: "make_call",
  send_whatsapp: "send_whatsapp",
  send_sms: "send_sms",
  set_alarm: "set_alarm",
  set_torch: "set_torch",
  set_volume: "set_volume",
  set_brightness: "set_brightness",
  take_screenshot: "take_screenshot",
  device_status: "device_status",
  ui_action: "ui_action",
  read_notifications: "read_notifications",
  open_google_maps: "open_google_maps",
};

export async function executeDirectTool(
  tool: string,
  params: Record<string, any>
): Promise<AutomationResult | null> {
  const action = TOOL_TO_ACTION[tool];
  if (!action) return null;

  let command: AutomationCommand;
  if (action === "set_alarm") {
    // params: { time: "7:30 am" } → hours/minutes
    const t = String(params.time || "7:00").toLowerCase().trim();
    const m = t.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/);
    if (!m) return null;
    let hours = parseInt(m[1], 10);
    const minutes = parseInt(m[2] || "0", 10);
    const period = m[3] || "";
    if (period === "pm" && hours < 12) hours += 12;
    if (period === "am" && hours === 12) hours = 0;
    command = { action, params: { time: `${hours}:${minutes}` }, rawInput: String(params.time || "") };
  } else {
    command = { action, params: Object.fromEntries(Object.entries(params).map(([k, v]) => [k, String(v)])), rawInput: String(params.rawInput || "") };
  }

  let result: AutomationResult;
  if (NATIVE_ACTIONS.has(action)) {
    result = await executeNativeAction(command);
  } else if (WEB_ACTIONS.has(action)) {
    result = await executeWebCommand(command);
  } else if (PHONE_ACTIONS.has(action)) {
    result = await executePhoneCommand(command);
  } else {
    result = { success: false, message: `Unknown tool: ${tool}`, action, executedAt: Date.now() };
  }
  storeAutomationResult(result);
  return result;
}

// ===== RE-EXPORTS =====

export { isAutomationCommand, getCapabilities } from "./intent-parser";
export { saveContact } from "./phone-bridge";
export type { AutomationCommand, AutomationResult, AutomationAction } from "./types";
