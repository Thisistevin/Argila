import type { SupabaseClient } from "@supabase/supabase-js";
import {
  APP_TIMEZONE,
  calendarDateKeyInAppTz,
  weekdayShortLabelInAppTz,
} from "@/lib/diario/app-timezone";

export type WeeklyPoint = {
  /** YYYY-MM-DD no fuso do app */
  dateKey: string;
  dayLabel: string;
  diaries: number;
  reports: number;
};

function lastSevenDateKeysEndingToday(now = new Date()): string[] {
  const keys: string[] = [];
  for (let i = 6; i >= 0; i--) {
    const cursor = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    keys.push(calendarDateKeyInAppTz(cursor));
  }
  return keys;
}

function isoStartRoughForQueries(): string {
  const t = new Date();
  t.setUTCDate(t.getUTCDate() - 14);
  return t.toISOString();
}

export async function getWeeklyActivityForProfessor(
  supabase: SupabaseClient,
  professorId: string
): Promise<WeeklyPoint[]> {
  const dateKeys = lastSevenDateKeysEndingToday();
  const keySet = new Set(dateKeys);
  const roughFrom = isoStartRoughForQueries();

  const { data: diaryRows } = await supabase
    .from("diaries")
    .select("created_at")
    .eq("professor_id", professorId)
    .gte("created_at", roughFrom);

  const { data: reportRows } = await supabase
    .from("reports")
    .select("created_at")
    .eq("professor_id", professorId)
    .in("status", ["ready", "published"])
    .gte("created_at", roughFrom);

  const diaryByDay = new Map<string, number>();
  const reportByDay = new Map<string, number>();
  for (const k of dateKeys) {
    diaryByDay.set(k, 0);
    reportByDay.set(k, 0);
  }

  for (const row of diaryRows ?? []) {
    const created = row.created_at as string;
    const key = new Intl.DateTimeFormat("en-CA", {
      timeZone: APP_TIMEZONE,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date(created));
    if (!keySet.has(key)) continue;
    diaryByDay.set(key, (diaryByDay.get(key) ?? 0) + 1);
  }

  for (const row of reportRows ?? []) {
    const created = row.created_at as string;
    const key = new Intl.DateTimeFormat("en-CA", {
      timeZone: APP_TIMEZONE,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date(created));
    if (!keySet.has(key)) continue;
    reportByDay.set(key, (reportByDay.get(key) ?? 0) + 1);
  }

  return dateKeys.map((dateKey) => {
    const labelSource = `${dateKey}T03:00:00.000Z`;
    return {
      dateKey,
      dayLabel: weekdayShortLabelInAppTz(labelSource),
      diaries: diaryByDay.get(dateKey) ?? 0,
      reports: reportByDay.get(dateKey) ?? 0,
    };
  });
}
