import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

// Get messages for a conversation
export const list = query({
  args: { conversationId: v.id("conversations") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("messages")
      .withIndex("by_conversationId", (q) =>
        q.eq("conversationId", args.conversationId)
      )
      .order("asc")
      .collect();
  },
});

// Add a message
export const send = mutation({
  args: {
    conversationId: v.id("conversations"),
    role: v.union(v.literal("user"), v.literal("assistant"), v.literal("system")),
    content: v.string(),
    isVoice: v.optional(v.boolean()),
    toolCalls: v.optional(
      v.array(
        v.object({
          name: v.string(),
          result: v.string(),
        })
      )
    ),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const messageId = await ctx.db.insert("messages", {
      conversationId: args.conversationId,
      role: args.role,
      content: args.content,
      createdAt: now,
      isVoice: args.isVoice,
      toolCalls: args.toolCalls,
    });

    // Update conversation timestamp
    await ctx.db.patch(args.conversationId, { updatedAt: now });

    return messageId;
  },
});
