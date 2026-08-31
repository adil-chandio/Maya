// ===== INTENT PARSER =====
// Converts natural language voice/text input → structured AutomationCommand
// Supports English + Hinglish (Hindi written in English)

import type { AutomationAction, AutomationCommand } from "./types";
import { isNativePlatform } from "../native/native-bridge";

interface IntentPattern {
  patterns: RegExp[];
  action: AutomationAction;
  extractParams: (match: RegExpMatchArray, input: string) => Record<string, string>;
}

const INTENT_PATTERNS: IntentPattern[] = [
  // === TORCH / FLASHLIGHT (HIGHEST PRIORITY - avoids matching "open website") ===
  {
    patterns: [
      /(?:torch|flashlight|flash)\s+(?:on|off|chalao|chalu|band|bujhao|karo|kar)\b/i,
      /(?:torch|flash|light)\s+(?:on|off)\b/i,
      /(?:torch|flashlight|light)\s+(?:chalao|bujhao|on|off)\b/i,
    ],
    action: "set_torch",
    extractParams: (_m, input) => ({ on: /(on|chalao|chalu|lagao)/.test(input) ? "true" : "false" }),
  },

  // === WIFI ===
  {
    patterns: [
      /wifi\s+(?:on|off|chalu|band)\s*(?:karo|kar|do|de)?\b/i,
      /(?:wifi|wi-fi)\s+(?:chalu|band|on|off)\b/i,
      /wifi\s+(?:kholo|band\s+karo)\b/i,
    ],
    action: "toggle_wifi",
    extractParams: (_m, input) => ({ on: /(on|chalu|chalao)/.test(input) ? "true" : "false" }),
  },

  // === BLUETOOTH ===
  {
    patterns: [
      /bluetooth\s+(?:on|off|chalu|band)\s*(?:karo|kar|do|de)?\b/i,
      /(?:blue\s*tooth)\s+(?:chalu|band|on|off)\b/i,
    ],
    action: "toggle_bluetooth",
    extractParams: (_m, input) => ({ on: /(on|chalu|chalao)/.test(input) ? "true" : "false" }),
  },

  // === SCREENSHOT ===
  {
    patterns: [
      /screenshot\s+(?:lo|le|karo|kar|de|do|le\s+lo|nikalo)/i,
      /(?:take\s+)?(?:a\s+)?(?:screen\s*shot|screen\s+capture)\b/i,
    ],
    action: "take_screenshot",
    extractParams: () => ({}),
  },

  // === DEVICE STATUS / BATTERY ===
  {
    patterns: [
      /(?:device|phone|phone\s+ki)\s+(?:status|info|jaankari|details)\b/i,
      /(?:battery|charge)\s+(?:status|info|check|kitni|kitna|kya|bachi|bachi|hai|level)\b/i,
      /(?:how\s+is\s+my\s+)?battery/i,
    ],
    action: "device_status",
    extractParams: () => ({}),
  },

  // === UI AUTOMATION (tap / type / swipe / scroll / back / home / recents / notifications) ===
  {
    patterns: [
      /(?:click|tap)\s+(?:on\s+)?(.+)/i,
      /(?:click|tap)\s+(?:karo|kar)\s+(.+)/i,
      /type\s+(.+)/i,
      /type\s+(?:karo|kar)\s+(.+)/i,
      /swipe\s+(left|right|up|down)/i,
      /swipe\s+(?:karo|kar)?/i,
      /scroll\s+(up|down|upar|neeche|niche)/i,
      /scroll\s+(?:karo|kar)?/i,
      /^(?:go\s+)?back\b/i,
      /back\s+(?:karo|jao|ja)\b/i,
      /^home(?:screen)?\b/i,
      /home\s+(?:pe\s+)?(?:jao|ja|kholo)\b/i,
      /^(?:recent|recents|recent\s+apps)\b/i,
      /^(?:notification|notif|notification\s+shade)\b/i,
      /(?:notifications?)\s+(?:kholo|khol|open|dikhao)/i,
    ],
    action: "ui_action",
    extractParams: (match, input) => {
      const params: Record<string, string> = {};
      const lower = input.toLowerCase();
      if (/^type\b|type\s+(?:karo|kar)/.test(lower)) {
        params.subtype = "typeText";
        params.text = input.replace(/^type\s+(?:karo|kar)?\s*/i, "").replace(/\s*(?:karo|kar)\s*$/i, "").trim();
        return params;
      }
      if (/swipe/.test(lower)) {
        params.subtype = "swipe";
        params.direction = match[1] || "up";
        return params;
      }
      if (/scroll/.test(lower)) {
        let dir = match[1] || "down";
        if (/upar|niche|neeche/.test(lower)) dir = /upar/.test(lower) ? "up" : "down";
        if (dir === "upar") dir = "up";
        if (dir === "neeche" || dir === "niche") dir = "down";
        params.subtype = "scroll";
        params.direction = dir;
        return params;
      }
      if (/back\b/.test(lower)) {
        params.subtype = "back";
        return params;
      }
      if (/\bhome\b/.test(lower)) {
        params.subtype = "home";
        return params;
      }
      if (/recent/.test(lower)) {
        params.subtype = "recents";
        return params;
      }
      if (/notif|shade/.test(lower)) {
        params.subtype = "notifications";
        return params;
      }
      // Default: tap text
      params.subtype = "tapText";
      params.text = input
        .replace(/^(?:click|tap)\s+(?:on\s+)?(?:karo\s+|kar\s+)?/i, "")
        .replace(/(?:karo|kar)\s*$/i, "")
        .trim();
      return params;
    },
  },

  // === YOUTUBE / MUSIC (CHECK FIRST - HIGHEST PRIORITY) ===
  {
    patterns: [
      // English - direct
      /(?:play|watch)\s+(?:on\s+)?youtube\s+(.+)/i,
      /youtube\s+(?:play|watch)\s+(.+)/i,
      /play\s+(?:video\s+)?(.+)\s+on\s+youtube/i,
      /play\s+(.+?)\s+on\s+youtube/i,
      
      // Hinglish - "youtube pe jao", "yt pe song lagao"
      /(?:youtube|yt)\s+(?:pe|par)\s+(?:jao|ja)/i,
      /(?:youtube|yt)\s+(?:pe|par)\s+(?:gaana|song|video|music)?\s*(?:lagao|laga|chalao|chala|bajao|suno|sunao)/i,
      /(?:youtube|yt)\s+(?:pe|par)\s+(?:dhundho|dhund|khojo|search)\s*(.*)/i,
      /(?:chalo|lao)\s+(?:yaar\s+)?(?:youtube|yt)\s+(?:pe|par)/i,
      
      // Hinglish - "play karo na", "play kar do"
      /play\s+(?:karo|kar|do|de)\s*(na|bhai|yaar)?$/i,
      /(?:tum|tu|aap)\s+(?:ja|jao|jakar|jaakar)\s+(?:play|laga|chalao)\s*(karo|kar|do|de)?\s*(na|bhai|yaar)?$/i,
      
      // Hinglish - "X sunao", "X suno", "X bajao" (VERY COMMON)
      // These must come before the catch-all patterns
      /(.+?)\s+(?:sunao|suno|bajao|baja)\s*(na|bhai|yaar)?$/i,
      /(gaana|song|music|video)\s+(?:suno|sunao|bajao|baja)\s*(na|bhai|yaar)?$/i,
      
      // Hinglish - "laga do", "chala do", "baja do"
      /(.+?)\s+(?:laga|lagao|chalao|chala|bajao|baja)\s+(?:do|de)\s*(na|bhai|yaar)?$/i,
      
      // Hinglish - "play X" (when preceded by context)
      /(?:gaana|song|music)\s+play\s+(.+)/i,
      /play\s+(?:karo\s+)?(.+)/i,
      
      // YouTube search
      /(?:search|find|look)\s+(?:on\s+)?youtube\s+(?:for\s+)?(.+)/i,
      /youtube\s+(?:search|find)\s+(?:for\s+)?(.+)/i,
    ],
    action: "youtube_play",
    extractParams: (_m, input) => {
      let query = input
        // Remove prefixes
        .replace(/^(?:chalo|lao|jao|ja|karo|bajao)\s+(?:yaar\s+)?(?:bhai\s+)?/i, "")
        .replace(/^(?:tum|tu|aap)\s+(?:ja|jao|jakar|jaakar)\s+(?:play|laga|chalao)\s*(?:karo|kar|do|de)?\s*/i, "")
        // Remove youtube/yt references
        .replace(/(?:youtube|yt)\s+(?:pe|par)\s+(?:gaana|song|video|music)?\s*(?:lagao|laga|chalao|chala|bajao|suno|sunao|jao|ja|dhundho|search)?\s*/i, "")
        .replace(/\s+(?:on|pe|par)\s+(?:youtube|yt)\s*/i, "")
        // Remove action verbs
        .replace(/(?:play|laga|lagao|chalao|chala|bajao|baja|suno|sunao|karo|kar)\s*(?:do|de|na|bhai|yaar)?\s*$/i, "")
        // Remove music type references at start
        .replace(/^(?:gaana|song|music|video)\s+(?:play\s+)?/i, "")
        // Remove fillers
        .replace(/mere\s+liye\s+/i, "")
        .replace(/yaar\s+$/gi, "")
        .replace(/bhai\s+$/gi, "")
        .replace(/na\s*$/i, "")
        .trim();
      
      if (!query || query.length < 2) {
        query = "trending songs";
      }
      return { query };
    },
  },

  // === OPEN KNOWN APP (aise apps phone me hi khulne chahiye, website nahi) ===
  {
    patterns: [
      /(?:open|launch|start|kholo)\s+(?:the\s+)?(?:app\s+)?(instagram|whatsapp|whats\s*app|camera|youtube|yt|gmail|maps|spotify|netflix|facebook|telegram|twitter|tiktok|snapchat|chrome|photos|drive|gallery|calculator|settings|phone|dialer|messages|play\s*store)\b/i,
    ],
    action: "open_app",
    extractParams: (_m, input) => {
      const m = input.match(
        /(?:open|launch|start|kholo)\s+(?:the\s+)?(?:app\s+)?(instagram|whatsapp|whats\s*app|camera|youtube|yt|gmail|maps|spotify|netflix|facebook|telegram|twitter|tiktok|snapchat|chrome|photos|drive|gallery|calculator|settings|phone|dialer|messages|play\s*store)\b/i
      );
      return { app: (m?.[1] || "").trim() };
    },
  },

  // === WEBSITE / BROWSER ===
  {
    patterns: [
      // English
      /open\s+(?:the\s+)?(?:website\s+)?(.+)/i,
      /go\s+to\s+(.+)/i,
      /navigate\s+to\s+(.+)/i,
      // Hinglish
      /(?:kholo|khol)\s+(?:yaar\s+)?(?:website\s+)?(.+)/i,
      /(?:jao|ja)\s+(?:na\s+)?(?:yaar\s+)?(?:pe|par)\s+(.+)/i,
    ],
    action: "open_website",
    extractParams: (_m, input) => {
      let target = input
        .replace(/open\s+(?:the\s+)?(?:website\s+)?/i, "")
        .replace(/go\s+to\s+/i, "")
        .replace(/navigate\s+to\s+/i, "")
        .replace(/(?:kholo|khol)\s+(?:yaar\s+)?(?:website\s+)?/i, "")
        .replace(/(?:jao|ja)\s+(?:na\s+)?(?:yaar\s+)?(?:pe|par)\s+/i, "")
        .replace(/yaar\s+/i, "")
        .replace(/bhai\s+/i, "")
        .replace(/mere\s+liye\s+/i, "")
        .trim();
      if (!target.match(/^https?:\/\//i) && !target.includes(".")) {
        return { query: target, url: "" };
      }
      if (!target.match(/^https?:\/\//i)) {
        target = "https://" + target;
      }
      return { url: target, query: "" };
    },
  },

  // === WEB SEARCH ===
  {
    patterns: [
      // English
      /search\s+(?:on\s+)?google\s+(?:for\s+)?(.+)/i,
      /google\s+(?:search\s+)?(?:for\s+)?(.+)/i,
      /look\s+up\s+(.+)/i,
      /find\s+(?:me\s+)?(?:about\s+)?(.+)/i,
      // Hinglish
      /(?:dhundho|dhund|khojo|khoj)\s+(?:na\s+)?(?:yaar\s+)?(.+)/i,
      /google\s+pe\s+(?:dhundho|dhund|search|karo)\s+(?:na\s+)?(?:yaar\s+)?(.+)/i,
    ],
    action: "web_search",
    extractParams: (_m, input) => {
      const query = input
        .replace(/search\s+(?:on\s+)?google\s+(?:for\s+)?/i, "")
        .replace(/google\s+(?:search\s+)?(?:for\s+)?/i, "")
        .replace(/look\s+up\s+/i, "")
        .replace(/find\s+(?:me\s+)?(?:about\s+)?/i, "")
        .replace(/(?:dhundho|dhund|khojo|khoj)\s+(?:na\s+)?(?:yaar\s+)?/i, "")
        .replace(/google\s+pe\s+(?:dhundho|dhund|search|karo)\s+(?:na\s+)?(?:yaar\s+)?/i, "")
        .trim();
      return { query };
    },
  },

  // === PHONE CALLS ===
  {
    patterns: [
      // English
      /call\s+(.+)/i,
      /phone\s+(?:call\s+)?(.+)/i,
      /dial\s+(.+)/i,
      // Hinglish
      /(?:call|phoner)\s+(?:karo|maro)\s+(?:yaar\s+)?(.+)/i,
      /call\s+(?:karo|maro)\s+(?:yaar\s+)?(.+)/i,
    ],
    action: "make_call",
    extractParams: (_m, input) => {
      const contact = input
        .replace(/call\s+(?:karo|maro)?\s*(?:yaar\s+)?/i, "")
        .replace(/phone\s+(?:call\s+)?/i, "")
        .replace(/dial\s+/i, "")
        .replace(/phoner?\s+(?:karo|maro)\s+(?:yaar\s+)?/i, "")
        .trim();
      return { contact, number: "" };
    },
  },

  // === SMS / MESSAGES ===
  {
    patterns: [
      // English
      /send\s+(?:an?\s+)?(?:text\s+)?message\s+to\s+(.+?)(?:\s+(?:saying|that|with message|message|text)\s+(.+))?$/i,
      /text\s+(.+?)(?:\s+(?:saying|that|with|message)\s+(.+))?$/i,
      /sms\s+to\s+(.+?)(?:\s+(?:saying|that|with)\s+(.+))?$/i,
      // Hinglish
      /(?:bhejo|bhej)\s+(?:yaar\s+)?(?:message|sms)\s+(.+?)(?:\s+(?:ki|bol|saying|me)\s+(.+))?$/i,
      /(?:message|sms)\s+(?:bhejo|bhej|karo)\s+(.+?)(?:\s+(?:ki|bol|saying|me)\s+(.+))?$/i,
    ],
    action: "send_sms",
    extractParams: (_m, input) => {
      const match = input.match(
        /(?:send\s+(?:an?\s+)?(?:text\s+)?message\s+to|text|sms\s+to)\s+(.+?)(?:\s+(?:saying|that|with\s*(?:message|text)?)\s+(.+))?$/i
      ) || input.match(
        /(?:bhejo|bhej)\s+(?:yaar\s+)?(?:message|sms)\s+(.+?)(?:\s+(?:ki|bol|saying|me)\s+(.+))?$/i
      ) || input.match(
        /(?:message|sms)\s+(?:bhejo|bhej|karo)\s+(.+?)(?:\s+(?:ki|bol|saying|me)\s+(.+))?$/i
      );
      return {
        contact: (match?.[1] || "").trim(),
        message: (match?.[2] || "").trim(),
      };
    },
  },

  // === WHATSAPP ===
  {
    patterns: [
      // English
      /(?:send|open)\s+whatsapp\s+(?:to\s+)?(.+?)(?:\s+(?:saying|that|with|message)\s+(.+))?$/i,
      /whatsapp\s+(.+?)(?:\s+(?:saying|that|with|message)\s+(.+))?$/i,
      /message\s+(.+?)\s+on\s+whatsapp(?:\s+(?:saying|that|with|message)\s+(.+))?$/i,
      // Hinglish
      /(?:whatsapp|watsapp|wats\s*app)\s+(?:pe|par)\s+(?:message|msg)\s+(?:bhejo|bhej|karo)\s+(.+?)(?:\s+(?:ki|ko|bol|saying|me)\s+(.+))?$/i,
      /(?:bhejo|bhej|karo)\s+(?:yaar\s+)?(?:whatsapp|watsapp|wats\s*app)\s+(?:pe|par)\s+(?:message\s+)?(.+?)(?:\s+(?:ki|ko|bol|saying|me)\s+(.+))?$/i,
      /(?:chalo|jao)\s+(?:whatsapp|watsapp)\s+(?:pe|par)\s+(.+?)(?:\s+(?:ki|ko|bol|saying|me)\s+(.+))?$/i,
      /(?:whatsapp|watsapp)\s+(?:pe|par)\s+(.+?)(?:\s+(?:ko|ki|se|bol)\s+(.+))?$/i,
    ],
    action: "send_whatsapp",
    extractParams: (_m, input) => {
      const match = input.match(
        /(?:send|open)?\s*whatsapp\s+(?:to\s+)?(.+?)(?:\s+(?:saying|that|with|message)\s+(.+))?$/i
      ) || input.match(
        /message\s+(.+?)\s+on\s+whatsapp(?:\s+(?:saying|that|with|message)\s+(.+))?$/i
      ) || input.match(
        /(?:whatsapp|watsapp|wats\s*app)\s+(?:pe|par)\s+(?:message|msg)\s+(?:bhejo|bhej|karo)\s+(.+?)(?:\s+(?:ki|ko|bol|saying|me)\s+(.+))?$/i
      ) || input.match(
        /(?:bhejo|bhej|karo)\s+(?:yaar\s+)?(?:whatsapp|watsapp|wats\s*app)\s+(?:pe|par)\s+(?:message\s+)?(.+?)(?:\s+(?:ki|ko|bol|saying|me)\s+(.+))?$/i
      ) || input.match(
        /(?:whatsapp|watsapp)\s+(?:pe|par)\s+(.+?)(?:\s+(?:ko|ki|se|bol)\s+(.+))?$/i
      );
      return {
        contact: (match?.[1] || "").trim(),
        message: (match?.[2] || "").trim(),
      };
    },
  },

  // === BRIGHTNESS ===
  {
    patterns: [
      /(?:set|increase|decrease|raise|lower|turn|dim)\s+(?:the\s+)?brightness\s*(?:to\s+)?(\d+)?\s*%?/i,
      /brightness\s+(?:to\s+)?(\d+)\s*%?/i,
    ],
    action: "set_brightness",
    extractParams: (_m, input) => {
      const match = input.match(/(\d+)/);
      const value = match?.[1] || "";
      let level = "50";
      if (input.match(/increase|raise|up|higher|more/i)) level = "80";
      else if (input.match(/decrease|lower|dim|down|less/i)) level = "20";
      else if (value) level = value;
      return { level };
    },
  },

  // === VOLUME ===
  {
    patterns: [
      /(?:set|increase|decrease|raise|lower|turn)\s+(?:the\s+)?volume\s*(?:to\s+)?(\d+)?\s*%?/i,
      /volume\s+(?:to\s+)?(\d+)\s*%?/i,
      /(?:mute|unmute|silent|silence)\s*(?:the\s+)?(?:phone|device|volume)?/i,
    ],
    action: "set_volume",
    extractParams: (_m, input) => {
      const match = input.match(/(\d+)/);
      let level = "50";
      if (input.match(/mute|silent|silence/i)) level = "0";
      else if (input.match(/unmute/i)) level = "80";
      else if (input.match(/increase|raise|up|higher|more/i)) level = "80";
      else if (input.match(/decrease|lower|down|less/i)) level = "20";
      else if (match?.[1]) level = match[1];
      return { level };
    },
  },

  // === OPEN APP ===
  {
    patterns: [
      // English
      /open\s+(?:the\s+)?(?:app\s+)?(.+)/i,
      /launch\s+(.+)/i,
      /start\s+(.+)/i,
      // Hinglish
      /(?:kholo|khol)\s+(?:yaar\s+)?(?:app\s+)?(.+)/i,
    ],
    action: "open_app",
    extractParams: (_m, input) => {
      const app = input
        .replace(/open\s+(?:the\s+)?(?:app\s+)?/i, "")
        .replace(/launch\s+/i, "")
        .replace(/start\s+/i, "")
        .replace(/(?:kholo|khol)\s+(?:yaar\s+)?(?:app\s+)?/i, "")
        .replace(/yaar\s+/i, "")
        .trim();
      return { app };
    },
  },

  // === GOOGLE MAPS ===
  {
    patterns: [
      /(?:open\s+)?(?:google\s+)?maps\s+(?:to|for|near|show)\s+(.+)/i,
      /show\s+(?:me\s+)?(?:the\s+)?(?:directions?\s+)?(?:to|from)\s+(.+)/i,
      /(?:find|locate|navigate)\s+(.+?)\s+(?:on\s+)?(?:google\s+)?maps/i,
    ],
    action: "open_google_maps",
    extractParams: (_m, input) => {
      const query = input
        .replace(/(?:open\s+)?(?:google\s+)?maps\s+(?:to|for|near|show)\s+/i, "")
        .replace(/show\s+(?:me\s+)?(?:the\s+)?(?:directions?\s+)?(?:to|from)\s+/i, "")
        .replace(/(?:find|locate|navigate)\s+/i, "")
        .replace(/\s+on\s+(?:google\s+)?maps\s*/i, "")
        .trim();
      return { query };
    },
  },

  // === SET ALARM ===
  {
    patterns: [
      /set\s+(?:an?\s+)?alarm\s+(?:for\s+)?(\d{1,2}(?::\d{2})?)\s*(am|pm)?/i,
      /(?:wake|alarm)\s+(?:me\s+)?(?:at\s+)?(\d{1,2}(?::\d{2})?)\s*(am|pm)?/i,
    ],
    action: "set_alarm",
    extractParams: (_m, input) => {
      const match = input.match(/(\d{1,2}(?::\d{2})?)\s*(am|pm)?/i);
      return {
        time: match?.[1] || "",
        period: match?.[2] || "",
      };
    },
  },

  // === SHARE ===
  {
    patterns: [
      /share\s+(.+)/i,
    ],
    action: "share_text",
    extractParams: (_m, input) => {
      const text = input.replace(/share\s+/i, "").trim();
      return { text };
    },
  },
];

// ===== NORMALIZE INPUT =====
// Clean up common Hinglish filler words before matching
// IMPORTANT: Don't remove action words like sunao, play, kholo, etc.

function normalizeInput(input: string): string {
  return input
    .replace(/\b(bhai|yaar|dude|boss|sir|ji|please|pls|plz)\b/gi, "")
    .replace(/\b(kya|kya\s+tu|tujhe|mujhe)\b/gi, "")
    .replace(/\b(mera|mere|meri|tera|tere|teri|uska|unka)\b/gi, "")
    .replace(/\b(liye|ke\s+liye|ke\s+liyae|ka|ke|ki|se|mein|me)\b/gi, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

// ===== PARSER FUNCTION =====

export function parseIntent(input: string): AutomationCommand | null {
  // Try original input first (more reliable for exact matches)
  const trimmed = input.trim();
  const lower = trimmed.toLowerCase();
  
  // Try original lowercase input first
  for (const intent of INTENT_PATTERNS) {
    for (const pattern of intent.patterns) {
      const match = lower.match(pattern);
      if (match) {
        return {
          action: intent.action,
          params: intent.extractParams(match, lower),
          rawInput: trimmed,
        };
      }
    }
  }

  // Try normalized input as fallback
  const normalized = normalizeInput(lower);
  if (normalized !== lower) {
    for (const intent of INTENT_PATTERNS) {
      for (const pattern of intent.patterns) {
        const match = normalized.match(pattern);
        if (match) {
          return {
            action: intent.action,
            params: intent.extractParams(match, normalized),
            rawInput: trimmed,
          };
        }
      }
    }
  }

  return null;
}

// ===== CHECK IF INPUT IS AN AUTOMATION COMMAND =====

export function isAutomationCommand(input: string): boolean {
  return parseIntent(input) !== null;
}

// ===== GET ALL CAPABILITIES =====

export function getCapabilities() {
  const native = isNativePlatform();
  return [
    {
      name: "YouTube / Music",
      description: "Play songs, videos on YouTube",
      examples: ["romantic songs sunao", "play karo na", "youtube pe jao"],
      available: true,
      icon: "📺",
    },
    {
      name: "Open Website",
      description: "Open any website or URL in browser",
      examples: ["open youtube.com", "go to google.com"],
      available: true,
      icon: "🌐",
    },
    {
      name: "Web Search",
      description: "Search on Google",
      examples: ["search for React tutorials", "google latest news"],
      available: true,
      icon: "🔍",
    },
    {
      name: "Phone Call",
      description: "Make a phone call",
      examples: ["call mom", "dial 1234567890", "call karo bhai"],
      available: true,
      icon: "📞",
    },
    {
      name: "SMS",
      description: "Send a text message",
      examples: ["text John saying hi", "message bhejo Mom ko"],
      available: true,
      icon: "💬",
    },
    {
      name: "WhatsApp",
      description: "Send WhatsApp message",
      examples: ["whatsapp John saying hello", "whatsapp pe message karo Kumail ko"],
      available: true,
      icon: "📱",
    },
    {
      name: "Volume",
      description: "Control device volume (Maya native)",
      examples: ["volume to 80", "mute volume", "volume badhao"],
      available: native,
      icon: "🔊",
    },
    {
      name: "Brightness",
      description: "Control screen brightness (Write Settings permission se)",
      examples: ["set brightness to 50", "increase brightness"],
      available: native,
      icon: "🔆",
    },
    {
      name: "Torch / Flashlight",
      description: "On/off flashlight directly",
      examples: ["torch on", "flash off karo"],
      available: native,
      icon: "🔦",
    },
    {
      name: "WiFi / Bluetooth",
      description: "Toggle WiFi & Bluetooth (Android 10+ par settings khulti hai)",
      examples: ["wifi off", "bluetooth chalu karo"],
      available: native,
      icon: "📶",
    },
    {
      name: "Device Status",
      description: "Battery, model, OS info",
      examples: ["battery kitni hai", "phone status", "device info"],
      available: native,
      icon: "🔋",
    },
    {
      name: "Screenshot",
      description: "Screen capture (Android 11+)",
      examples: ["screenshot lo", "take screenshot"],
      available: native,
      icon: "📸",
    },
    {
      name: "Screen Control (UI Automation)",
      description: "Tap, type, swipe, back, home, recents — kisi bhi app me",
      examples: ["tap send", "swipe up", "type hello", "click search", "scroll down", "go back"],
      available: native,
      icon: "🕹️",
    },
    {
      name: "Open App",
      description: "Launch any installed app by name",
      examples: ["open camera", "launch instagram", "kholo whatsapp"],
      available: native,
      icon: "📲",
    },
    {
      name: "Google Maps",
      description: "Open location on Google Maps",
      examples: ["maps to New Delhi", "navigate to nearest cafe"],
      available: true,
      icon: "🗺️",
    },
    {
      name: "Set Alarm",
      description: "Set an alarm on your device",
      examples: ["set alarm for 7am", "wake me at 6:30"],
      available: native,
      icon: "⏰",
    },
    {
      name: "Share",
      description: "Share text content",
      examples: ["share this link", "share this message"],
      available: true,
      icon: "📤",
    },
  ];
}
