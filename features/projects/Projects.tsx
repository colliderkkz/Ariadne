"use client";
import { ProjectChat } from "@/features/chat/ProjectChat";
import { useState, useEffect, type KeyboardEvent } from "react";
import { ArrowRight, Play, Square } from "lucide-react";
import type {
  Idea,
  Project,
  ActivityRecord,
  ProjectMessage,
  ActiveTimer,
  LlmConfig,
} from "@/lib/types";

export function Projects({
  projects,
  ideas,
  messages,
  llmConfig,
  activeTimer,
  selectedProjectId,
  onSelect,
  onUpdate,
  onSetTimer,
  onAddRecord,
  onRefresh,
  onOpenIdea,
  onOpenModelSettings,
}: {
  projects: Project[];
  ideas: Idea[];
  messages: ProjectMessage[];
  llmConfig: LlmConfig;
  activeTimer: ActiveTimer | null;
  selectedProjectId: string | null;
  onSelect: (id: string) => void;
  onUpdate: (project: Project) => Promise<boolean>;
  onSetTimer: (timer: ActiveTimer | null) => void;
  onAddRecord: (record: Omit<ActivityRecord, "id">) => Promise<boolean>;
  onRefresh: () => Promise<void>;
  onOpenIdea: (id: string) => void;
  onOpenModelSettings: () => void;
}) {
  const visibleProjects = projects.filter((item) => item.status !== "archived");
  const project =
    visibleProjects.find((item) => item.id === selectedProjectId) ??
    visibleProjects[0];
  const [editingField, setEditingField] = useState<
    "title" | "description" | "thoughts" | null
  >(null);
  const [fieldDraft, setFieldDraft] = useState("");
  const [clockNow, setClockNow] = useState(() => Date.now());
  useEffect(() => {
    if (!activeTimer) return;
    const interval = window.setInterval(() => setClockNow(Date.now()), 1000);
    return () => window.clearInterval(interval);
  }, [activeTimer]);
  if (!project)
    return (
      <Placeholder
        title="项目"
        description="从一个想法开启项目后，它会出现在这里。归档的项目可以在「我的」里查看。"
      />
    );
  const idea = ideas.find((item) => item.id === project.linkedIdeaId);
  const beginEdit = (field: "title" | "description" | "thoughts") => {
    setFieldDraft(
      field === "title"
        ? project.title
        : field === "description"
          ? project.description
          : (project.innerThoughts ?? ""),
    );
    setEditingField(field);
  };
  const saveField = async () => {
    if (!editingField) return;
    const value = fieldDraft.trim();
    if (editingField === "title" && !value) {
      setEditingField(null);
      return;
    }
    if (
      !(await onUpdate({
        ...project,
        ...(editingField === "title"
          ? { title: value }
          : editingField === "description"
            ? { description: value }
            : { innerThoughts: value }),
      }))
    )
      return;
    setEditingField(null);
  };
  const cancelField = () => setEditingField(null);
  const editorKeyDown = (
    event: KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    if (event.key === "Escape") {
      event.preventDefault();
      cancelField();
    }
    if (
      event.key === "Enter" &&
      (event.currentTarget instanceof HTMLInputElement ||
        event.ctrlKey ||
        event.metaKey)
    )
      event.currentTarget.blur();
  };
  const currentMessages = messages
    .filter((message) => message.projectId === project.id)
    .sort((a, b) => +new Date(a.createdAt) - +new Date(b.createdAt));
  const isTiming = activeTimer?.projectId === project.id;
  const elapsedSeconds = isTiming
    ? Math.max(
        0,
        Math.floor(
          (clockNow - new Date(activeTimer.startedAt).getTime()) / 1000,
        ),
      )
    : 0;
  const elapsedLabel = `${String(Math.floor(elapsedSeconds / 3600)).padStart(2, "0")}:${String(Math.floor((elapsedSeconds % 3600) / 60)).padStart(2, "0")}:${String(elapsedSeconds % 60).padStart(2, "0")}`;
  const stopTimer = async () => {
    if (!activeTimer || activeTimer.projectId !== project.id) return;
    const completedAt = new Date();
    const seconds = Math.max(
      1,
      Math.round(
        (completedAt.getTime() - new Date(activeTimer.startedAt).getTime()) /
          1000,
      ),
    );
    if (
      !(await onAddRecord({
        title: project.title,
        minutes: seconds / 60,
        tagId: null,
        projectId: project.id,
        note: "项目推进计时",
        startedAt: activeTimer.startedAt,
        completedAt: completedAt.toISOString(),
      }))
    )
      return;
    onSetTimer(null);
  };
  return (
    <div className="project">
      <aside>
        <div className="listtitle">
          项目 <b>{visibleProjects.length}</b>
        </div>
        {visibleProjects.map((item) => (
          <button
            className={item.id === project.id ? "selected" : ""}
            onClick={() => {
              cancelField();
              onSelect(item.id);
            }}
            key={item.id}
          >
            <i
              className={activeTimer?.projectId === item.id ? "timing-dot" : ""}
            />
            {item.title}
          </button>
        ))}
      </aside>
      <section>
        <div className="eyebrow">
          {project.status === "completed"
            ? "已完成"
            : project.status === "paused"
              ? "暂停中"
              : "进行中"}
        </div>
        {editingField === "title" ? (
          <input
            autoFocus
            className="project-title-editor"
            value={fieldDraft}
            onChange={(event) => setFieldDraft(event.target.value)}
            onBlur={saveField}
            onKeyDown={editorKeyDown}
            aria-label="项目标题"
          />
        ) : (
          <h1
            className="editable-project-text"
            onDoubleClick={() => beginEdit("title")}
          >
            {project.title}
          </h1>
        )}
        <div className="pstat">
          <span>
            ●{" "}
            <select
              aria-label="项目状态"
              value={project.status}
              onChange={(event) =>
                onUpdate({
                  ...project,
                  status: event.target.value as Project["status"],
                })
              }
            >
              <option value="active">进行中</option>
              <option value="paused">暂停</option>
              <option value="completed">已完成</option>
            </select>
          </span>
          {idea && (
            <button className="idea-link" onClick={() => onOpenIdea(idea.id)}>
              在想法中查看 <ArrowRight size={14} />
            </button>
          )}
          <button
            className="idea-link"
            onClick={() => onUpdate({ ...project, status: "archived" })}
          >
            归档
          </button>
        </div>
        <section className={`project-timer ${isTiming ? "running" : ""}`}>
          <div>
            <small>本次投入</small>
            <strong>{isTiming ? elapsedLabel : "00:00:00"}</strong>
            <p>
              {isTiming
                ? "停止后会自动进入时间记录"
                : activeTimer
                  ? "另一个项目正在计时"
                  : "开始一次专注，按次留下真实花费"}
            </p>
          </div>
          {isTiming ? (
            <button className="timer-stop" onClick={stopTimer}>
              <Square size={16} fill="currentColor" />
              停止并记录
            </button>
          ) : (
            <button
              className="timer-start"
              disabled={Boolean(activeTimer)}
              onClick={() =>
                onSetTimer({
                  projectId: project.id,
                  startedAt: new Date().toISOString(),
                })
              }
            >
              <Play size={17} fill="currentColor" />
              开始计时
            </button>
          )}
        </section>
        <section className="project-description">
          <small>项目说明</small>
          {editingField === "description" ? (
            <textarea
              autoFocus
              value={fieldDraft}
              onChange={(event) => setFieldDraft(event.target.value)}
              onBlur={saveField}
              onKeyDown={editorKeyDown}
              aria-label="项目说明"
            />
          ) : (
            <p
              className="editable-project-text"
              onDoubleClick={() => beginEdit("description")}
            >
              {project.description || "还没有补充项目说明。"}
            </p>
          )}
        </section>
        <section className="inner-thoughts">
          <div>
            <small>内心戏</small>
          </div>
          {editingField === "thoughts" ? (
            <textarea
              autoFocus
              aria-label="内心戏"
              value={fieldDraft}
              onChange={(event) => setFieldDraft(event.target.value)}
              onBlur={saveField}
              onKeyDown={editorKeyDown}
              placeholder="此刻你真正期待、犹豫或在意的是什么？"
            />
          ) : (
            <p
              className="editable-project-text"
              onDoubleClick={() => beginEdit("thoughts")}
            >
              {project.innerThoughts ||
                "这里留给你自己：不必是计划，也可以是一点还没有想明白的话。"}
            </p>
          )}
        </section>
        <ProjectChat
          key={project.id}
          project={project}
          messages={currentMessages}
          llmConfig={llmConfig}
          onRefresh={onRefresh}
          onOpenModelSettings={onOpenModelSettings}
        />
      </section>
    </div>
  );
}

function Placeholder({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="page placeholder-page">
      <div className="eyebrow">本轮范围之外</div>
      <h1>{title}</h1>
      <p>{description}</p>
    </div>
  );
}
