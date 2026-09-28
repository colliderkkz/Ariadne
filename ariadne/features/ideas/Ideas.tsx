"use client";
import { useState } from "react";
import {
  Archive,
  ArrowLeft,
  ArrowRight,
  Pencil,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react";
import type { Idea, Project, Tag } from "@/lib/types";
import { dateLabel, ideaTitle } from "@/lib/format";
import { TagManager, TagPills, TagPicker } from "@/features/tags/Tags";
type IdeasTab = "ideas" | "tags";

export function Ideas({
  ideas,
  tags,
  projects,
  selectedIdeaId,
  onSelectIdea,
  onCreateIdea,
  onUpdateIdea,
  onDeleteIdea,
  onCreateTag,
  onUpdateTag,
  onDeleteTag,
  onOpenProject,
  onCreateProject,
}: {
  ideas: Idea[];
  tags: Tag[];
  projects: Project[];
  selectedIdeaId: string | null;
  onSelectIdea: (id: string | null) => void;
  onCreateIdea: (
    input: Omit<Idea, "id" | "createdAt" | "updatedAt">,
  ) => Promise<boolean>;
  onUpdateIdea: (idea: Idea) => Promise<boolean>;
  onDeleteIdea: (id: string) => Promise<boolean>;
  onCreateTag: (data: Pick<Tag, "name" | "parentId">) => Promise<boolean>;
  onUpdateTag: (tag: Tag) => Promise<boolean>;
  onDeleteTag: (id: string) => Promise<boolean>;
  onOpenProject: (id: string) => void;
  onCreateProject: (idea: Idea) => Promise<boolean>;
}) {
  const [tab, setTab] = useState<IdeasTab>("ideas");
  const [formOpen, setFormOpen] = useState(false);
  const [content, setContent] = useState("");
  const [search, setSearch] = useState("");
  const [filterTagId, setFilterTagId] = useState<string | null>(null);
  const selected = ideas.find((idea) => idea.id === selectedIdeaId) ?? null;
  const activeFilterIds = filterTagId
    ? [
        filterTagId,
        ...tags
          .filter((tag) => tag.parentId === filterTagId)
          .map((tag) => tag.id),
      ]
    : [];
  const visible = ideas.filter(
    (idea) =>
      idea.status !== "archived" &&
      (!activeFilterIds.length ||
        idea.tagIds.some((id) => activeFilterIds.includes(id))) &&
      `${idea.title} ${idea.content}`
        .toLowerCase()
        .includes(search.toLowerCase()),
  );
  const save = async () => {
    if (!content.trim()) return;
    if (
      !(await onCreateIdea({
        title: ideaTitle(content),
        content: content.trim(),
        tagIds: [],
        status: "inbox",
      }))
    )
      return;
    setContent("");
    setFormOpen(false);
  };
  if (selected)
    return (
      <IdeaDetail
        key={selected.id}
        idea={selected}
        tags={tags}
        project={projects.find(
          (project) => project.linkedIdeaId === selected.id,
        )}
        onBack={() => onSelectIdea(null)}
        onSave={onUpdateIdea}
        onDelete={() => onDeleteIdea(selected.id)}
        onOpenProject={onOpenProject}
        onCreateProject={() => onCreateProject(selected)}
      />
    );
  return (
    <div className="page">
      <header>
        <div>
          <div className="eyebrow">IDEA INBOX</div>
          <h1>想法，不必立刻变成计划。</h1>
          <p>把它们先放在这里，等准备好的时候再靠近一点。</p>
        </div>
        <button className="primary" onClick={() => setFormOpen(true)}>
          <Plus size={16} />
          记下想法
        </button>
      </header>
      <div className="view-tabs">
        <button
          className={tab === "ideas" ? "active" : ""}
          onClick={() => setTab("ideas")}
        >
          全部想法
        </button>
        <button
          className={tab === "tags" ? "active" : ""}
          onClick={() => setTab("tags")}
        >
          标签
        </button>
      </div>
      {tab === "tags" ? (
        <TagManager
          tags={tags}
          ideas={ideas}
          onCreate={onCreateTag}
          onUpdate={onUpdateTag}
          onDelete={onDeleteTag}
          onFilter={(id) => {
            setFilterTagId(id);
            setTab("ideas");
          }}
        />
      ) : (
        <>
          <div className="searchbar">
            <Search size={16} />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="搜索想法"
            />
            {filterTagId && (
              <button onClick={() => setFilterTagId(null)}>清除标签筛选</button>
            )}
          </div>
          {formOpen && (
            <div className="idea-form">
              <textarea
                autoFocus
                value={content}
                onChange={(event) => setContent(event.target.value)}
                placeholder="脑子里刚刚闪过什么？"
              />
              <div>
                <button className="primary" onClick={save}>
                  保存
                </button>
                <button
                  className="icon-button"
                  onClick={() => setFormOpen(false)}
                >
                  <X size={18} />
                </button>
              </div>
            </div>
          )}
          <div className="idea-list">
            {visible.map((idea) => (
              <button
                className="idea-row"
                key={idea.id}
                onClick={() => onSelectIdea(idea.id)}
              >
                <i />
                <div>
                  <h2>{idea.title}</h2>
                  <p>
                    {idea.tagIds
                      .map((id) => tags.find((tag) => tag.id === id))
                      .filter(Boolean)
                      .map((tag) => `#${tag!.name}`)
                      .join("　") || "未分类"}
                    　{dateLabel(idea.createdAt)}
                  </p>
                </div>
                {idea.status === "convertedToProject" && (
                  <span>已开启项目</span>
                )}
              </button>
            ))}
            {!visible.length && (
              <p className="empty-note">这里还没有符合条件的想法。</p>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function IdeaDetail({
  idea,
  tags,
  project,
  onBack,
  onSave,
  onDelete,
  onOpenProject,
  onCreateProject,
}: {
  idea: Idea;
  tags: Tag[];
  project?: Project;
  onBack: () => void;
  onSave: (idea: Idea) => Promise<boolean>;
  onDelete: () => Promise<boolean>;
  onOpenProject: (id: string) => void;
  onCreateProject: () => Promise<boolean>;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(idea);
  const [confirming, setConfirming] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const toggleTag = (id: string) =>
    setDraft((current) => ({
      ...current,
      tagIds: current.tagIds.includes(id)
        ? current.tagIds.filter((item) => item !== id)
        : [...current.tagIds, id],
    }));
  const save = async () => {
    if (!draft.title.trim()) return;
    if (
      !(await onSave({
        ...draft,
        title: draft.title.trim(),
        content: draft.content.trim(),
      }))
    )
      return;
    setEditing(false);
  };
  return (
    <div className="page detail">
      <button className="back" onClick={onBack}>
        <ArrowLeft size={16} />
        返回想法
      </button>
      {editing ? (
        <>
          <label className="idea-edit-field">
            <span>标题</span>
            <input
              className="detail-title-input"
              value={draft.title}
              onChange={(event) =>
                setDraft({ ...draft, title: event.target.value })
              }
              placeholder="为这个想法起个名字"
            />
          </label>
          <label className="idea-edit-field">
            <span>详细介绍</span>
            <textarea
              className="detail-content"
              value={draft.content}
              onChange={(event) =>
                setDraft({ ...draft, content: event.target.value })
              }
              placeholder="写下它为什么值得被记住、你想从哪里开始…"
            />
          </label>
          <TagPicker
            tags={tags}
            selectedIds={draft.tagIds}
            onToggle={toggleTag}
            open={pickerOpen}
            setOpen={setPickerOpen}
          />
          <div className="detail-actions">
            <button
              onClick={() => {
                setDraft(idea);
                setEditing(false);
              }}
            >
              取消
            </button>
            <button className="primary" onClick={save}>
              保存想法
            </button>
          </div>
        </>
      ) : (
        <>
          <div className="eyebrow">
            {idea.status === "convertedToProject" ? "已开启项目" : "IDEA"}
          </div>
          <h1>{idea.title}</h1>
          <section className="idea-description">
            <h2>详细介绍</h2>
            <p className="detail-content read-only">
              {idea.content || "还没有补充介绍。"}
            </p>
          </section>
          <section className="detail-section">
            <h2>标签</h2>
            <TagPills ids={idea.tagIds} tags={tags} />
            <button className="text-button" onClick={() => setEditing(true)}>
              <Pencil size={14} />
              编辑标题、详细介绍与标签
            </button>
          </section>
          {idea.status === "convertedToProject" ? (
            project ? (
              <section className="converted">
                <b>✓ 已开启项目</b>
                <p>这个想法仍会保留，作为项目开始的来处。</p>
                <button
                  className="primary"
                  onClick={() => onOpenProject(project.id)}
                >
                  查看项目 <ArrowRight size={15} />
                </button>
              </section>
            ) : (
              <section className="converted">
                <b>✓ 已开启项目</b>
                <p>关联的项目记录暂时不可用。</p>
              </section>
            )
          ) : (
            <section className="start-project">
              <h2>准备好开始推进它了吗？</h2>
              <p>想法会继续留在这里；开启项目后，可以从项目页继续前进。</p>
              <button className="primary" onClick={() => setConfirming(true)}>
                开启这个项目 <ArrowRight size={16} />
              </button>
            </section>
          )}
          <div className="detail-actions secondary">
            <button onClick={() => setEditing(true)}>
              <Pencil size={14} />
              编辑想法
            </button>
            <button onClick={() => onSave({ ...idea, status: "archived" })}>
              <Archive size={14} />
              归档
            </button>
            <button
              className="danger"
              onClick={() => {
                if (window.confirm("删除这个想法？此操作不可恢复。"))
                  onDelete();
              }}
            >
              <Trash2 size={14} />
              删除
            </button>
          </div>
        </>
      )}
      {confirming && (
        <div className="dialog-backdrop">
          <div className="dialog">
            <div className="eyebrow">开启项目</div>
            <h2>你准备开始推进这个想法了吗？</h2>
            <p>
              「{idea.title}
              」会被创建为一个新的项目。原始想法仍然会被保留，你之后仍然可以回来查看。
            </p>
            <div className="dialog-actions">
              <button onClick={() => setConfirming(false)}>取消</button>
              <button className="primary" onClick={onCreateProject}>
                开启项目
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
