"use client";

import { useState } from "react";
import {
  BookOpen,
  Compass,
  Lightbulb,
  Menu,
  Plus,
  Timer,
  UserRound,
} from "lucide-react";
import { api } from "@/lib/api/client";
import type {
  ActiveTimer,
  ActivityRecord,
  Idea,
  Project,
  Tag,
  User,
} from "@/lib/types";
import { readTimer, writeTimer } from "@/lib/preferences";
import { Explore } from "@/features/explore/Explore";
import { Ideas } from "@/features/ideas/Ideas";
import { Projects } from "@/features/projects/Projects";
import { Records } from "@/features/records/Records";
import { Profile } from "@/features/profile/Profile";
import { LegacyImport } from "./LegacyImport";
import { useWorkspace } from "./useWorkspace";

type View = "explore" | "ideas" | "projects" | "records" | "profile";
const nav: [View, string, typeof Compass][] = [
  ["explore", "探索", Compass],
  ["ideas", "想法", Lightbulb],
  ["projects", "项目", BookOpen],
  ["records", "记录", Timer],
  ["profile", "我的", UserRound],
];

export function Workspace({
  user,
  logout,
  onUpdateUser,
}: {
  user: User;
  logout: () => void;
  onUpdateUser: (user: User) => void;
}) {
  const {
    ideas,
    projects,
    tags,
    records: activityRecords,
    messages: projectMessages,
    llm: llmConfig,
    loading,
    error,
    busy,
    refresh,
    mutate,
    setLlm,
  } = useWorkspace();
  const [view, setView] = useState<View>("explore");
  const [profileTab, setProfileTab] = useState<
    "overview" | "model" | "archive" | "settings"
  >("overview");
  const [menu, setMenu] = useState(false);
  const [selectedIdeaId, setSelectedIdeaId] = useState<string | null>(null);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(
    null,
  );
  const [activeTimer, updateTimer] = useState<ActiveTimer | null>(() =>
    readTimer(user.id),
  );
  const setActiveTimer = (timer: ActiveTimer | null) => {
    writeTimer(user.id, timer);
    updateTimer(timer);
  };
  const go = (next: View) => {
    if (next === "profile") setProfileTab("overview");
    setView(next);
    setMenu(false);
  };
  const openModelSettings = () => {
    go("profile");
    setProfileTab("model");
  };
  const addIdea = async (
    input: Omit<Idea, "id" | "createdAt" | "updatedAt">,
  ) => {
    const result = await mutate(() => api.ideas.create(input));
    if (!result) return false;
    setSelectedIdeaId(null);
    go("ideas");
    return true;
  };
  const updateIdea = async (idea: Idea) =>
    Boolean(
      await mutate(() =>
        api.ideas.update(idea.id, {
          title: idea.title,
          content: idea.content,
          tagIds: idea.tagIds,
          status: idea.status,
        }),
      ),
    );
  const updateProject = async (project: Project) =>
    Boolean(
      await mutate(() =>
        api.projects.update(project.id, {
          title: project.title,
          description: project.description,
          innerThoughts: project.innerThoughts,
          status: project.status,
        }),
      ),
    );
  const removeIdea = async (id: string) => {
    const result = await mutate(() => api.ideas.remove(id));
    if (!result) return false;
    setSelectedIdeaId(null);
    return true;
  };
  const openProject = (id: string) => {
    setSelectedProjectId(id);
    go("projects");
  };
  const createFromIdea = async (idea: Idea) => {
    const existing = projects.find((item) => item.linkedIdeaId === idea.id);
    if (existing) {
      openProject(existing.id);
      return true;
    }
    const result = await mutate(() =>
      api.projects.create({
        title: idea.title,
        description: idea.content,
        status: "active",
        linkedIdeaId: idea.id,
      }),
    );
    if (!result) return false;
    openProject(result.value.id);
    return true;
  };
  const continueProject = () => {
    const project = projects.find(
      (item) => item.status === "active" || item.status === "paused",
    );
    if (project) openProject(project.id);
  };
  const addRecord = async (record: Omit<ActivityRecord, "id">) =>
    Boolean(await mutate(() => api.records.create(record)));
  const createTag = async (tag: Pick<Tag, "name" | "parentId">) =>
    Boolean(await mutate(() => api.tags.create(tag)));
  const updateTag = async (tag: Tag) =>
    Boolean(
      await mutate(() =>
        api.tags.update(tag.id, { name: tag.name, parentId: tag.parentId }),
      ),
    );
  const deleteTag = async (id: string) =>
    Boolean(await mutate(() => api.tags.remove(id)));
  if (loading)
    return (
      <main className="auth-page">
        <p>正在读取你的内容…</p>
      </main>
    );
  return (
    <main className="app">
      {busy && (
        <div className="workspace-status" role="status">
          正在保存…
        </div>
      )}
      <aside className={menu ? "side open" : "side"}>
        <div className="brand">
          <Mark />
          Ariadne
        </div>
        <p className="motto">
          Find your way
          <br />
          through the maze.
        </p>
        <nav>
          {nav.map(([itemView, label, Icon]) => (
            <button
              key={itemView}
              className={view === itemView ? "active" : ""}
              onClick={() => go(itemView)}
            >
              <Icon size={18} />
              {label}
              {itemView === "ideas" && (
                <b>
                  {ideas.filter((idea) => idea.status !== "archived").length}
                </b>
              )}
            </button>
          ))}
        </nav>
        <small>
          ○ ┄ ○ ┄ <i>●</i> ┄ ○<br />
          <br />
          你正在留下自己的线。
        </small>
      </aside>
      <header className="mobile">
        <button aria-label="打开导航" onClick={() => setMenu(true)}>
          <Menu />
        </button>
        <div className="brand">
          <Mark />
          Ariadne
        </div>
        <button aria-label="查看想法" onClick={() => go("ideas")}>
          <Plus />
        </button>
      </header>
      <section className="content">
        {error && (
          <div className="connection-notice" role="alert">
            <span>{error}</span>
            <button onClick={() => void refresh()}>重试刷新</button>
          </div>
        )}
        <LegacyImport email={user.email} onRefresh={refresh} />
        {view === "explore" && (
          <Explore
            llmConfig={llmConfig}
            onOpenModelSettings={openModelSettings}
            onCreateIdea={addIdea}
            onContinue={continueProject}
            hasProject={projects.some(
              (item) => item.status === "active" || item.status === "paused",
            )}
          />
        )}
        {view === "ideas" && (
          <Ideas
            ideas={ideas}
            tags={tags}
            projects={projects}
            selectedIdeaId={selectedIdeaId}
            onSelectIdea={setSelectedIdeaId}
            onCreateIdea={addIdea}
            onUpdateIdea={updateIdea}
            onDeleteIdea={removeIdea}
            onCreateTag={createTag}
            onUpdateTag={updateTag}
            onDeleteTag={deleteTag}
            onOpenProject={openProject}
            onCreateProject={createFromIdea}
          />
        )}
        {view === "projects" && (
          <Projects
            projects={projects}
            ideas={ideas}
            messages={projectMessages}
            llmConfig={llmConfig}
            activeTimer={activeTimer}
            selectedProjectId={selectedProjectId}
            onSelect={setSelectedProjectId}
            onUpdate={updateProject}
            onSetTimer={setActiveTimer}
            onAddRecord={addRecord}
            onRefresh={refresh}
            onOpenIdea={(id) => {
              setSelectedIdeaId(id);
              go("ideas");
            }}
            onOpenModelSettings={openModelSettings}
          />
        )}
        {view === "records" && (
          <Records
            records={activityRecords}
            tags={tags}
            projects={projects}
            onAdd={addRecord}
          />
        )}
        {view === "profile" && (
          <Profile
            user={user}
            onUpdateUser={onUpdateUser}
            logout={logout}
            initialTab={profileTab}
            ideas={ideas}
            projects={projects}
            records={activityRecords}
            llmConfig={llmConfig}
            onUpdateModel={setLlm}
            onRestoreIdea={async (idea) => {
              if (await updateIdea({ ...idea, status: "inbox" })) {
                setSelectedIdeaId(idea.id);
                go("ideas");
              }
            }}
            onRestoreProject={async (project) => {
              if (await updateProject({ ...project, status: "active" })) {
                setSelectedProjectId(project.id);
                go("projects");
              }
            }}
          />
        )}
      </section>
      <nav className="bottom">
        {nav.map(([itemView, label, Icon]) => (
          <button
            key={itemView}
            className={view === itemView ? "active" : ""}
            onClick={() => go(itemView)}
          >
            <Icon size={19} />
            <span>{label}</span>
          </button>
        ))}
      </nav>
    </main>
  );
}
function Mark() {
  return (
    <span className="mark">
      <i />
      <i />
      <i />
    </span>
  );
}
