import type { Tag } from "./types";

export function dateLabel(value: string) {
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date(value));
}

export function ideaTitle(content: string) {
  const normalized = content.replace(/\s+/g, " ").trim();
  return normalized.length > 48 ? `${normalized.slice(0, 48)}…` : normalized;
}

export function tagPath(tag: Tag, tags: Tag[]) {
  const parent = tags.find((item) => item.id === tag.parentId);
  return parent ? `${parent.name} / ${tag.name}` : tag.name;
}

export function formatMinutes(minutes: number) {
  const seconds = Math.max(1, Math.round(minutes * 60));
  if (seconds < 60) return `${seconds} 秒`;
  const roundedMinutes = Math.round(seconds / 60);
  return roundedMinutes >= 60
    ? `${Math.floor(roundedMinutes / 60)} 小时${roundedMinutes % 60 ? ` ${roundedMinutes % 60} 分` : ""}`
    : `${roundedMinutes} 分`;
}

export function dateInputValue(value: Date) {
  const offset = value.getTimezoneOffset() * 60000;
  return new Date(value.getTime() - offset).toISOString().slice(0, 10);
}

export function timeInputValue(value: Date) {
  return `${String(value.getHours()).padStart(2, "0")}:${String(value.getMinutes()).padStart(2, "0")}`;
}
