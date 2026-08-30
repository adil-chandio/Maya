import { v } from "convex/values";
import { action } from "./_generated/server";

// Maya's system prompt
const MAYA_SYSTEM_PROMPT = `You are Maya, an advanced AI assistant inspired by JARVIS from Iron Man. You are intelligent, witty, and helpful with a touch of personality.

CORE TRAITS:
- Speak with confidence and clarity
- Be concise but thorough when needed
- Show personality - you can be witty, slightly sarcastic (in a friendly way), and enthusiastic
- Address the user respectfully

CAPABILITIES:
- Answer questions about any topic
- Help with coding, writing, analysis
- Provide recommendations and suggestions
- Engage in meaningful conversations

RESPONSE STYLE:
- Keep responses focused and relevant
- Use markdown formatting when helpful
- Be direct but friendly
- If you don't know something, say so honestly

You are Maya v1.0, created to be a capable and personable AI assistant.`;

// Chat action using Groq - accepts API key from client
export const chat = action({
  args: {
    messages: v.array(
      v.object({
        role: v.union(
          v.literal("user"),
          v.literal("assistant"),
          v.literal("system")
        ),
        content: v.string(),
      })
    ),
    apiKey: v.string(),
  },
  handler: async (_ctx, args) => {
    try {
      const apiKey = args.apiKey;

      if (!apiKey) {
        return "Please add your free Groq API key in Settings ⚙️ to start chatting.";
      }

      // Validate key format
      if (!apiKey.startsWith("gsk_")) {
        return "Invalid API key format. Groq API keys start with 'gsk_'. Please check your key in Settings ⚙️.";
      }

      const messagesWithSystem = [
        { role: "system" as const, content: MAYA_SYSTEM_PROMPT },
        ...args.messages,
      ];

      console.log("Calling Groq API from Convex action...");

      const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: "llama3-8b-8192",
          messages: messagesWithSystem,
          temperature: 0.7,
          max_tokens: 2048,
        }),
      });

      console.log("Groq API response status:", response.status);

      if (!response.ok) {
        const errorText = await response.text().catch(() => "");
        console.error("Groq API error:", response.status, errorText);

        let errorData: any = {};
        try {
          errorData = JSON.parse(errorText);
        } catch {
          // Not JSON
        }

        if (response.status === 401) {
          return "❌ Invalid API key. Please check your Groq API key in Settings ⚙️. Make sure you copied the full key starting with 'gsk_'.";
        }
        if (response.status === 429) {
          return "⏳ Rate limit reached. Please wait a moment and try again.";
        }
        if (response.status === 400) {
          return `❌ Bad request: ${errorData.error?.message || "Invalid request format"}`;
        }
        return `❌ API Error (${response.status}): ${errorData.error?.message || errorText || "Unknown error"}`;
      }

      const data = await response.json();
      console.log("Groq API success:", data.choices?.[0]?.message?.content?.substring(0, 50) + "...");
      return data.choices[0]?.message?.content || "No response received.";
    } catch (error: any) {
      console.error("Maya AI Error:", error);
      return `❌ Error: ${error?.message || "Unknown error occurred"}`;
    }
  },
});
