// ===== SCREEN VISION =====
// Video jaisa feature: "Look at my screen" / "screen par kya hai" / "screenshot karke batao"
// → native screenshot lo → Gemini vision model ko bhejo → Maya screen ki asli samajh ke saath jawab de.

import { nativeTakeScreenshot } from "../native/maya-native";

// Gemini vision model (API key localStorage se aati hai — Settings me dali hui)
const GEMINI_MODEL = "gemini-2.5-flash";

function getGeminiKey(): string {
  try {
    const raw = localStorage.getItem("maya_provider_settings");
    if (!raw) return "";
    const parsed = JSON.parse(raw);
    return parsed?.keys?.gemini || parsed?.geminiKey || "";
  } catch {
    return "";
  }
}

export function isScreenVisionCommand(input: string): boolean {
  const s = input.toLowerCase().trim();
  return (
    /look\s+at\s+my\s+screen/i.test(s) ||
    /(?:screen|display)\s+(?:par|pe|me|se)\s+(?:kya|kyu|kaise|kuch|dikha|dikh)/i.test(s) ||
    /screenshot\s+(?:karke|dekh|bata)/i.test(s) ||
    /screen\s+(?:read|dekh|dikhao|kya\s+hai)/i.test(s) ||
    /see\s+(?:my\s+)?screen/i.test(s) ||
    /(?:is|mere)\s+screen\s+(?:par\s+)?(?:kya|kaunsa)/i.test(s)
  );
}

/**
 * Screenshot le kar Gemini vision se describe karwata hai.
 * @returns null agar Vision ke liye Gemini key nahi hai ya screenshot possible nahi
 */
export async function handleScreenVision(userQuestion: string): Promise<string | null> {
  const key = getGeminiKey();
  if (!key) return null;

  const shot = await nativeTakeScreenshot(1024, 75);
  if (!shot.success || !shot.dataUrl) return null;

  const dataUrl = shot.dataUrl as string;
  const base64 = dataUrl.split(",")[1] || "";

  const prompt =
    "You are Maya's eyes. Look at this Android phone screenshot carefully and answer the user's question in the SAME language they used (Hinglish/Hindi/English), short and natural. If they just said 'look at screen', describe what's on screen in 2-3 lines and suggest what to do next. User question: " +
    userQuestion;

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${encodeURIComponent(key)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              role: "user",
              parts: [
                { text: prompt },
                {
                  inline_data: {
                    mime_type: "image/jpeg",
                    data: base64,
                  },
                },
              ],
            },
          ],
          generationConfig: { temperature: 0.4, maxOutputTokens: 600 },
        }),
      }
    );

    if (!response.ok) return null;
    const data = await response.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    return text?.trim() || null;
  } catch {
    return null;
  }
}
