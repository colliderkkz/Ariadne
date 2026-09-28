import type { ActiveTimer } from "./types";

// 仅保留进行中的计时状态，按登录账号隔离；完成后的记录必须写入 API。
export function readTimer(userId: string): ActiveTimer | null {
  try {
    const value = JSON.parse(
      localStorage.getItem(`ariadne:timer:${userId}`) ?? "null",
    );
    return value &&
      typeof value.projectId === "string" &&
      Number.isFinite(Date.parse(value.startedAt))
      ? value
      : null;
  } catch {
    return null;
  }
}
export function writeTimer(userId: string, value: ActiveTimer | null) {
  const key = `ariadne:timer:${userId}`;
  if (value) localStorage.setItem(key, JSON.stringify(value));
  else localStorage.removeItem(key);
}
