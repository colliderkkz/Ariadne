"use client";

import { useEffect, useState, type ReactNode } from "react";
import {
  api,
  errorMessage,
  hasSession,
  setSessionToken,
} from "@/lib/api/client";
import type { User } from "@/lib/types";

export function AuthGate({
  children,
}: {
  children: (
    user: User,
    logout: () => void,
    updateUser: (user: User) => void,
  ) => ReactNode;
}) {
  const [user, setUser] = useState<User | null>(null);
  const [checking, setChecking] = useState(true);
  const [registering, setRegistering] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const apply = () => {
      const preference = user?.theme ?? "system";
      document.documentElement.dataset.theme =
        preference === "system"
          ? media.matches
            ? "dark"
            : "light"
          : preference;
    };
    apply();
    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, [user?.theme]);

  useEffect(() => {
    let cancelled = false;
    // 删除旧版本留在浏览器里的 LLM Key。业务旧数据另行确认导入。
    localStorage.removeItem("ariadne:llm-config");
    const expired = () => {
      setUser(null);
      setError("登录已过期，请重新登录。");
    };
    window.addEventListener("ariadne:session-expired", expired);
    const restore = async () => {
      try {
        if (hasSession()) {
          const current = await api.me();
          if (!cancelled) setUser(current);
        }
      } catch (cause) {
        if (!cancelled) setError(errorMessage(cause));
      } finally {
        if (!cancelled) setChecking(false);
      }
    };
    void restore();
    return () => {
      cancelled = true;
      window.removeEventListener("ariadne:session-expired", expired);
    };
  }, []);

  if (checking)
    return (
      <main className="auth-page">
        <p>正在恢复登录…</p>
      </main>
    );
  if (user)
    return children(
      user,
      () => {
        setSessionToken(null);
        setUser(null);
      },
      setUser,
    );
  const submit = async () => {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      if (registering) await api.register(email, password, name);
      setUser(await api.login(email, password));
      setPassword("");
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setBusy(false);
    }
  };
  return (
    <main className="auth-page">
      <form
        className="dialog auth-card"
        onSubmit={(event) => {
          event.preventDefault();
          void submit();
        }}
      >
        <div className="eyebrow">ARIADNE</div>
        <h1>{registering ? "创建账号" : "欢迎回来"}</h1>
        <p>登录后，想法与行动记录会保存到你的账号。</p>
        {registering && (
          <label>
            称呼
            <input
              required
              maxLength={80}
              value={name}
              onChange={(event) => setName(event.target.value)}
              autoComplete="name"
            />
          </label>
        )}
        <label>
          邮箱
          <input
            type="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            autoComplete="username"
          />
        </label>
        <label>
          密码
          <input
            type="password"
            required
            minLength={8}
            maxLength={128}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete={registering ? "new-password" : "current-password"}
          />
        </label>
        {error && (
          <p role="alert" className="form-message">
            {error}
          </p>
        )}
        <button className="primary" disabled={busy}>
          {busy ? "请稍候…" : registering ? "注册并登录" : "登录"}
        </button>
        <button
          type="button"
          className="text-button"
          onClick={() => {
            setRegistering(!registering);
            setError("");
          }}
        >
          {registering ? "已有账号，去登录" : "还没有账号？注册"}
        </button>
      </form>
    </main>
  );
}
