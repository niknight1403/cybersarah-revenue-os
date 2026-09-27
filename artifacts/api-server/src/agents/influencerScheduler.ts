import type { HealthContentPlatform } from "./influencerContentEngine";

export interface ScheduleSlot {
  platform: HealthContentPlatform;
  hourLocal: number;
  minuteLocal: number;
  rationale: string;
}

const DEFAULT_SLOTS: Record<HealthContentPlatform, ScheduleSlot[]> = {
  TikTok: [
    { platform: "TikTok", hourLocal: 12, minuteLocal: 30, rationale: "Mittagsfenster für schnellen Test-Traffic." },
    { platform: "TikTok", hourLocal: 19, minuteLocal: 0, rationale: "Abendfenster für Freizeitnutzung." },
  ],
  Instagram: [
    { platform: "Instagram", hourLocal: 11, minuteLocal: 30, rationale: "Vormittag/Mittag für Saves und Shares." },
    { platform: "Instagram", hourLocal: 18, minuteLocal: 30, rationale: "Feierabendfenster für Reels." },
  ],
  YouTube: [
    { platform: "YouTube", hourLocal: 17, minuteLocal: 30, rationale: "Vorabend für Shorts und Anschluss-Views." },
    { platform: "YouTube", hourLocal: 20, minuteLocal: 0, rationale: "Abendfenster für längere Session-Dauer." },
  ],
};

export function buildPostingSchedule(platforms: HealthContentPlatform[], start = new Date()): Array<ScheduleSlot & { scheduledAt: string }> {
  return platforms.map((platform, index) => {
    const slot = DEFAULT_SLOTS[platform][index % DEFAULT_SLOTS[platform].length]!;
    const scheduled = new Date(start);
    scheduled.setDate(start.getDate() + index);
    scheduled.setHours(slot.hourLocal, slot.minuteLocal, 0, 0);
    if (scheduled <= start) scheduled.setDate(scheduled.getDate() + 1);
    return { ...slot, scheduledAt: scheduled.toISOString() };
  });
}
