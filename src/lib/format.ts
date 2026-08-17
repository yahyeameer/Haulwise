/** Display helpers. Kept together so number and date formatting stay consistent. */

import { NOW } from "./data";

export const usd = (n: number) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

export const usdPrecise = (n: number) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2 });

export const pct = (n: number) => `${Math.round(n * 100)}%`;

export const miles = (n: number) => `${n.toLocaleString("en-US")} mi`;

export const lbs = (n: number) => `${n.toLocaleString("en-US")} lb`;

export function duration(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m === 0 ? `${s}s` : `${m}m ${s.toString().padStart(2, "0")}s`;
}

export function dateTime(iso: string) {
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "UTC",
  });
}

export function timeOnly(iso: string) {
  return new Date(iso).toLocaleString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: "UTC",
  });
}

/**
 * Relative time against the dataset's fixed "now" rather than the wall clock,
 * so the demo reads consistently no matter when it is opened.
 */
export function relativeTime(iso: string) {
  const diffMs = new Date(iso).getTime() - NOW.getTime();
  const diffMin = Math.round(diffMs / 60000);
  const abs = Math.abs(diffMin);

  if (abs < 1) return "just now";
  if (abs < 60) return diffMin < 0 ? `${abs}m ago` : `in ${abs}m`;

  const h = Math.round(abs / 60);
  if (h < 24) return diffMin < 0 ? `${h}h ago` : `in ${h}h`;

  const d = Math.round(h / 24);
  return diffMin < 0 ? `${d}d ago` : `in ${d}d`;
}

/** Window rendered as a single readable span, e.g. "Aug 18, 8:00 AM – 4:00 PM". */
export function windowRange(startIso: string, endIso: string) {
  const start = new Date(startIso);
  const end = new Date(endIso);
  const sameDay = start.toDateString() === end.toDateString();
  return sameDay ? `${dateTime(startIso)} – ${timeOnly(endIso)}` : `${dateTime(startIso)} – ${dateTime(endIso)}`;
}
