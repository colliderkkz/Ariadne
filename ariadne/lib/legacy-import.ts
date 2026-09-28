import type {
  ActivityRecord,
  Idea,
  Project,
  ProjectMessage,
  Tag,
} from "./types";

const keys = [
  "ariadne:ideas",
  "ariadne:tags",
  "ariadne:projects",
  "ariadne:activity-records",
  "ariadne:project-messages",
];
export function hasLegacyData() {
  return keys.some((key) => {
    const raw = localStorage.getItem(key);
    return raw !== null && raw !== "[]";
  });
}

export function readLegacyData() {
  const snapshot = Object.fromEntries(
    keys.map((key) => [key, localStorage.getItem(key)]),
  );
  const read = <T>(key: string): T[] => {
    const result = JSON.parse(snapshot[key] ?? "[]");
    if (!Array.isArray(result))
      throw new Error("旧数据格式不正确，已保留浏览器中的原始数据。");
    return result;
  };
  const tags = read<Tag>("ariadne:tags");
  const rawIdeas = read<Idea & { category?: string; tags?: string[] }>(
    "ariadne:ideas",
  );
  // 兼容早期 category/tags 字段；不再向 localStorage 写回业务数据。
  const ideas = rawIdeas.map((idea) => {
    const tagIds = [...(idea.tagIds ?? [])];
    for (const name of [
      ...(idea.tags ?? []),
      ...(idea.category ? [idea.category] : []),
    ]) {
      let tag = tags.find((item) => item.name === name || item.id === name);
      if (!tag) {
        tag = {
          id: `legacy-${tags.length}`,
          name,
          parentId: null,
          type: "custom",
          createdAt: idea.createdAt,
          updatedAt: idea.updatedAt,
        };
        tags.push(tag);
      }
      tagIds.push(tag.id);
    }
    return {
      id: idea.id,
      title: idea.title,
      content: idea.content,
      status: idea.status,
      tagIds: [...new Set(tagIds)],
      createdAt: idea.createdAt,
      updatedAt: idea.updatedAt,
    };
  });
  return {
    data: {
      ideas,
      tags,
      projects: read<Project>("ariadne:projects"),
      records: read<ActivityRecord>("ariadne:activity-records"),
      messages: read<ProjectMessage>("ariadne:project-messages"),
    },
    finish: () => {
      for (const key of keys)
        if (localStorage.getItem(key) === snapshot[key])
          localStorage.removeItem(key);
    },
  };
}
