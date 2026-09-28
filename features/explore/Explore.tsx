"use client";
import { api, errorMessage } from "@/lib/api/client";
import { useState } from "react";
import { ArrowRight, ArrowUp, ChevronRight, Lightbulb, X } from "lucide-react";
import type { Idea, LlmConfig, ChatMessage } from "@/lib/types";

export function Explore({
  llmConfig,
  onOpenModelSettings,
  onCreateIdea,
  onContinue,
  hasProject,
}: {
  llmConfig: LlmConfig;
  onOpenModelSettings: () => void;
  onCreateIdea: (
    input: Omit<Idea, "id" | "createdAt" | "updatedAt">,
  ) => Promise<boolean>;
  onContinue: () => void;
  hasProject: boolean;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content:
        "你不需要现在就知道自己想做什么。告诉我最近在意、好奇或放不下的事，我们一起把它慢慢说清楚。",
    },
  ]);
  const [chatInput, setChatInput] = useState("");
  const [replying, setReplying] = useState(false);
  const [error, setError] = useState("");
  const [savingIdeaIndex, setSavingIdeaIndex] = useState<number | null>(null);
  const [saveError, setSaveError] = useState("");
  const saveIdea = async (index: number) => {
    if (savingIdeaIndex !== null) return;
    setSavingIdeaIndex(index);
    setSaveError("");
    try {
      const organized = await api.organize(
        messages.slice(Math.max(0, index - 7), index + 1),
      );
      if (!(await onCreateIdea({ ...organized, tagIds: [], status: "inbox" })))
        throw new Error("保存失败");
    } catch {
      setSaveError("AI 暂时没能整理好这条想法，请稍后再试；原对话仍然保留。");
    } finally {
      setSavingIdeaIndex(null);
    }
  };
  const send = async (preset?: string) => {
    const content = (preset ?? chatInput).trim();
    if (!content || replying) return;
    if (!llmConfig.configured) {
      setError("模型尚未配置，请前往「我的 → API 配置」连接模型。");
      return;
    }
    const nextMessages = [...messages, { role: "user" as const, content }];
    setMessages(nextMessages);
    setChatInput("");
    setError("");
    setReplying(true);
    try {
      const answer = await api.explore(nextMessages);
      setMessages((current) => [
        ...current,
        { role: "assistant", content: answer.content },
      ]);
    } catch (requestError) {
      setError(errorMessage(requestError));
      setMessages(messages);
      setChatInput(content);
    } finally {
      setReplying(false);
    }
  };
  return (
    <div className="explore explore-chat llm-explore">
      <div className="explore-conversation">
        {messages.map((message, index) => (
          <div
            className={`explore-message ${message.role}`}
            key={`${message.role}-${index}`}
          >
            <div className="chat-avatar">
              {message.role === "assistant" ? "A" : "我"}
            </div>
            <div>
              <div className="eyebrow">
                {message.role === "assistant" ? "ARIADNE" : "YOU"}
              </div>
              <p>{message.content}</p>
              {message.role === "assistant" && index > 0 && (
                <button
                  className="save-as-idea"
                  disabled={savingIdeaIndex !== null}
                  aria-busy={savingIdeaIndex === index}
                  onClick={() => saveIdea(index)}
                >
                  <Lightbulb size={14} />
                  {savingIdeaIndex === index ? "AI 正在整理…" : "保存为想法"}
                </button>
              )}
            </div>
          </div>
        ))}
        {replying && (
          <div className="explore-message assistant thinking">
            <div className="chat-avatar">A</div>
            <p>正在想一想…</p>
          </div>
        )}
      </div>
      {saveError && (
        <div className="llm-error idea-save-error">
          <span>{saveError}</span>
          <button onClick={() => setSaveError("")}>
            知道了 <X size={14} />
          </button>
        </div>
      )}
      {messages.length === 1 && (
        <>
          <p className="chat-question">此刻，哪一句更接近你？</p>
          <div className="chat-options">
            <button
              onClick={() =>
                send("我不知道自己想做什么，请陪我找一个可以开始的方向。")
              }
            >
              我不知道应该做什么 <ChevronRight size={17} />
            </button>
            <button
              onClick={() =>
                send("我有一个还很模糊的新想法，想和你一起把它说清楚。")
              }
            >
              我有一个模糊的想法 <ChevronRight size={17} />
            </button>
            <button
              className={!hasProject ? "placeholder-choice" : ""}
              disabled={!hasProject}
              onClick={onContinue}
            >
              我想继续推进之前的事情 <ChevronRight size={17} />
            </button>
          </div>
        </>
      )}
      <form
        className="chat-composer"
        onSubmit={(event) => {
          event.preventDefault();
          send();
        }}
      >
        <input
          value={chatInput}
          onChange={(event) => setChatInput(event.target.value)}
          placeholder="告诉我你最近在想什么…"
        />
        <button type="submit" disabled={!chatInput.trim() || replying}>
          <ArrowUp size={18} />
        </button>
      </form>
      {error && (
        <div className="llm-error">
          <span>{error}</span>
          <button onClick={onOpenModelSettings}>
            去配置 <ArrowRight size={14} />
          </button>
        </div>
      )}
      <p className="chat-footnote">
        保存时，AI 会自动整理标题和可直接用于项目的内容介绍。
      </p>
    </div>
  );
}
