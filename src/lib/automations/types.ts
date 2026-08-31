// ===== AUTOMATION COMMAND TYPES =====

export type AutomationAction =
  | "open_website"
  | "web_search"
  | "youtube_search"
  | "youtube_play"
  | "make_call"
  | "send_sms"
  | "send_whatsapp"
  | "open_app"
  | "set_brightness"
  | "set_volume"
  | "open_google_maps"
  | "set_alarm"
  | "share_text"
  | "set_torch"
  | "toggle_wifi"
  | "toggle_bluetooth"
  | "device_status"
  | "take_screenshot"
  | "ui_action";

export interface AutomationCommand {
  action: AutomationAction;
  params: Record<string, string>;
  rawInput: string;
}

export interface AutomationResult {
  success: boolean;
  message: string;
  action: AutomationAction;
  executedAt: number;
}

export interface AutomationCapability {
  name: string;
  description: string;
  examples: string[];
  available: boolean;
  icon: string;
}

export interface AutomationConfig {
  enabled: boolean;
  safeMode: boolean; // Ask before executing dangerous actions (calls, SMS)
  history: AutomationResult[];
}
