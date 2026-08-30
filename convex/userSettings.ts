import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

// Get user settings
export const get = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("userSettings")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .first();
  },
});

// Create or update user settings
export const upsert = mutation({
  args: {
    userId: v.string(),
    name: v.optional(v.string()),
    personality: v.optional(v.string()),
    voiceEnabled: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("userSettings")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .first();

    const now = Date.now();

    if (existing) {
      await ctx.db.patch(existing._id, {
        ...args,
        updatedAt: now,
      });
      return existing._id;
    } else {
      return await ctx.db.insert("userSettings", {
        userId: args.userId,
        name: args.name,
        personality: args.personality,
        voiceEnabled: args.voiceEnabled,
        createdAt: now,
        updatedAt: now,
      });
    }
  },
});
