export const APP_TIMEZONE = "America/Bahia";

/** Data local do app (YYYY-MM-DD) no fuso America/Bahia. */
export function calendarDateKeyInAppTz(date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: APP_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

/** Rótulo curto do dia da semana (ex.: "qua.") no fuso do app. */
export function weekdayShortLabelInAppTz(isoTimestamp: string): string {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: APP_TIMEZONE,
    weekday: "short",
  }).format(new Date(isoTimestamp));
}

export function calendarDateKeyForInstantInAppTz(isoTimestamp: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: APP_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(isoTimestamp));
}
