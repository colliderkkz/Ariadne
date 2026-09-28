"use client";
import { useState } from "react";
import {
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Plus,
  X,
} from "lucide-react";
import type { Project, Tag, ActivityRecord } from "@/lib/types";
import {
  tagPath,
  formatMinutes,
  dateInputValue,
  timeInputValue,
} from "@/lib/format";
type RecordsPeriod = "day" | "week" | "month" | "year";

function startOfRecordPeriod(value: Date, period: RecordsPeriod) {
  const start = new Date(value);
  start.setHours(0, 0, 0, 0);
  if (period === "week") {
    const day = start.getDay() || 7;
    start.setDate(start.getDate() - day + 1);
  }
  if (period === "month") start.setDate(1);
  if (period === "year") {
    start.setMonth(0, 1);
  }
  return start;
}

function endOfRecordPeriod(value: Date, period: RecordsPeriod) {
  const end = startOfRecordPeriod(value, period);
  if (period === "day") end.setDate(end.getDate() + 1);
  if (period === "week") end.setDate(end.getDate() + 7);
  if (period === "month") end.setMonth(end.getMonth() + 1);
  if (period === "year") end.setFullYear(end.getFullYear() + 1);
  return end;
}

function moveRecordPeriod(
  value: Date,
  period: RecordsPeriod,
  direction: number,
) {
  const next = new Date(value);
  if (period === "day") next.setDate(next.getDate() + direction);
  if (period === "week") next.setDate(next.getDate() + direction * 7);
  if (period === "month") next.setMonth(next.getMonth() + direction);
  if (period === "year") next.setFullYear(next.getFullYear() + direction);
  return next;
}

export function Records({
  records,
  tags,
  projects,
  onAdd,
}: {
  records: ActivityRecord[];
  tags: Tag[];
  projects: Project[];
  onAdd: (record: Omit<ActivityRecord, "id">) => Promise<boolean>;
}) {
  const [period, setPeriod] = useState<RecordsPeriod>("day");
  const [anchor, setAnchor] = useState(() => new Date());
  const [formOpen, setFormOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [minutes, setMinutes] = useState("45");
  const [tagId, setTagId] = useState("");
  const [projectId, setProjectId] = useState("");
  const [note, setNote] = useState("");
  const [recordDate, setRecordDate] = useState(() =>
    dateInputValue(new Date()),
  );
  const [recordTime, setRecordTime] = useState(() =>
    timeInputValue(new Date()),
  );
  const start = startOfRecordPeriod(anchor, period);
  const end = endOfRecordPeriod(anchor, period);
  const shown = records
    .filter((record) => {
      const date = new Date(record.completedAt);
      return date >= start && date < end;
    })
    .sort((a, b) => +new Date(b.completedAt) - +new Date(a.completedAt));
  const total = shown.reduce((sum, record) => sum + record.minutes, 0);
  const colors = ["#c7663d", "#756199", "#cf9a54", "#5c8276", "#a56d86"];
  const colorFor = (record: ActivityRecord) =>
    colors[
      Math.abs(
        (record.projectId ?? record.tagId ?? record.title)
          .split("")
          .reduce((sum, char) => sum + char.charCodeAt(0), 0),
      ) % colors.length
    ];
  const rangeLabel =
    period === "day"
      ? new Intl.DateTimeFormat("zh-CN", {
          month: "long",
          day: "numeric",
          weekday: "long",
        }).format(anchor)
      : period === "week"
        ? `${new Intl.DateTimeFormat("zh-CN", { month: "numeric", day: "numeric" }).format(start)} — ${new Intl.DateTimeFormat("zh-CN", { month: "numeric", day: "numeric" }).format(new Date(end.getTime() - 1))}`
        : period === "month"
          ? new Intl.DateTimeFormat("zh-CN", {
              year: "numeric",
              month: "long",
            }).format(anchor)
          : `${anchor.getFullYear()} 年`;
  const labels =
    period === "week"
      ? ["一", "二", "三", "四", "五", "六", "日"]
      : period === "month"
        ? ["第 1 周", "第 2 周", "第 3 周", "第 4 周", "第 5 周"]
        : [
            "1月",
            "2月",
            "3月",
            "4月",
            "5月",
            "6月",
            "7月",
            "8月",
            "9月",
            "10月",
            "11月",
            "12月",
          ];
  const values = labels.map((_, index) =>
    shown.reduce((sum, record) => {
      const date = new Date(record.completedAt);
      if (period === "week")
        return (date.getDay() || 7) === index + 1 ? sum + record.minutes : sum;
      if (period === "year")
        return date.getMonth() === index ? sum + record.minutes : sum;
      return Math.floor((date.getDate() - 1) / 7) === index
        ? sum + record.minutes
        : sum;
    }, 0),
  );
  const maxValue = Math.max(...values, 1);
  const save = async () => {
    const duration = Number(minutes);
    if (!title.trim() || !Number.isFinite(duration) || duration <= 0) return;
    const startedAt = new Date(`${recordDate}T${recordTime}:00`);
    const completedAt = new Date(startedAt.getTime() + duration * 60000);
    if (
      !(await onAdd({
        title: title.trim(),
        minutes: duration,
        tagId: tagId || null,
        projectId: projectId || null,
        note: note.trim(),
        startedAt: startedAt.toISOString(),
        completedAt: completedAt.toISOString(),
      }))
    )
      return;
    setTitle("");
    setMinutes("45");
    setTagId("");
    setProjectId("");
    setNote("");
    setRecordTime(timeInputValue(new Date()));
    setFormOpen(false);
  };
  const timelineHours = Array.from({ length: 19 }, (_, index) => index + 6);
  const timelineRecords = shown.map((record) => {
    const completed = new Date(record.completedAt);
    const started = record.startedAt
      ? new Date(record.startedAt)
      : new Date(completed.getTime() - record.minutes * 60000);
    const startMinute = started.getHours() * 60 + started.getMinutes();
    const top = Math.max(0, Math.min(100, ((startMinute - 360) / 1080) * 100));
    const height = Math.max(
      2.8,
      Math.min(100 - top, (record.minutes / 1080) * 100),
    );
    return { record, started, completed, top, height };
  });
  return (
    <div className="page records-page">
      <header className="records-heading">
        <div>
          <div className="eyebrow">TIME DIARY</div>
          <h1>今天的时间，落在哪里</h1>
          <p>计时完成后会自动落入一天的时间轴，也可以手动补记。</p>
        </div>
        <button
          className="primary"
          onClick={() => setFormOpen((open) => !open)}
        >
          {formOpen ? <X size={16} /> : <Plus size={16} />}
          {formOpen ? "收起" : "补记时间"}
        </button>
      </header>
      {formOpen && (
        <section className="record-form calendar-form">
          <label className="record-title-field">
            <span>做了什么？</span>
            <input
              autoFocus
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="例如：整理项目访谈笔记"
            />
          </label>
          <label>
            <span>日期</span>
            <input
              type="date"
              value={recordDate}
              onChange={(event) => setRecordDate(event.target.value)}
            />
          </label>
          <label>
            <span>开始</span>
            <input
              type="time"
              value={recordTime}
              onChange={(event) => setRecordTime(event.target.value)}
            />
          </label>
          <label>
            <span>时长</span>
            <input
              type="number"
              min="1"
              value={minutes}
              onChange={(event) => setMinutes(event.target.value)}
            />
            <em>分钟</em>
          </label>
          <label>
            <span>关联项目</span>
            <select
              value={projectId}
              onChange={(event) => setProjectId(event.target.value)}
            >
              <option value="">不关联</option>
              {projects
                .filter((project) => project.status !== "archived")
                .map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.title}
                  </option>
                ))}
            </select>
          </label>
          <label>
            <span>标签</span>
            <select
              value={tagId}
              onChange={(event) => setTagId(event.target.value)}
            >
              <option value="">不分类</option>
              {tags
                .filter((tag) => tag.parentId !== null)
                .map((tag) => (
                  <option key={tag.id} value={tag.id}>
                    {tagPath(tag, tags)}
                  </option>
                ))}
            </select>
          </label>
          <label className="record-note-field">
            <span>备注</span>
            <input
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="可选"
            />
          </label>
          <button className="primary" onClick={save}>
            留下记录 <ArrowRight size={16} />
          </button>
        </section>
      )}
      <div className="record-toolbar">
        <div
          className="record-periods"
          role="tablist"
          aria-label="记录时间范围"
        >
          {(["day", "week", "month", "year"] as RecordsPeriod[]).map((item) => (
            <button
              key={item}
              className={period === item ? "active" : ""}
              onClick={() => setPeriod(item)}
              role="tab"
              aria-selected={period === item}
            >
              {{ day: "日", week: "周", month: "月", year: "年" }[item]}
            </button>
          ))}
        </div>
        <div className="record-range">
          <button
            aria-label="查看上一段时间"
            onClick={() =>
              setAnchor((current) => moveRecordPeriod(current, period, -1))
            }
          >
            <ChevronLeft size={18} />
          </button>
          <b>{rangeLabel}</b>
          <button
            aria-label="查看下一段时间"
            onClick={() =>
              setAnchor((current) => moveRecordPeriod(current, period, 1))
            }
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </div>
      {shown.length ? (
        <>
          {period === "day" ? (
            <div className="calendar-layout">
              <section className="day-timeline">
                <div className="timeline-summary">
                  <div>
                    <small>今天已记录</small>
                    <strong>{formatMinutes(total)}</strong>
                  </div>
                  <span>{shown.length} 段活动</span>
                </div>
                <div className="time-grid">
                  <div className="hour-labels">
                    {timelineHours.map((hour) => (
                      <span key={hour}>{String(hour).padStart(2, "0")}:00</span>
                    ))}
                  </div>
                  <div className="time-track">
                    {timelineHours.map((hour) => (
                      <i key={hour} />
                    ))}
                    {timelineRecords.map(
                      ({ record, started, completed, top, height }) => (
                        <article
                          className="time-block"
                          key={record.id}
                          style={{
                            top: `${top}%`,
                            height: `${height}%`,
                            background: colorFor(record),
                          }}
                        >
                          <div>
                            <b>{record.title}</b>
                            <span>
                              {timeInputValue(started)} –{" "}
                              {timeInputValue(completed)}
                            </span>
                          </div>
                          <strong>{formatMinutes(record.minutes)}</strong>
                        </article>
                      ),
                    )}
                  </div>
                </div>
              </section>
              <aside className="day-log">
                <div className="eyebrow">DAY LOG</div>
                <h2>今天发生过的事</h2>
                {shown.map((record) => (
                  <article key={record.id}>
                    <i style={{ background: colorFor(record) }} />
                    <div>
                      <b>{record.title}</b>
                      <span>
                        {projects.find(
                          (project) => project.id === record.projectId,
                        )?.title ??
                          tags.find((tag) => tag.id === record.tagId)?.name ??
                          "未分类"}
                        {record.note ? ` · ${record.note}` : ""}
                      </span>
                    </div>
                    <strong>{formatMinutes(record.minutes)}</strong>
                  </article>
                ))}
              </aside>
            </div>
          ) : (
            <>
              <section className="record-summary">
                <div>
                  <small>已经投入</small>
                  <strong>{formatMinutes(total)}</strong>
                  <p>{shown.length} 次真实发生的活动</p>
                </div>
                <div className="record-summary-note">
                  <Clock3 size={18} />
                  <span>时间会从每一次计时和补记中自动汇总。</span>
                </div>
              </section>
              <section className="record-chart overview-chart">
                <div className="chart-title">
                  <div>
                    <div className="eyebrow">TIME FLOW</div>
                    <h2>时间分布</h2>
                  </div>
                  <small>分钟</small>
                </div>
                <div className="record-bars">
                  {labels.map((label, index) => (
                    <div key={label}>
                      <span>
                        <i
                          style={{
                            height: `${Math.max((values[index] / maxValue) * 100, values[index] ? 8 : 0)}%`,
                          }}
                        />
                      </span>
                      <b>{label}</b>
                    </div>
                  ))}
                </div>
              </section>
              <section className="record-list">
                <div className="chart-title">
                  <div>
                    <div className="eyebrow">WHAT HAPPENED</div>
                    <h2>这段时间做过的事</h2>
                  </div>
                  <small>{shown.length} 条</small>
                </div>
                {shown.map((record) => (
                  <article key={record.id}>
                    <i style={{ background: colorFor(record) }} />
                    <div>
                      <h3>{record.title}</h3>
                      <p>
                        {projects.find(
                          (project) => project.id === record.projectId,
                        )?.title ??
                          tags.find((tag) => tag.id === record.tagId)?.name ??
                          "未分类"}{" "}
                        ·{" "}
                        {new Intl.DateTimeFormat("zh-CN", {
                          month: "numeric",
                          day: "numeric",
                          weekday: "short",
                        }).format(new Date(record.completedAt))}
                        {record.note ? ` · ${record.note}` : ""}
                      </p>
                    </div>
                    <b>{formatMinutes(record.minutes)}</b>
                  </article>
                ))}
              </section>
            </>
          )}
        </>
      ) : (
        <section className="records-empty">
          <Clock3 size={23} />
          <h2>这一段时间，还没有留下记录。</h2>
          <p>从项目页开始计时，或在这里补记一段。</p>
        </section>
      )}
    </div>
  );
}
