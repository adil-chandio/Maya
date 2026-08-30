import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // Conversations table
  conversations: defineTable({
    userId: v.string(),
    title: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
    isArchived: v.optional(v.boolean()),
  }).index("by_userId", ["userId"]),

  // Messages in a conversation
  messages: defineTable({
    conversationId: v.id("conversations"),
    role: v.union(v.literal("user"), v.literal("assistant"), v.literal("system")),
    content: v.string(),
    createdAt: v.number(),
    isVoice: v.optional(v.boolean()),
    toolCalls: v.optional(v.array(v.object({
      name: v.string(),
      result: v.string(),
    }))),
  }).index("by_conversationId", ["conversationId"]),

  // User settings and preferences
  userSettings: defineTable({
    userId: v.string(),
    name: v.optional(v.string()),
    personality: v.optional(v.string()),
    voiceEnabled: v.optional(v.boolean()),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_userId", ["userId"]),

  // Maya's memory / knowledge base
  memories: defineTable({
    userId: v.string(),
    key: v.string(),
    value: v.string(),
    createdAt: v.number(),
  }).index("by_userId", ["userId"])
    .index("by_userId_key", ["userId", "key"]),
});
