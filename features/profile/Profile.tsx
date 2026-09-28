"use client";
import { useState } from "react";
import {
  Archive,
  ArrowRight,
  BookOpen,
  KeyRound,
  Lightbulb,
  Settings,
} from "lucide-react";
import type {
  Idea,
  Project,
  ActivityRecord,
  LlmConfig,
  User,
} from "@/lib/types";
import { dateLabel, formatMinutes } from "@/lib/format";
import { AccountSettings, Avatar } from "./AccountSettings";
import { ModelSettings } from "./ModelSettings";
type ProfileTab = "overview" | "model" | "archive" | "settings";

export function Profile({
  ideas,
  projects,
  records,
  llmConfig,
  onUpdateModel,
  user,
  onUpdateUser,
  logout,
  initialTab = "overview",
  onRestoreIdea,
  onRestoreProject,
}: {
  ideas: Idea[];
  projects: Project[];
  records: ActivityRecord[];
  llmConfig: LlmConfig;
  onUpdateModel: (config: LlmConfig) => void;
  user: User;
  onUpdateUser: (user: User) => void;
  logout: () => void;
  initialTab?: ProfileTab;
  onRestoreIdea: (idea: Idea) => void;
  onRestoreProject: (project: Project) => void;
}) {
  const [tab, setTab] = useState<ProfileTab>(initialTab);
  const activeIdeas = ideas.filter((idea) => idea.status !== "archived");
  const activeProjects = projects.filter(
    (project) => project.status !== "archived",
  );
  const archivedIdeas = ideas
    .filter((idea) => idea.status === "archived")
    .sort((a, b) => +new Date(b.updatedAt) - +new Date(a.updatedAt));
  const archivedProjects = projects
    .filter((project) => project.status === "archived")
    .sort((a, b) => +new Date(b.updatedAt) - +new Date(a.updatedAt));
  const archivedCount = archivedIdeas.length + archivedProjects.length;
  const totalMinutes = records.reduce((sum, record) => sum + record.minutes, 0);
  return (
    <div className="page profile-page">
      <div className="profilehead">
        <Avatar user={user} />
        <div>
          <div className="eyebrow">MY SPACE</div>
          <h1>{user.displayName}</h1>
          <p>管理你的线索，也照顾自己的节奏。</p>
        </div>
      </div>
      <div className="profile-tabs">
        <button
          className={tab === "overview" ? "active" : ""}
          onClick={() => setTab("overview")}
        >
          概览
        </button>
        <button
          className={tab === "model" ? "active" : ""}
          onClick={() => setTab("model")}
        >
          <KeyRound size={14} />
          API 配置
        </button>
        <button
          className={tab === "archive" ? "active" : ""}
          onClick={() => setTab("archive")}
        >
          <Archive size={14} />
          归档 <span>{archivedCount}</span>
        </button>
        <button
          className={tab === "settings" ? "active" : ""}
          onClick={() => setTab("settings")}
        >
          <Settings size={14} />
          设置
        </button>
      </div>
      {tab === "settings" ? (
        <AccountSettings
          user={user}
          onUpdateUser={onUpdateUser}
          logout={logout}
        />
      ) : tab === "model" ? (
        <ModelSettings config={llmConfig} onUpdate={onUpdateModel} />
      ) : tab === "archive" ? (
        <section className="archive-panel">
          <div className="section-heading">
            <div>
              <div className="eyebrow">ARCHIVE</div>
              <h2>暂时放下的内容</h2>
              <p>归档不会删除，需要时可以恢复。</p>
            </div>
            <span>{archivedCount} 项</span>
          </div>
          {archivedCount ? (
            <div className="archive-list">
              {archivedIdeas.map((idea) => (
                <article key={idea.id}>
                  <div className="archive-kind">
                    <Lightbulb size={15} />
                    想法
                  </div>
                  <div>
                    <h3>{idea.title}</h3>
                    <p>{idea.content || "没有补充说明"}</p>
                    <small>归档于 {dateLabel(idea.updatedAt)}</small>
                  </div>
                  <button onClick={() => onRestoreIdea(idea)}>
                    恢复 <ArrowRight size={15} />
                  </button>
                </article>
              ))}
              {archivedProjects.map((project) => (
                <article key={project.id}>
                  <div className="archive-kind">
                    <BookOpen size={15} />
                    项目
                  </div>
                  <div>
                    <h3>{project.title}</h3>
                    <p>{project.description || "没有补充说明"}</p>
                    <small>归档于 {dateLabel(project.updatedAt)}</small>
                  </div>
                  <button onClick={() => onRestoreProject(project)}>
                    恢复 <ArrowRight size={15} />
                  </button>
                </article>
              ))}
            </div>
          ) : (
            <div className="archive-empty">
              <Archive size={22} />
              <h3>归档库还是空的</h3>
              <p>当你想先放下某个想法或项目时，它会安静地留在这里。</p>
            </div>
          )}
        </section>
      ) : (
        <>
          <div className="profile-summary">
            <section className="focus-card">
              <div className="eyebrow">NOW</div>
              <h2>此刻，你正留下自己的线。</h2>
              <p>想法、项目和每一次真实投入，都在这里慢慢连起来。</p>
              <div className="stats">
                <div>
                  <b>{activeIdeas.length}</b>
                  <small>正在保存的想法</small>
                </div>
                <div>
                  <b>{activeProjects.length}</b>
                  <small>正在进行的项目</small>
                </div>
                <div>
                  <b>{formatMinutes(totalMinutes)}</b>
                  <small>累计记录时间</small>
                </div>
              </div>
            </section>
            <section className="model-teaser">
              <KeyRound size={20} />
              <div>
                <div className="eyebrow">YOUR MODEL</div>
                <h2>
                  {llmConfig.configured
                    ? `${llmConfig.model} 已配置`
                    : "查看 AI 模型连接"}
                </h2>
                <p>
                  {llmConfig.configured
                    ? "探索和项目对话共用，支持测试连接。"
                    : "填写 API Key，连接你自己的模型。"}
                </p>
              </div>
              <button onClick={() => setTab("model")}>
                管理连接 <ArrowRight size={15} />
              </button>
            </section>
          </div>
        </>
      )}
    </div>
  );
}
