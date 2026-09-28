"use client";
import { useState } from "react";
import { Pencil, Trash2 } from "lucide-react";
import type { Idea, Tag } from "@/lib/types";
import { tagPath } from "@/lib/format";

export function TagManager({
  tags,
  ideas,
  onCreate,
  onUpdate,
  onDelete,
  onFilter,
}: {
  tags: Tag[];
  ideas: Idea[];
  onCreate: (data: Pick<Tag, "name" | "parentId">) => Promise<boolean>;
  onUpdate: (tag: Tag) => Promise<boolean>;
  onDelete: (id: string) => Promise<boolean>;
  onFilter: (id: string) => void;
}) {
  const [name, setName] = useState("");
  const [parentId, setParentId] = useState<string>("");
  const [editing, setEditing] = useState<Tag | null>(null);
  const [message, setMessage] = useState("");
  const parents = tags.filter((tag) => tag.parentId === null);
  const usageCount = (id: string) => {
    const included = [
      id,
      ...tags.filter((tag) => tag.parentId === id).map((tag) => tag.id),
    ];
    return ideas.filter((idea) =>
      idea.tagIds.some((tagId) => included.includes(tagId)),
    ).length;
  };
  const create = async () => {
    if (!name.trim()) return;
    if (!(await onCreate({ name: name.trim(), parentId: parentId || null })))
      return;
    setName("");
    setParentId("");
  };
  const deleteTag = async (tag: Tag) => {
    if (tag.type === "system") return;
    if (tags.some((item) => item.parentId === tag.id)) {
      setMessage("该一级标签下仍有子标签，请先删除或移动子标签。");
      return;
    }
    if (
      !window.confirm(`删除标签「${tag.name}」？想法不会被删除，只会解除关联。`)
    )
      return;
    if (await onDelete(tag.id)) setMessage("");
  };

  const linkedIdeas = ideas.filter((idea) => idea.tagIds.length > 0).length;
  return (
    <div className="tag-manager">
      <div className="tag-overview">
        <div>
          <div className="eyebrow">TAG LIBRARY</div>
          <h2>让每个想法有迹可循。</h2>
          <p>点击标签，回到所有与它有关的想法。</p>
        </div>
        <div className="tag-metrics">
          <span>
            <b>{parents.length}</b>个主题
          </span>
          <span>
            <b>{linkedIdeas}</b>条已标记想法
          </span>
        </div>
      </div>
      {message && <p className="form-message">{message}</p>}
      <div className="tag-tree">
        {parents.map((parent, parentIndex) => {
          const children = tags.filter((tag) => tag.parentId === parent.id);
          return (
            <section
              className={`tag-group tag-hue-${parentIndex % 5}`}
              key={parent.id}
            >
              <div className="tag-parent">
                <button onClick={() => onFilter(parent.id)}>
                  <i />
                  <span>
                    <b>{parent.name}</b>
                    <small>
                      {children.length
                        ? `${children.length} 个子标签`
                        : "一级标签"}
                    </small>
                  </span>
                  <em>
                    {usageCount(parent.id)} <small>想法</small>
                  </em>
                </button>
                {parent.type === "custom" && (
                  <TagButtons
                    onEdit={() => setEditing(parent)}
                    onDelete={() => deleteTag(parent)}
                  />
                )}
              </div>
              {children.length > 0 && (
                <div className="tag-children">
                  {children.map((child) => (
                    <div className="tag-child" key={child.id}>
                      <button onClick={() => onFilter(child.id)}>
                        <i />
                        {child.name}
                        <small>{usageCount(child.id)}</small>
                      </button>
                      {child.type === "custom" && (
                        <TagButtons
                          onEdit={() => setEditing(child)}
                          onDelete={() => deleteTag(child)}
                        />
                      )}
                    </div>
                  ))}
                </div>
              )}
            </section>
          );
        })}
      </div>
      <div className="tag-create">
        <div>
          <div className="eyebrow">CUSTOM TAG</div>
          <h2>新建标签</h2>
        </div>
        <input
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="名称，例如：摄影"
        />
        <select
          value={parentId}
          onChange={(event) => setParentId(event.target.value)}
        >
          <option value="">无 / 一级标签</option>
          {parents.map((tag) => (
            <option key={tag.id} value={tag.id}>
              {tag.name}
            </option>
          ))}
        </select>
        <button className="primary" onClick={create}>
          创建
        </button>
      </div>
      {editing && (
        <div className="dialog-backdrop">
          <div className="dialog">
            <h2>修改标签</h2>
            <input
              autoFocus
              value={editing.name}
              onChange={(event) =>
                setEditing({ ...editing, name: event.target.value })
              }
            />
            <div className="dialog-actions">
              <button onClick={() => setEditing(null)}>取消</button>
              <button
                className="primary"
                onClick={async () => {
                  if (!editing.name.trim()) return;
                  if (await onUpdate({ ...editing, name: editing.name.trim() }))
                    setEditing(null);
                }}
              >
                保存
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function TagButtons({
  onEdit,
  onDelete,
}: {
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <span className="tag-actions">
      <button aria-label="修改标签" onClick={onEdit}>
        <Pencil size={13} />
      </button>
      <button aria-label="删除标签" onClick={onDelete}>
        <Trash2 size={13} />
      </button>
    </span>
  );
}

export function TagPills({ ids, tags }: { ids: string[]; tags: Tag[] }) {
  return (
    <div className="tag-pills">
      {ids
        .map((id) => tags.find((tag) => tag.id === id))
        .filter(Boolean)
        .map((tag) => (
          <span key={tag!.id}>{tagPath(tag!, tags)}</span>
        ))}
      {!ids.length && <small>还没有标签</small>}
    </div>
  );
}

export function TagPicker({
  tags,
  selectedIds,
  onToggle,
  open,
  setOpen,
}: {
  tags: Tag[];
  selectedIds: string[];
  onToggle: (id: string) => void;
  open: boolean;
  setOpen: (value: boolean) => void;
}) {
  return (
    <section className="detail-section">
      <h2>标签</h2>
      <div className="tag-pills">
        {selectedIds
          .map((id) => tags.find((tag) => tag.id === id))
          .filter(Boolean)
          .map((tag) => (
            <button key={tag!.id} onClick={() => onToggle(tag!.id)}>
              {tagPath(tag!, tags)} ×
            </button>
          ))}
        <button className="add-tag" onClick={() => setOpen(!open)}>
          + 添加标签
        </button>
      </div>
      {open && (
        <div className="tag-picker">
          {tags.map((tag) => (
            <button
              key={tag.id}
              className={selectedIds.includes(tag.id) ? "selected" : ""}
              onClick={() => onToggle(tag.id)}
            >
              {selectedIds.includes(tag.id) ? "✓ " : ""}
              {tagPath(tag, tags)}
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
