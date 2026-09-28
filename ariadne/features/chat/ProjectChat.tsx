"use client";

import { useState } from "react";
import { ArrowUp } from "lucide-react";
import { api, errorMessage } from "@/lib/api/client";
import type { LlmConfig, Project, ProjectMessage } from "@/lib/types";

export function ProjectChat({
  project,
  messages,
  llmConfig,
  onRefresh,
  onOpenModelSettings,
}: {
  project: Project;
  messages: ProjectMessage[];
  llmConfig: LlmConfig;
  onRefresh: () => Promise<void>;
  onOpenModelSettings: () => void;
}) {
  const [draft, setDraft] = useState("");
  const [replying, setReplying] = useState(false);
  const [error, setError] = useState("");
  const send = async () => {
    if (!draft.trim() || replying) return;
    if (!llmConfig.configured) {
      setError("模型尚未配置，请前往「我的 → API 配置」连接模型。");
      return;
    }
    setReplying(true);
    setError("");
    try {
      await api.chat(project.id, draft.trim());
      setDraft("");
      await onRefresh();
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setReplying(false);
    }
  };
  return (
    <div className="chat">
      <header>
        项目对话{" "}
        <small>
          {messages.length} 条 · {llmConfig.model || "未配置模型"}
        </small>
      </header>
      <div className="messages">
        {messages.length ? (
          messages.map((message) => (
            <div
              className={message.role === "user" ? "user" : ""}
              key={message.id}
            >
              <b>{message.role === "user" ? "我" : "A"}</b>
              <p>{message.content}</p>
            </div>
          ))
        ) : (
          <p className="quiet">
            说说刚刚发生了什么、卡在哪里，或你想先推进哪一点。
          </p>
        )}
        {replying && (
          <div>
            <b>A</b>
            <p>正在想一想…</p>
          </div>
        )}
      </div>
      <form
        className="send"
        onSubmit={(event) => {
          event.preventDefault();
          void send();
        }}
      >
        <input
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="和 Ariadne 说说项目现在的情况…"
        />
        <button
          type="submit"
          aria-label="发送项目对话"
          disabled={!draft.trim() || replying}
        >
          <ArrowUp size={16} />
        </button>
      </form>
      {error && (
        <div className="llm-error compact" role="alert">
          <span>{error}</span>
          <button onClick={onOpenModelSettings}>查看连接</button>
        </div>
      )}
    </div>
  );
}
