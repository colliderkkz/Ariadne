"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { api, errorMessage } from "@/lib/api/client";
import type {
  ActivityRecord,
  Idea,
  LlmConfig,
  Project,
  ProjectMessage,
  Tag,
} from "@/lib/types";

interface Data {
  ideas: Idea[];
  projects: Project[];
  tags: Tag[];
  records: ActivityRecord[];
  messages: ProjectMessage[];
  llm: LlmConfig;
}
const tagOrder = [
  "learning",
  "learning-ai",
  "learning-programming",
  "learning-japanese",
  "learning-reading",
  "creation",
  "creation-web-app",
  "creation-writing",
  "creation-music",
  "creation-visual",
  "experience",
  "experience-travel",
  "experience-social",
  "experience-offline",
  "life",
  "life-fitness",
  "life-organization",
  "life-daily",
];
const empty: Data = {
  ideas: [],
  projects: [],
  tags: [],
  records: [],
  messages: [],
  llm: {
    provider: "",
    model: "",
    configured: false,
    baseUrl: "",
    source: "server",
  },
};

export function useWorkspace() {
  const [data, setData] = useState<Data>(empty);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const mounted = useRef(true);
  const load = useCallback(async () => {
    const [ideas, projects, tags, records, messages, llm] = await Promise.all([
      api.ideas.list(),
      api.projects.list(),
      api.tags.list(),
      api.records.list(),
      api.messages.list(),
      api.llmStatus(),
    ]);
    tags.sort((a, b) => {
      const rank = (id: string) =>
        tagOrder.includes(id) ? tagOrder.indexOf(id) : tagOrder.length;
      return (
        rank(a.id) - rank(b.id) ||
        Date.parse(a.createdAt) - Date.parse(b.createdAt)
      );
    });
    if (mounted.current)
      setData({ ideas, projects, tags, records, messages, llm });
  }, []);

  const refresh = useCallback(async () => {
    try {
      await load();
      setError("");
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setLoading(false);
    }
  }, [load]);

  useEffect(() => {
    mounted.current = true;
    void load()
      .catch((cause: unknown) => {
        if (mounted.current) setError(errorMessage(cause));
      })
      .finally(() => {
        if (mounted.current) setLoading(false);
      });
    return () => {
      mounted.current = false;
    };
  }, [load]);

  const mutate = async <T>(
    action: () => Promise<T>,
  ): Promise<{ value: T } | null> => {
    if (lock.current) return null;
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      const value = await action();
      try {
        await load();
      } catch {
        setError("数据已保存，但列表刷新失败。请点击重试刷新，避免重复提交。");
      }
      return { value };
    } catch (cause) {
      setError(errorMessage(cause));
      return null;
    } finally {
      lock.current = false;
      setBusy(false);
    }
  };
  const setLlm = (llm: LlmConfig) =>
    setData((current) => ({ ...current, llm }));
  return { ...data, loading, error, busy, refresh, mutate, setLlm };
}
