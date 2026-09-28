"use client";

import { useState } from "react";
import { KeyRound } from "lucide-react";
import { api, errorMessage } from "@/lib/api/client";
import type { LlmConfig } from "@/lib/types";

const providers = [
  {
    id: "deepseek",
    name: "DeepSeek",
    model: "deepseek-chat",
    url: "https://api.deepseek.com/chat/completions",
  },
  {
    id: "openai",
    name: "OpenAI",
    model: "",
    url: "https://api.openai.com/v1/chat/completions",
  },
  {
    id: "moonshot",
    name: "Moonshot",
    model: "",
    url: "https://api.moonshot.cn/v1/chat/completions",
  },
  {
    id: "siliconflow",
    name: "硅基流动",
    model: "",
    url: "https://api.siliconflow.cn/v1/chat/completions",
  },
  {
    id: "qwen",
    name: "通义千问",
    model: "",
    url: "https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions",
  },
];

export function ModelSettings({
  config,
  onUpdate,
}: {
  config: LlmConfig;
  onUpdate: (config: LlmConfig) => void;
}) {
  const [provider, setProvider] = useState(
    providers.some((item) => item.id === config.provider)
      ? config.provider
      : "deepseek",
  );
  const [model, setModel] = useState(config.model);
  const [key, setKey] = useState("");
  const [busy, setBusy] = useState<"save" | "test" | "reset" | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const selected = providers.find((item) => item.id === provider)!;
  const canKeepKey =
    config.source === "personal" &&
    provider === config.provider &&
    config.configured;
  const clearMessage = () => {
    setError("");
    setMessage("");
  };
  const run = async (action: "save" | "test" | "reset") => {
    setBusy(action);
    clearMessage();
    try {
      const input = {
        provider,
        model: model.trim(),
        ...(key.trim() ? { apiKey: key.trim() } : {}),
      };
      if (action === "test") {
        await api.testLlm(input);
        setMessage("连接成功，模型已响应。修改后的配置需要保存才会用于对话。");
      } else {
        const saved =
          action === "reset" ? await api.resetLlm() : await api.saveLlm(input);
        onUpdate(saved);
        setKey("");
        setProvider(
          providers.some((item) => item.id === saved.provider)
            ? saved.provider
            : "deepseek",
        );
        setModel(saved.model);
        setMessage(
          action === "reset"
            ? "个人配置已移除，已恢复服务端默认配置。"
            : "API 配置已保存，探索和项目对话将使用此配置。",
        );
      }
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setBusy(null);
    }
  };
  return (
    <section className="model-settings">
      <div className="model-settings-head">
        <div>
          <div className="eyebrow">LLM CONNECTION</div>
          <h2>API 配置</h2>
          <p>为你的账号连接模型，探索和项目对话共用此配置。</p>
        </div>
        <span className={config.configured ? "connected" : ""}>
          {config.configured
            ? config.source === "personal"
              ? "个人配置已保存"
              : "使用服务端配置"
            : "未配置"}
        </span>
      </div>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          void run("save");
        }}
      >
        <fieldset disabled={busy !== null}>
          <div className="model-form">
            <label>
              <span>服务商</span>
              <select
                aria-label="服务商"
                value={provider}
                onChange={(event) => {
                  const next = providers.find(
                    (item) => item.id === event.target.value,
                  )!;
                  setProvider(next.id);
                  setModel(next.model);
                  setKey("");
                  clearMessage();
                }}
              >
                {providers.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>模型名称</span>
              <input
                required
                maxLength={200}
                value={model}
                placeholder="填写服务商提供的模型 ID"
                onChange={(event) => {
                  setModel(event.target.value);
                  clearMessage();
                }}
              />
            </label>
            <label className="full-width">
              <span>API 地址</span>
              <input aria-label="API 地址" readOnly value={selected.url} />
              <small>地址随服务商自动切换，使用 Chat Completions 接口。</small>
            </label>
            <label className="full-width">
              <span>API Key</span>
              <input
                type="password"
                autoComplete="new-password"
                required={!canKeepKey}
                maxLength={4096}
                value={key}
                placeholder={
                  canKeepKey
                    ? "已保存，留空保留原密钥"
                    : "填写该服务商的 API Key"
                }
                onChange={(event) => {
                  setKey(event.target.value);
                  clearMessage();
                }}
              />
            </label>
          </div>
          <p className="key-note">
            <KeyRound size={14} />
            密钥加密保存在服务端，保存后不回显。
          </p>
          {error && (
            <p role="alert" className="settings-error">
              {error}
            </p>
          )}
          {message && (
            <p role="status" className="settings-message">
              {message}
            </p>
          )}
          <div className="model-actions">
            <button
              type="button"
              disabled={
                busy !== null || !model.trim() || (!key.trim() && !canKeepKey)
              }
              onClick={() => void run("test")}
            >
              {busy === "test" ? "正在测试…" : "测试连接"}
            </button>
            <button
              className="primary"
              disabled={
                busy !== null || !model.trim() || (!key.trim() && !canKeepKey)
              }
            >
              {busy === "save" ? "正在保存…" : "保存 API 配置"}
            </button>
            {config.source === "personal" && (
              <button type="button" onClick={() => void run("reset")}>
                {busy === "reset" ? "正在恢复…" : "恢复默认配置"}
              </button>
            )}
          </div>
        </fieldset>
      </form>
    </section>
  );
}
