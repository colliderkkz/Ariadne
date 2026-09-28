# Ariadne — Web App Build Specification

## 1. 项目概述

项目名称：**Ariadne**

副标题候选：

> Find your way through the maze.

中文定位：

> **找到属于自己的路。**

Ariadne 是一个帮助用户从：

> “我不知道自己想做什么。”

走向：

> “那我先开始做点什么。”

的个人探索与行动 App。

它不是 Todo App，不是传统项目管理工具，也不是 Codex / IDE 的替代品。

最重要的产品边界：

> **Ariadne 不负责教用户把事情做完。**

它负责降低“开始行动”的门槛。

用户可以把专业执行交给 ChatGPT、Codex、Claude、IDE 等其他工具；Ariadne 只需要帮助用户找到一个值得尝试的方向、把想法保存下来、形成项目，并留下真实行动的痕迹。

核心理念：

> **不要替我决定我要成为谁，帮我开始走第一步。**

核心闭环：

**模糊欲望 → 探索 → 想法 → 项目 → 开始行动 → 记录 → 回望 → 再次探索**

---

## 2. Ariadne 的产品隐喻

Ariadne 来自希腊神话。Ariadne 给 Theseus 一团线，让他能够进入迷宫、找到出口，并沿着线返回。

这个 App 使用同样的隐喻：

- 用户不一定知道最终想去哪里。
- App 不负责告诉用户唯一正确答案。
- App 提供一根可以不断延伸的“线”。
- 每一次选择、想法、项目和实际行动，都成为这条线的一部分。
- 用户最终可以回头看见自己走过了什么路。

MVP 只需要少量路径、线条、节点元素，不需要复杂动画。

---

## 3. 产品边界

Ariadne 要解决的问题：

> “我最近什么都想做，但不知道先做什么。”

Ariadne 给用户几个可以选择的方向，然后帮助用户把选择变成一个真实存在的想法或项目。

Ariadne 不解决：

- 如何写代码
- 如何 Debug
- 如何完成专业项目
- 如何自动拆解大型任务
- 如何操作文件
- 如何成为 IDE
- 如何成为 Coding Agent
- 如何成为 AI 教师

正确关系：

```text
Ariadne
    ↓
我想做什么？
    ↓
我先做什么？
    ↓
我开始了
    ↓
记录下来
    ↓
回望自己的轨迹

             ↘
          ChatGPT / Codex / Claude
          负责具体专业执行
```

不要把产品逐渐做成：

```text
创建项目
→ AI 自动拆任务
→ AI 教用户
→ AI 写代码
→ AI Debug
→ AI 执行代码
```

这不是 Ariadne 的核心。

---

## 4. Web App 定位

Ariadne 从原本的 iOS App 调整为 **Web App**。

产品形态：

> **Responsive Web App**

需要兼容：

- Desktop
- Tablet
- Mobile

Web 优先的原因：

- 更容易快速迭代。
- 更容易部署和分享。
- 更适合作为作品展示。
- 项目对话在大屏幕上更自然。
- 未来可以接数据库、AI Backend 和账号体系。
- 不需要同时维护 iOS 原生工程。

第一阶段不要做原生 iOS App。

---

## 5. 产品结构

主导航：

```text
1. 探索
2. 想法
3. 项目
4. 记录
5. 我的
```

Desktop 使用左侧 Sidebar。

Mobile 使用底部 Navigation。

项目是主要工作区域，但不是 Codex 式 IDE。

整体信息架构：

```text
Ariadne
│
├── 探索
│   ├── 我不知道应该做什么
│   ├── 我有新的想做的事情
│   ├── 我想继续推进之前的事情
│   └── 推荐结果
│
├── 想法
│   ├── Idea Inbox
│   ├── 分类
│   ├── 想法详情
│   ├── 新建想法
│   └── 想法 → 项目
│
├── 项目
│   ├── 项目列表
│   ├── 项目详情
│   └── 项目对话
│
├── 记录
│   ├── 日历
│   ├── 每日执行记录
│   ├── 项目记录
│   └── 统计
│
└── 我的
    ├── 个人信息
    ├── 兴趣轨迹
    ├── 数据统计
    ├── 设置
    └── 关于
```

---

# 6. Tab 1：探索 Explore

## 6.1 首页

首页不是 Dashboard。

核心问题：

> **今天，你想做什么？**

但不要直接要求用户输入答案。

核心原则：

> **不要问我想做什么，给我几个东西让我选。**

首屏：

```text
Ariadne

你不需要现在就知道
自己想做什么。

[ 我不知道应该做什么 ]

[ 我有新的想法 ]

[ 我想继续推进之前的事情 ]
```

---

## 6.2 分支探索

点击“我不知道应该做什么”。

第一层：

> 你现在更想做什么？

选项：

```text
学点新的东西
创造一些东西
出去体验
认识一些人
改变自己的生活
找点有意思的事情
```

后续可以继续选择：

```text
动手 / 思考

短期体验 / 长期项目

独自 / 和别人一起

线上 / 线下

20 分钟 / 1 小时 / 几小时
```

不要一次显示大量问题。

每一步只给用户少量选择，让探索本身感觉轻松。

---

## 6.3 推荐结果

例如：

```text
也许你可以试试：

做一个视觉小实验

做一个很小的 AI Demo

去一个没去过的地方走走

学习一个你一直好奇的东西

[ 我选这个 ]
[ 换一批 ]
[ 继续探索 ]
```

MVP：

**规则 + Tag 匹配**

不接 LLM。

示例 Tags：

```text
creative
technology
AI
visual
project
short
solo
offline
```

---

## 6.4 Branching Question Engine

```ts
interface BranchQuestion {
  id: string;
  title: string;
  options: BranchOption[];
}

interface BranchOption {
  id: string;
  title: string;
  tags: string[];
  nextQuestionId?: string;
}

interface ExploreResult {
  tags: string[];
  preferredDuration?: "short" | "medium" | "long";
  preferredMode?: "solo" | "together";
}
```

探索数据可以放在：

```text
data/branches/*.json
```

推荐服务：

```text
features/explore/recommendation.ts
```

---

# 7. Tab 2：想法 Ideas

## 7.1 核心定位

Ideas 是一个：

> **Idea Inbox**

用户可以毫无负担地把脑子里的东西扔进去。

例如：

> “突然想做一个能够识别手势，然后生成粒子效果的 Web App。”

用户不需要提前决定：

- 它是不是项目。
- 是否一定要执行。
- 什么时候执行。
- 如何实现。

先保存。

---

## 7.2 分类

MVP：

```text
学习
技能
项目
旅行
体验
生活
阅读
其他
```

支持 Tags。

---

## 7.3 Idea 数据模型

```ts
type IdeaStatus =
  | "inbox"
  | "exploring"
  | "convertedToProject"
  | "archived";

interface Idea {
  id: string;
  title: string;
  content: string;
  category: string;
  tags: string[];
  status: IdeaStatus;
  createdAt: string;
  updatedAt: string;
}
```

---

## 7.4 想法 ≠ 项目

必须保留这个原则。

例如：

```text
想法：
“我想学 Rust”

↓

进一步整理：
“Rust 学习”

↓

真正项目：
“用 Rust 写一个 CLI 工具”
```

用户可以：

```text
保存
搁置
归档
继续探索
转化为项目
```

不要自动把所有 Idea 变成 Project。

---

# 8. Tab 3：项目 Projects

## 8.1 核心定位

项目是 Ariadne 最核心的区域。

但它不是：

> Project Management Workspace

更接近：

> **“我正在做什么”的长期容器。**

项目主要保存：

```text
这个项目是什么
+
我和它聊过什么
+
我实际上做过什么
```

项目不负责管理完整的工作流程。

---

## 8.2 项目列表

Desktop：

```text
┌──────────────────┬───────────────────────────┐
│ 项目             │ 手势粒子 Web App          │
│                  │                           │
│ 手势粒子 App     │ 项目简介                  │
│ Agent Runtime    │ 项目状态                  │
│ 日语学习         │                           │
│ PI-GCRN          │ ───────────────────────── │
│                  │ 项目对话                  │
│ + 新建项目       │                           │
│                  │ 用户：……                  │
│                  │ Ariadne：……               │
└──────────────────┴───────────────────────────┘
```

不要强行复制 Codex UI。

可以借鉴“左侧项目列表 + 右侧当前项目”的信息组织方式，但视觉和交互应该属于 Ariadne。

---

## 8.3 项目详情

项目详情尽量简单：

```text
手势粒子 Web App

我为什么想做：

想做一个能够识别手势并生成
漂亮粒子效果的 Web App。

状态：
进行中

开始于：
2026-09-14

────────────

项目对话

12 条

最近：

“今天终于把基础手势识别跑起来了。”
```

不需要：

- Kanban
- 甘特图
- 多级任务
- 任务依赖
- KPI
- 燃尽图
- 自动项目计划

---

# 9. Project Chat

这是项目区域最重要的动态内容。

每个项目拥有独立的长期对话。

例如：

```text
手势粒子 Web App

用户：
我突然想做一个手势识别生成粒子效果的 Web App。

Ariadne：
好，我们先把这个想法留下来。
你不用现在就想清楚完整方案。

用户：
昨天终于开始做了。

用户：
今天把基础手势识别跑起来了。
```

项目对话的价值：

1. 保存项目产生过的想法。
2. 保存用户对项目的犹豫和变化。
3. 保存用户自己说过的进展。
4. 用户重新打开项目时恢复上下文。
5. 为未来回望提供材料。

---

## 9.1 Project Chat 的边界

Project Chat **不是教学聊天机器人**。

Ariadne 可以：

- 整理用户表达。
- 回顾之前说过的话。
- 帮用户澄清想法。
- 帮用户思考是否继续。
- 记录项目状态变化。
- 做轻量总结。

Ariadne 不需要：

- 教用户编程。
- 自动 Debug。
- 自动写代码。
- 自动运行代码。
- 操作文件。
- 自动拆解复杂项目。
- 成为 Agent。

例如：

用户：

> “MediaPipe 怎么接 Web？”

这是专业执行问题。

用户可以去使用 ChatGPT / Codex / Claude。

Ariadne 不需要解决。

---

## 9.2 Project 数据模型

```ts
type ProjectStatus =
  | "active"
  | "paused"
  | "completed"
  | "archived";

interface Project {
  id: string;
  title: string;
  description: string;
  status: ProjectStatus;
  createdAt: string;
  updatedAt: string;
  linkedIdeaId?: string;
}

type MessageRole = "user" | "assistant";

interface ProjectMessage {
  id: string;
  projectId: string;
  role: MessageRole;
  content: string;
  createdAt: string;
}
```

**MVP 不创建 ProjectTask。**

行动由 Execution Record 体现，而不是复杂任务系统。

---

# 10. Tab 4：记录 Records

## 10.1 核心问题

记录回答：

> **我实际上做了什么？**

而不是：

> 我计划做什么？

---

## 10.2 Execution Record

```ts
interface ExecutionRecord {
  id: string;
  projectId?: string;
  date: string;
  startTime?: string;
  duration: number;
  note: string;
}
```

MVP 重点记录：

```text
什么时候
做了什么
花了多久
留下了什么
```

例如：

```text
9 月 14 日

手势粒子 Web App
45 min
完成基础手势识别

Agent Runtime
1h 20m
看完 Runtime 基础资料

日语
20 min
听了一集 Podcast
```

---

## 10.3 Records UI

可以提供：

- 月视图
- 周视图
- Timeline
- 每日记录
- 项目投入
- 时间统计

例如：

```text
September 2026

Mon Tue Wed Thu Fri Sat Sun
...

Today

手势粒子 Web App     45 min
Agent Runtime        1h 20m
日语                   20 min
```

---

## 10.4 统计

例如：

```text
过去 7 天

学习       4h 20m
创造       5h 10m
研究       3h 40m
其他       1h 20m
```

重点不是：

> “你今天完成了吗？”

而是：

> **“你最近真正把时间放在哪里？”**

避免强制 Streak。

---

# 11. Tab 5：我的 Profile

内容：

```text
我的

个人信息

兴趣轨迹

行动统计

设置

通知

AI 设置

数据管理

隐私

关于 Ariadne
```

“兴趣轨迹”应该展示用户自己留下的真实轨迹。

例如：

```text
最近留下较多记录的方向：

AI
视觉
开发
阅读
旅行
```

不要生成：

> “你的性格是……”

---

# 12. 数据模型总览

MVP：

```text
User
Idea
Project
ProjectMessage
ExecutionRecord
InterestTag
```

关系：

```text
User
 ├── Ideas
 ├── Projects
 └── ExecutionRecords

Idea
 │
 │ optional
 ↓
Project
 ├── ProjectMessages
 └── ExecutionRecords
```

探索：

```text
ExploreResult
 ↓
Recommendation
 ↓
Idea
 ↓
Project
```

不要加入：

```text
ProjectTask
ProjectFile
Agent
```

---

# 13. Web 技术栈

推荐：

Frontend：

- Next.js
- React
- TypeScript
- Tailwind CSS
- shadcn/ui（可选）
- Lucide Icons

Backend / Data：

- Next.js Server Actions / Route Handlers
- PostgreSQL
- Prisma ORM

推荐架构：

```text
Browser
   ↓
Next.js
   ├── Explore
   ├── Ideas
   ├── Projects
   ├── Records
   └── Profile
   ↓
Server Actions / API
   ↓
Prisma
   ↓
PostgreSQL
```

如果为了最快做 Demo，可以第一版使用浏览器本地存储；但正式 MVP 推荐尽早使用 PostgreSQL。

---

# 14. 推荐工程结构

```text
ariadne/
│
├── app/
│   ├── page.tsx
│   ├── explore/
│   ├── ideas/
│   ├── projects/
│   ├── records/
│   └── profile/
│
├── components/
│   ├── navigation/
│   ├── explore/
│   ├── ideas/
│   ├── projects/
│   ├── records/
│   └── ui/
│
├── features/
│   ├── explore/
│   │   ├── branch-engine.ts
│   │   ├── questions.ts
│   │   └── recommendations.ts
│   ├── ideas/
│   ├── projects/
│   └── records/
│
├── lib/
│   ├── db.ts
│   ├── utils.ts
│   └── validation.ts
│
├── prisma/
│   └── schema.prisma
│
├── public/
│
└── types/
```

不要求机械复制目录，可以根据实际 Next.js 工程调整。

---

# 15. 数据库模型建议

核心表：

```text
users
ideas
projects
project_messages
execution_records
interest_tags
```

关系：

```text
users
 ├── ideas
 ├── projects
 └── execution_records

ideas
 └── optional project

projects
 ├── project_messages
 └── execution_records
```

MVP 可以暂缓复杂权限、团队协作和多用户系统。

---

# 16. AI 规划

AI 是后续能力，不是 MVP 的核心。

定位：

**Organizer / Companion / Reflector**

而不是：

**Tutor / Coding Agent / Project Manager**

## Idea Organizer

用户：

> “最近突然想做一个手势识别生成粒子的 Web App。”

AI 可以整理：

```text
标题：
手势粒子 Web App

分类：
项目

标签：
AI / Visual / Web / Creative
```

不需要自动生成完整开发教程。

## Project Conversation

AI 可以知道：

```text
项目名称
项目描述
历史对话
执行记录
项目状态
```

可以：

- 回顾
- 总结
- 整理
- 澄清
- 陪用户继续思考

但不要自动变成 Coding Agent。

## Reflection

未来可以根据真实记录生成：

> “过去一个月，你实际尝试了 4 个项目，其中 3 个和视觉或 AI 有关。”

重点：

> **观察，而不是判断。**

---

# 17. MVP 开发阶段

第一阶段只验证：

> **用户可以从“不知道做什么”走到“我开始做了”。**

开发顺序：

```text
1. 创建 Next.js + TypeScript 项目
        ↓
2. Responsive Layout + Navigation
        ↓
3. Explore
        ↓
4. Branching Question Engine
        ↓
5. Ideas
        ↓
6. Projects
        ↓
7. Project Chat 保存
        ↓
8. Execution Records
        ↓
9. Records / Calendar
        ↓
10. Profile
        ↓
11. 打通 Explore → Idea → Project → Record
        ↓
12. UI Polish
        ↓
13. 测试
        ↓
14. 部署 Web App
        ↓
15. MVP 完成后再考虑 AI
```

---

# 18. MVP 明确不做

第一版不要做：

- LLM
- AI Agent
- Coding Agent
- 自动 Debug
- 自动代码生成
- 自动任务拆解
- ProjectTask
- IDE
- 文件编辑器
- MCP
- Agent Runtime
- 社交系统
- 排行榜
- Streak
- Gamification

如果某个功能只是：

> “感觉一个项目管理 App 应该有。”

但它不能直接帮助：

> **从不知道做什么 → 开始行动**

就不要加入。

---

# 19. Responsive Design

Desktop：

```text
┌──────────────┬──────────────────────────────┐
│ Ariadne      │                              │
│              │          Main Content        │
│ 探索         │                              │
│ 想法         │                              │
│ 项目         │                              │
│ 记录         │                              │
│ 我的         │                              │
└──────────────┴──────────────────────────────┘
```

Project Desktop：

```text
┌────────────────┬──────────────────────────────┐
│ Projects       │ Project                      │
│                │                              │
│ 手势粒子 App   │ 手势粒子 App                 │
│ Agent Runtime  │                              │
│ 日语学习       │ 项目简介                      │
│ PI-GCRN        │                              │
│                │ 对话                          │
│ + 新建项目     │                              │
└────────────────┴──────────────────────────────┘
```

Mobile：

```text
┌──────────────────────────┐
│ Ariadne                  │
│                          │
│       Main Content       │
│                          │
│                          │
├──────────────────────────┤
│ 探索 想法 项目 记录 我的 │
└──────────────────────────┘
```

Project Mobile：

```text
项目
↓
项目列表
↓
项目详情
↓
项目对话
```

不要强行复制 Desktop Sidebar。

---

# 20. 视觉方向

关键词：

- Minimal
- Quiet
- Literary
- Modern
- Warm
- Personal
- Slightly mysterious

不要：

- 传统 SaaS 蓝色 Dashboard
- 过度 Cyberpunk
- 大量卡片
- 大量数据
- 强烈效率工具感

核心视觉隐喻：

**一条线穿过迷宫。**

可以使用：

```text
·────·
     │
     ·────·
          │
          ·
```

代表用户一路留下的选择和行动。

---

# 21. 产品设计原则

### 原则 1：不要强迫用户知道答案

用户可以不知道自己想做什么。

因此：

**选择 > 输入**

### 原则 2：Ariadne 不替用户决定人生

不要出现：

> “根据你的性格，你应该成为……”

更合适：

> “你最近留下的记录里，这些方向出现得比较多。”

### 原则 3：Ariadne 负责启动，不负责包办

目标：

> **让用户开始行动。**

不是让用户在 Ariadne 里完成所有事情。

### 原则 4：项目不是项目管理软件

项目主要保存：

- 项目是什么
- 为什么开始
- 项目对话
- 项目状态
- 真实行动记录

### 原则 5：AI 是助手，不是导师

AI 可以：

- 整理
- 回顾
- 澄清
- 陪伴

AI 不需要：

- 教专业知识
- 写完整项目
- Debug
- 执行代码

### 原则 6：记录真实行动

记录回答：

> **我实际上做了什么？**

### 原则 7：不要制造焦虑

避免：

- 连续打卡
- 排名
- KPI
- “你今天什么都没做”
- Streak 断裂惩罚

Ariadne 应该观察用户，而不是监督用户。

### 原则 8：允许迷路

暂停一个项目、放弃一个想法、改变兴趣，都不是失败。

这些变化本身就是 Ariadne 应该保存的轨迹。

---

# 22. 完整示例流程

第一次打开：

```text
Ariadne

你不需要现在就知道
自己想做什么。

[ 我不知道应该做什么 ]
[ 我有新的想法 ]
[ 我想继续推进之前的事情 ]
```

↓

```text
你现在更想做什么？

○ 学点新的东西
○ 创造一些东西
○ 出去体验
○ 找点有意思的事情
```

↓

继续选择。

↓

```text
也许你可以试试：

做一个视觉小实验

[ 我选这个 ]
[ 换一批 ]
[ 继续探索 ]
```

↓

```text
已加入你的想法

“视觉小实验”

[ 查看想法 ]
[ 创建项目 ]
```

↓

```text
视觉小实验

我为什么想做：
……
```

↓

进入项目：

```text
视觉小实验

项目对话

你：
我今天决定真的开始试试看。

Ariadne：
好，那就从今天开始。
```

↓

用户去 ChatGPT / Codex / Claude 等工具完成具体专业工作。

↓

回到 Ariadne：

```text
记录这次行动

今天
45 分钟

做了什么：

完成了基础视觉效果。
```

↓

记录页：

```text
今天

视觉小实验
45 min
完成基础视觉效果
```

↓

未来回望：

```text
你最近真正做过：

视觉实验
Agent Runtime
日语
```

这就是 Ariadne 的核心闭环。

---

# 23. Codex 开发要求

请把本文件理解为：

> **Ariadne Web App 的产品边界 + MVP 技术规格。**

最重要的要求：

> **不要把 Ariadne 自行扩展成 Codex。**

Codex 的任务是把产品做出来，而不是替产品增加复杂 AI 能力。

推荐：

```text
Step 1
Next.js + TypeScript

↓

Step 2
Responsive Layout

↓

Step 3
Navigation

↓

Step 4
Explore

↓

Step 5
Ideas

↓

Step 6
Projects

↓

Step 7
Project Chat

↓

Step 8
Records

↓

Step 9
Profile

↓

Step 10
打通完整数据流

↓

Step 11
UI Polish

↓

Step 12
测试

↓

Step 13
部署

↓

Step 14
MVP 完成后再考虑 AI
```

开发过程中如果发现需求存在歧义，优先遵守：

> **“帮助用户开始行动”高于“增加功能完整度”。**

---

# 24. 验收标准

- [ ] Web App 可以正常启动
- [ ] Desktop / Mobile 都可以使用
- [ ] 五个主导航可以切换
- [ ] Explore 可以进入
- [ ] 用户可以完成一套分支问题
- [ ] 推荐系统可以根据 Tag 工作
- [ ] 用户可以创建 Idea
- [ ] Idea 可以编辑 / 删除 / 分类
- [ ] Idea 可以转化为 Project
- [ ] 用户可以创建 Project
- [ ] Project 可以查看详情
- [ ] Project 有独立对话
- [ ] Project 对话可以持久化
- [ ] 用户可以创建 Execution Record
- [ ] Record 可以关联 Project
- [ ] Calendar / Timeline 可以查看记录
- [ ] 可以查看基础统计
- [ ] Profile 可以使用
- [ ] 刷新页面后数据不会丢失
- [ ] 核心流程没有死路
- [ ] 不依赖 LLM 才能运行

---

# 25. 最终产品目标

Ariadne 不是：

> “一个更好的 Todo App。”

也不是：

> “一个网页版 Codex。”

它应该是：

> **一个帮助人从“不知道自己想做什么”，走到“我先开始做一点”的地方。**

完整路径：

```text
我不知道做什么
        ↓
      探索
        ↓
    发现一个可能性
        ↓
      想法
        ↓
    我决定试试看
        ↓
      项目
        ↓
    我真的开始了
        ↓
      记录
        ↓
  我看见自己走过的路
        ↓
    再次探索
```

Ariadne 不需要告诉用户终点在哪里。

它只需要给用户一根线。

> **Find your way through the maze.**
