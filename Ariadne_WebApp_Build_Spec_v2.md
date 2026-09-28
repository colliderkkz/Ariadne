# Ariadne — Web App Build Specification (精简版)

## 1. 项目概述与边界

**Ariadne** — *Find your way through the maze. / 找到属于自己的路。*

一个帮助用户从「我不知道自己想做什么」走到「那我先开始做点什么」的个人探索与行动 App。

**产品隐喻**：源自希腊神话，Ariadne 给 Theseus 一团线，让他能进入迷宫、找到出口并原路返回。App 不负责告诉用户唯一正确答案，只提供一根可以不断延伸的「线」——用户的每次选择、想法、项目和行动都是这条线的一部分，最终可以回头看见自己走过的路。

**核心闭环**：模糊欲望 → 探索 → 想法 → 项目 → 开始行动 → 记录 → 回望 → 再次探索

**最重要的产品边界**：
> Ariadne 不负责教用户把事情做完，它只负责降低"开始行动"的门槛。专业执行（写代码、Debug、拆任务）交给 ChatGPT / Codex / Claude / IDE 等工具；Ariadne 只帮用户找方向、保存想法、形成项目、留下行动痕迹。

不做：教编程、Debug、自动任务拆解、成为 IDE 或 Coding Agent 或 AI 教师。

如果某功能只是"感觉项目管理 App 应该有"，但不能直接帮助"从不知道做什么 → 开始行动"，就不要加。

## 2. Web App 定位

从 iOS App 调整为 **Responsive Web App**，兼容 Desktop / Tablet / Mobile。原因：更容易快速迭代、部署、展示；未来接数据库/AI Backend/账号体系更方便。第一阶段不做原生 iOS App。

## 3. 产品结构（五个 Tab）

```
探索 Explore → 想法 Ideas → 项目 Projects → 记录 Records → 我的 Profile
```
Desktop 用左侧 Sidebar，Mobile 用底部 Navigation。

## 4. Tab 1：探索 Explore

首页不是 Dashboard，核心问题「今天你想做什么？」但不直接要求输入答案——**选择 > 输入**。

首屏三个入口：`我不知道应该做什么` / `我有新的想法` / `我想继续推进之前的事情`。

选择「不知道做什么」后进入**分支提问**：每一步只给少量选项（如「学点新的东西/创造一些东西/出去体验/认识一些人/改变自己的生活」），逐步细化（动手/思考、短期/长期、独自/一起、线上/线下、时长）。不要一次显示大量问题。

最终给出推荐结果（`[我选这个] [换一批] [继续探索]`）。MVP 用**规则 + Tag 匹配**，不接 LLM。示例 tags：creative, technology, AI, visual, project, short, solo, offline。

```ts
interface BranchQuestion { id: string; title: string; options: BranchOption[]; }
interface BranchOption { id: string; title: string; tags: string[]; nextQuestionId?: string; }
interface ExploreResult { tags: string[]; preferredDuration?: "short"|"medium"|"long"; preferredMode?: "solo"|"together"; }
```
数据放 `data/branches/*.json`，推荐逻辑在 `features/explore/recommendation.ts`。

## 5. Tab 2：想法 Ideas

定位：**Idea Inbox**——用户可以毫无负担地把脑子里的东西扔进去，不需要提前决定它是不是项目、要不要执行、何时执行、怎么实现。

分类（MVP）：学习 / 技能 / 项目 / 旅行 / 体验 / 生活 / 阅读 / 其他，支持 Tags。

```ts
type IdeaStatus = "inbox" | "exploring" | "convertedToProject" | "archived";
interface Idea {
  id: string; title: string; content: string; category: string;
  tags: string[]; status: IdeaStatus; createdAt: string; updatedAt: string;
}
```

**原则：想法 ≠ 项目**，不要自动把所有 Idea 变成 Project。用户可以：保存 / 搁置 / 归档 / 继续探索 / 转化为项目。

## 6. Tab 3：项目 Projects

定位：不是 Project Management Workspace，而是「我正在做什么」的长期容器，主要保存**项目是什么 + 我和它聊过什么 + 我实际做过什么**。不负责管理完整工作流程（不需要 Kanban、甘特图、多级任务、依赖、KPI、燃尽图、自动计划）。

布局参考「左侧项目列表 + 右侧当前项目详情/对话」，可借鉴 Codex 式信息组织，但视觉交互应属于 Ariadne 自己，不强行复制。

### Project Chat

每个项目拥有独立的长期对话，价值：保存项目相关想法、犹豫与变化、用户自述的进展；重新打开项目时恢复上下文；为未来回望提供材料。

**边界**：不是教学聊天机器人。Ariadne 可以：整理表达、回顾历史、帮助澄清想法、陪用户思考是否继续、记录状态变化、做轻量总结。不需要：教编程、自动 Debug/写代码/运行代码、操作文件、自动拆解项目、成为 Agent。专业执行问题（如"MediaPipe 怎么接 Web？"）交给 ChatGPT/Codex/Claude。

```ts
type ProjectStatus = "active" | "paused" | "completed" | "archived";
interface Project {
  id: string; title: string; description: string; status: ProjectStatus;
  createdAt: string; updatedAt: string; linkedIdeaId?: string;
}
type MessageRole = "user" | "assistant";
interface ProjectMessage {
  id: string; projectId: string; role: MessageRole; content: string; createdAt: string;
}
```
**MVP 不创建 ProjectTask**——行动由 Execution Record 体现，而不是任务系统。

## 7. Tab 4：记录 Records

核心问题是「我实际上做了什么？」而不是「我计划做什么？」

```ts
interface ExecutionRecord {
  id: string; projectId?: string; date: string;
  startTime?: string; duration: number; note: string;
}
```
记录重点：什么时候 / 做了什么 / 花了多久 / 留下了什么。

UI 提供月视图 / 周视图 / Timeline / 每日记录 / 项目投入 / 时间统计。统计聚焦「你最近真正把时间放在哪里」，而非「你今天完成了吗」——**避免强制 Streak**。

## 8. Tab 5：我的 Profile

内容：个人信息、兴趣轨迹、行动统计、设置（通知/AI设置/数据管理/隐私）、关于。

「兴趣轨迹」展示用户真实留下的轨迹（如"最近记录较多的方向：AI / 视觉 / 开发 / 阅读 / 旅行"），**不要**生成"你的性格是……"这类判断性内容。

## 9. 数据模型总览

核心实体：`User / Idea / Project / ProjectMessage / ExecutionRecord / InterestTag`

```
User ── Ideas / Projects / ExecutionRecords
Idea ──(optional)──> Project ── ProjectMessages / ExecutionRecords
探索流：ExploreResult → Recommendation → Idea → Project
```
不加入：`ProjectTask / ProjectFile / Agent`

## 10. 技术栈与架构

**Frontend**：Next.js, React, TypeScript, Tailwind CSS, shadcn/ui（可选）, Lucide Icons
**Backend/Data**：Next.js Server Actions / Route Handlers, PostgreSQL, Prisma ORM

```
Browser → Next.js (Explore/Ideas/Projects/Records/Profile) → Server Actions/API → Prisma → PostgreSQL
```
快速 Demo 可先用浏览器本地存储，正式 MVP 建议尽早接入 PostgreSQL。

**工程结构建议**：
```
ariadne/
├── app/{page.tsx, explore/, ideas/, projects/, records/, profile/}
├── components/{navigation/, explore/, ideas/, projects/, records/, ui/}
├── features/{explore/{branch-engine.ts, questions.ts, recommendations.ts}, ideas/, projects/, records/}
├── lib/{db.ts, utils.ts, validation.ts}
├── prisma/schema.prisma
└── types/
```
不要求机械复制，可按实际工程调整。

**数据库表**：`users, ideas, projects, project_messages, execution_records, interest_tags`。MVP 可暂缓复杂权限、团队协作、多用户系统。

## 11. AI 规划（非 MVP 核心）

定位：**Organizer / Companion / Reflector**，而不是 Tutor / Coding Agent / Project Manager。

- **Idea Organizer**：把用户随口说的想法整理成标题/分类/标签，不生成完整开发教程。
- **Project Conversation**：AI 可读取项目名称、描述、历史对话、执行记录、状态，用于回顾/总结/整理/澄清/陪伴思考，但不能变成 Coding Agent。
- **Reflection**：基于真实记录生成观察性总结（如"过去一个月你实际尝试了 4 个项目，其中 3 个和视觉或 AI 有关"）——重点是**观察，而不是判断**。

## 12. MVP 开发顺序

```
1. Next.js + TypeScript 项目
2. Responsive Layout + Navigation
3. Explore（含 Branching Question Engine）
4. Ideas
5. Projects（含 Project Chat 持久化）
6. Execution Records
7. Records / Calendar
8. Profile
9. 打通 Explore → Idea → Project → Record 完整数据流
10. UI Polish
11. 测试
12. 部署
13. MVP 完成后再考虑接入 AI
```

开发中遇到需求歧义，优先遵守：**"帮助用户开始行动"高于"增加功能完整度"**。

## 13. MVP 明确不做

LLM / AI Agent / Coding Agent / 自动 Debug / 自动代码生成 / 自动任务拆解 / ProjectTask / IDE / 文件编辑器 / MCP / Agent Runtime

## 14. Responsive Design

Desktop：左侧 Sidebar（五个 Tab）+ 右侧主内容区；项目页为「项目列表 + 项目详情/对话」双栏。
Mobile：底部 Tab Bar；项目走「项目列表 → 项目详情 → 项目对话」的层级导航，不强行复制 Desktop 双栏。

## 15. 视觉方向

关键词：Minimal / Quiet / Literary / Modern / Warm / Personal / Slightly mysterious

避免：传统 SaaS 蓝色 Dashboard、过度 Cyberpunk、大量卡片与数据堆砌、强烈效率工具感。

核心视觉隐喻：**一条线穿过迷宫**（可用简单的点线路径表示用户留下的选择和行动轨迹），MVP 只需少量路径/线条/节点元素，不需要复杂动画。

## 16. 产品设计原则

1. **不要强迫用户知道答案** — 选择 > 输入
2. **Ariadne 不替用户决定人生** — 用"你最近留下的记录里，这些方向出现得比较多"，而不是"根据你的性格，你应该成为……"
3. **负责启动，不负责包办** — 目标是让用户开始行动，不是在 Ariadne 里完成所有事
4. **项目不是项目管理软件** — 只保存项目是什么、为什么开始、对话、状态、真实行动记录
5. **AI 是助手，不是导师** — 只整理/回顾/澄清/陪伴，不教知识/写代码/Debug/执行代码
6. **记录真实行动** — 回答"我实际上做了什么"
7. **不要制造焦虑** — 避免连续打卡、排名、KPI、"你今天什么都没做"、Streak 惩罚；观察用户而非监督用户
8. **允许迷路** — 暂停项目、放弃想法、改变兴趣都不是失败，这些变化本身就该被保存

## 17. 验收标准

- [ ] Web App 可正常启动，五个主导航可切换
- [ ] Explore：可完成一套分支问题，推荐系统能按 Tag 工作
- [ ] Ideas：可创建 / 编辑 / 删除 / 分类，可转化为 Project
- [ ] Projects：可创建、查看详情，拥有独立对话且可持久化
- [ ] Records：可创建 Execution Record 并关联 Project，Calendar/Timeline 可查看，可查看基础统计
- [ ] Profile 可正常使用
- [ ] 刷新页面后数据不丢失，核心流程无死路，不依赖 LLM 也能运行

## 18. 最终产品目标

Ariadne 既不是「更好的 Todo App」，也不是「网页版 Codex」，而是**一个帮助人从"不知道自己想做什么"走到"我先开始做一点"的地方**。它不需要告诉用户终点在哪里，只需要给用户一根线。

> Find your way through the maze.
