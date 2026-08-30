// ===== SMART STATS & USAGE TRACKING =====
// Track usage patterns, generate insights

import type { DailyStats } from "./types";

const STATS_KEY = "maya_stats";
const MAX_DAYS = 30;

// ===== TRACK AN EVENT =====

export function trackMessage() {
  const today = getTodayKey();
  const stats = getAllStats();
  const day = stats.find((s) => s.date === today);
  if (day) {
    day.messageCount++;
  } else {
    stats.push({
      date: today,
      messageCount: 1,
      automationCount: 0,
      topActions: [],
      sessionDuration: 0,
      languagesUsed: [],
    });
  }
  saveStats(stats);
}

export function trackAutomation(action: string) {
  const today = getTodayKey();
  const stats = getAllStats();
  const day = stats.find((s) => s.date === today);
  if (day) {
    day.automationCount++;
    const existing = day.topActions.find((a) => a.action === action);
    if (existing) {
      existing.count++;
    } else {
      day.topActions.push({ action, count: 1 });
    }
    day.topActions.sort((a, b) => b.count - a.count);
    if (day.topActions.length > 5) day.topActions.length = 5;
  }
  saveStats(stats);
}

export function trackLanguage(lang: string) {
  const today = getTodayKey();
  const stats = getAllStats();
  const day = stats.find((s) => s.date === today);
  if (day && !day.languagesUsed.includes(lang)) {
    day.languagesUsed.push(lang);
  }
  saveStats(stats);
}

// ===== GET STATS =====

export function getAllStats(): DailyStats[] {
  try {
    const raw = localStorage.getItem(STATS_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return [];
}

function saveStats(stats: DailyStats[]) {
  // Keep only last 30 days
  if (stats.length > MAX_DAYS) {
    stats.splice(0, stats.length - MAX_DAYS);
  }
  try {
    localStorage.setItem(STATS_KEY, JSON.stringify(stats));
  } catch { /* ignore */ }
}

function getTodayKey(): string {
  return new Date().toISOString().split("T")[0];
}

// ===== INSIGHTS =====

export function getTotalMessages(): number {
  return getAllStats().reduce((sum, s) => sum + s.messageCount, 0);
}

export function getTotalAutomations(): number {
  return getAllStats().reduce((sum, s) => sum + s.automationCount, 0);
}

export function getTopActions(limit = 5): { action: string; count: number }[] {
  const allActions: Record<string, number> = {};
  for (const day of getAllStats()) {
    for (const a of day.topActions) {
      allActions[a.action] = (allActions[a.action] || 0) + a.count;
    }
  }
  return Object.entries(allActions)
    .map(([action, count]) => ({ action, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

export function getThisWeekStats(): { messages: number; automations: number; days: number } {
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const weekStats = getAllStats().filter((s) => new Date(s.date) >= weekAgo);
  return {
    messages: weekStats.reduce((sum, s) => sum + s.messageCount, 0),
    automations: weekStats.reduce((sum, s) => sum + s.automationCount, 0),
    days: weekStats.length,
  };
}

// ===== SUMMARY GENERATOR =====

export function generateDailySummary(): string {
  const today = getAllStats().find((s) => s.date === getTodayKey());
  if (!today) return "Aaj abhi tak koi activity nahi hui.";

  const lines = [
    `📊 Aaj ka Summary:`,
    `💬 Messages: ${today.messageCount}`,
    `⚡ Automations: ${today.automationCount}`,
  ];

  if (today.topActions.length > 0) {
    lines.push(`🏆 Top action: ${today.topActions[0].action} (${today.topActions[0].count} times)`);
  }

  return lines.join("\n");
}
