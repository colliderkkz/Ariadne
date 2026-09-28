"use client";

import { useState } from "react";
import { api, errorMessage } from "@/lib/api/client";
import { hasLegacyData, readLegacyData } from "@/lib/legacy-import";

export function LegacyImport({
  email,
  onRefresh,
}: {
  email: string;
  onRefresh: () => Promise<void>;
}) {
  const [visible, setVisible] = useState(hasLegacyData);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  if (!visible) return null;
  const migrate = async () => {
    setBusy(true);
    setError("");
    try {
      const legacy = readLegacyData();
      await api.importLegacy(legacy.data);
      legacy.finish(); // 只有整批事务成功后才清除原副本；失败保留，支持重试。
      await onRefresh();
      setVisible(false);
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setBusy(false);
    }
  };
  return (
    <aside className="connection-notice">
      <div>
        发现这台设备的旧数据，可导入当前账号 {email}。
        {error && <p role="alert">{error}</p>}
      </div>
      <button disabled={busy} onClick={() => void migrate()}>
        {busy ? "导入中…" : "导入当前账号"}
      </button>
      <button disabled={busy} onClick={() => setVisible(false)}>
        稍后
      </button>
    </aside>
  );
}
