export type IdeaStatus = "inbox" | "exploring" | "convertedToProject" | "archived";
export type ProjectStatus = "active" | "paused" | "completed" | "archived";

export interface Tag { id: string; name: string; parentId: string | null; type: "system" | "custom"; createdAt: string; updatedAt: string; }
export interface Idea { id: string; title: string; content: string; tagIds: string[]; status: IdeaStatus; createdAt: string; updatedAt: string; }
export interface Project { id: string; title: string; description: string; innerThoughts?: string; status: ProjectStatus; linkedIdeaId: string; createdAt: string; updatedAt: string; }
export interface ActivityRecord { id: string; title: string; minutes: number; tagId: string | null; completedAt: string; }
type LegacyIdea = Partial<Idea> & { category?: string; tags?: string[] };

const IDEAS_KEY = "ariadne:ideas";
const TAGS_KEY = "ariadne:tags";
const PROJECTS_KEY = "ariadne:projects";
const ACTIVITY_RECORDS_KEY = "ariadne:activity-records";
const timestamp = () => new Date().toISOString();

export const systemTags: Tag[] = [
  ["learning", "学习", null], ["learning-ai", "AI", "learning"], ["learning-programming", "编程", "learning"], ["learning-japanese", "日语", "learning"], ["learning-reading", "阅读", "learning"],
  ["creation", "创作", null], ["creation-web-app", "Web App", "creation"], ["creation-writing", "写作", "creation"], ["creation-music", "音乐", "creation"], ["creation-visual", "视觉", "creation"],
  ["experience", "体验", null], ["experience-travel", "旅行", "experience"], ["experience-social", "社交", "experience"], ["experience-offline", "线下活动", "experience"],
  ["life", "生活", null], ["life-fitness", "健身", "life"], ["life-organization", "整理", "life"], ["life-daily", "日常", "life"],
].map(([id, name, parentId]) => ({ id, name, parentId, type: "system" as const, createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z" }));

function isBrowser() { return typeof window !== "undefined"; }
function read<T>(key: string): T[] { if (!isBrowser()) return []; try { const value = window.localStorage.getItem(key); const parsed: unknown = value ? JSON.parse(value) : []; return Array.isArray(parsed) ? parsed as T[] : []; } catch { return []; } }
function write<T>(key: string, value: T[]) { if (isBrowser()) window.localStorage.setItem(key, JSON.stringify(value)); }

export function getTags(): Tag[] { const stored = read<Tag>(TAGS_KEY); if (!stored.length) { saveTags(systemTags); return systemTags; } return stored; }
export function saveTags(tags: Tag[]) { write(TAGS_KEY, tags); }
export function createTag(input: Pick<Tag, "name" | "parentId" | "type">): Tag { const now = timestamp(); return { ...input, id: crypto.randomUUID(), createdAt: now, updatedAt: now }; }

const legacyTagMap: Record<string, string[]> = {
  learning: ["learning"], AI: ["learning-ai"], technology: ["learning-programming"], creative: ["creation"], visual: ["creation-visual"], offline: ["experience-offline"], social: ["experience-social"], travel: ["experience-travel"], lifestyle: ["life"], handsOn: ["creation-web-app"], "项目": ["creation-web-app"], "学习": ["learning"], "体验": ["experience"], "生活": ["life"], "技能": ["learning-programming"],
};
function legacyId(value: string) { return `legacy-tag-${encodeURIComponent(value).replace(/%/g, "-")}`; }
function migrateIdea(idea: LegacyIdea, tagMap: Record<string, string[]>): Idea {
  const createdAt = typeof idea.createdAt === "string" ? idea.createdAt : timestamp();
  const legacyValues = [...(idea.tags ?? []), ...(idea.category ? [idea.category] : [])];
  return { id: typeof idea.id === "string" ? idea.id : crypto.randomUUID(), title: typeof idea.title === "string" ? idea.title : "未命名想法", content: typeof idea.content === "string" ? idea.content : "", tagIds: Array.isArray(idea.tagIds) ? [...new Set(idea.tagIds)] : [...new Set(legacyValues.flatMap((value) => tagMap[value] ?? []))], status: idea.status === "exploring" || idea.status === "convertedToProject" || idea.status === "archived" ? idea.status : "inbox", createdAt, updatedAt: typeof idea.updatedAt === "string" ? idea.updatedAt : createdAt };
}
export function getIdeas(): Idea[] {
  const raw = read<LegacyIdea>(IDEAS_KEY); const existingTags = getTags(); const names = new Map(existingTags.map((tag) => [tag.name, tag.id]));
  const legacyValues = raw.flatMap((idea) => [...(idea.tags ?? []), ...(idea.category ? [idea.category] : [])]).filter((value) => typeof value === "string" && value.trim());
  const unmapped = [...new Set(legacyValues)].filter((value) => !legacyTagMap[value] && !names.has(value));
  if (unmapped.length) saveTags([...existingTags, ...unmapped.map((name) => ({ id: legacyId(name), name, parentId: null, type: "custom" as const, createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z" }))]);
  const tagMap = { ...legacyTagMap, ...Object.fromEntries(unmapped.map((name) => [name, [legacyId(name)]])), ...Object.fromEntries(existingTags.map((tag) => [tag.name, [tag.id]])) };
  const ideas = raw.map((idea) => migrateIdea(idea, tagMap)); if (raw.some((idea) => !Array.isArray(idea.tagIds) || "tags" in idea || "category" in idea)) saveIdeas(ideas); return ideas;
}
export function saveIdeas(ideas: Idea[]) { write(IDEAS_KEY, ideas); }
export function createIdea(input: Omit<Idea, "id" | "createdAt" | "updatedAt">): Idea { const now = timestamp(); return { ...input, id: crypto.randomUUID(), createdAt: now, updatedAt: now }; }
export function getProjects(): Project[] { return read<Project>(PROJECTS_KEY); }
export function saveProjects(projects: Project[]) { write(PROJECTS_KEY, projects); }
export function createProject(input: Omit<Project, "id" | "createdAt" | "updatedAt">): Project { const now = timestamp(); return { ...input, id: crypto.randomUUID(), createdAt: now, updatedAt: now }; }
export function getActivityRecords(): ActivityRecord[] { return read<ActivityRecord>(ACTIVITY_RECORDS_KEY).filter((record) => typeof record.title === "string" && Number.isFinite(record.minutes) && record.minutes > 0 && typeof record.completedAt === "string"); }
export function saveActivityRecords(records: ActivityRecord[]) { write(ACTIVITY_RECORDS_KEY, records); }
export function createActivityRecord(input: Omit<ActivityRecord, "id">): ActivityRecord { return { ...input, id: crypto.randomUUID() }; }
