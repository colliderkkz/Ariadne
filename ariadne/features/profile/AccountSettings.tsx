"use client";

import { useRef, useState } from "react";
import { Camera, LogOut, Monitor, Moon, Sun } from "lucide-react";
import { api, errorMessage } from "@/lib/api/client";
import type { User } from "@/lib/types";

export function Avatar({
  user,
  className = "",
}: {
  user: Pick<User, "avatar" | "displayName">;
  className?: string;
}) {
  return (
    <span className={`profile-avatar ${className}`}>
      {/* The account image is an already resized data URL; no remote image loader is needed. */}
      {user.avatar ? (
        // eslint-disable-next-line @next/next/no-img-element -- Already compressed data URL.
        <img src={user.avatar} alt="个人头像" />
      ) : (
        user.displayName.trim().slice(0, 1) || "我"
      )}
    </span>
  );
}

async function prepareAvatar(file: File): Promise<string> {
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type))
    throw new Error("请选择 JPG、PNG 或 WebP 图片。");
  if (file.size > 5 * 1024 * 1024)
    throw new Error("请选择不超过 5 MB 的图片。");
  const image = await createImageBitmap(file);
  try {
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 256;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("无法处理图片，请换一张重试。");
    const size = Math.min(image.width, image.height);
    context.drawImage(
      image,
      (image.width - size) / 2,
      (image.height - size) / 2,
      size,
      size,
      0,
      0,
      256,
      256,
    );
    return canvas.toDataURL("image/webp", 0.85);
  } finally {
    image.close();
  }
}

export function AccountSettings({
  user,
  onUpdateUser,
  logout,
}: {
  user: User;
  onUpdateUser: (user: User) => void;
  logout: () => void;
}) {
  const [name, setName] = useState(user.displayName);
  const [avatar, setAvatar] = useState(user.avatar);
  const [theme, setTheme] = useState(user.theme);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const fileInput = useRef<HTMLInputElement>(null);
  const dirty =
    name.trim() !== user.displayName ||
    avatar !== user.avatar ||
    theme !== user.theme;
  const save = async () => {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const saved = await api.updateMe({
        displayName: name.trim(),
        avatar,
        theme,
      });
      onUpdateUser(saved);
      setName(saved.displayName);
      setMessage("设置已保存。");
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="account-settings">
      <form
        onSubmit={(event) => {
          event.preventDefault();
          void save();
        }}
      >
        <fieldset disabled={busy}>
          <section className="settings-card">
            <div className="eyebrow">YOUR PROFILE</div>
            <h2>个人资料</h2>
            <p>用熟悉的头像和名字，让这里更像你自己的空间。</p>
            <div className="avatar-editor">
              <Avatar user={{ displayName: name, avatar }} />
              <div className="avatar-actions">
                <button
                  type="button"
                  onClick={() => fileInput.current?.click()}
                >
                  <Camera size={16} />
                  更换头像
                </button>
                {avatar && (
                  <button
                    type="button"
                    onClick={() => {
                      setAvatar(null);
                      setMessage("");
                    }}
                  >
                    移除头像
                  </button>
                )}
                <small>JPG、PNG 或 WebP，最大 5 MB；自动裁为正方形。</small>
              </div>
              <input
                ref={fileInput}
                className="sr-only"
                aria-label="上传头像"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={async (event) => {
                  const file = event.target.files?.[0];
                  event.target.value = "";
                  if (!file) return;
                  setBusy(true);
                  setError("");
                  setMessage("");
                  try {
                    setAvatar(await prepareAvatar(file));
                  } catch (cause) {
                    setError(errorMessage(cause));
                  } finally {
                    setBusy(false);
                  }
                }}
              />
            </div>
            <label className="settings-field">
              名字
              <input
                required
                maxLength={80}
                value={name}
                autoComplete="nickname"
                onChange={(event) => {
                  setName(event.target.value);
                  setMessage("");
                }}
              />
            </label>
            <p className="account-email">{user.email}</p>
          </section>
          <section className="settings-card">
            <div className="eyebrow">PREFERENCES</div>
            <h2>基本设置</h2>
            <p id="theme-label">系统主题</p>
            <div
              className="theme-options"
              role="group"
              aria-labelledby="theme-label"
            >
              {(
                [
                  ["system", "跟随系统", Monitor],
                  ["light", "浅色", Sun],
                  ["dark", "深色", Moon],
                ] as const
              ).map(([value, label, Icon]) => (
                <button
                  key={value}
                  type="button"
                  aria-pressed={theme === value}
                  onClick={() => {
                    setTheme(value);
                    setMessage("");
                  }}
                >
                  <Icon size={20} />
                  {label}
                </button>
              ))}
            </div>
            <small>保存后应用；跟随系统会自动响应设备的外观变化。</small>
          </section>
          <div className="settings-save">
            {error && (
              <p role="alert" className="settings-error">
                {error}
              </p>
            )}
            {message && <p role="status">{message}</p>}
            <button
              className="primary"
              disabled={busy || !dirty || !name.trim()}
            >
              {busy ? "正在处理…" : "保存设置"}
            </button>
          </div>
        </fieldset>
      </form>
      <section className="settings-card logout-card">
        <div>
          <h2>账号</h2>
          <p>退出后，你的内容仍会保存在账号中。</p>
        </div>
        <button className="logout-button" disabled={busy} onClick={logout}>
          <LogOut size={16} />
          退出登录
        </button>
      </section>
    </div>
  );
}
