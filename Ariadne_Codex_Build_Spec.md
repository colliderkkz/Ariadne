# Ariadne — Web App Build Specification

## 1. 项目概述

项目名称：**Ariadne**

暂定副标题：

> Find your way through the maze.

产品中文定位：

> 找到属于自己的路。

Ariadne 是一个帮助用户从“我不知道自己想做什么”逐渐走向“我开始做了，并且知道自己实际做了什么”的个人探索与行动管理 App。

它不是传统 Todo App，也不是单纯的笔记 App，更不是一个替用户规划人生的 AI 助手。

核心理念：

> 不要替我决定我要成为谁，帮我看见我正在成为谁。

产品不要求用户一开始就知道目标，而是允许用户从选择、记录和实际行动中逐渐形成自己的方向。

核心闭环：

**模糊欲望 → 探索 → 想法 → 项目 → 执行 → 记录 → 回望 → 再次探索**

---

## 2. Ariadne 的产品隐喻

Ariadne 来自希腊神话。

Ariadne 给 Theseus 一团线，让他能够进入迷宫、找到出口，并沿着线返回。

App 使用这个隐喻：

- 用户不一定知道自己最终要去哪里。
- App 不负责告诉用户“正确答案”。
- App 提供一根可以不断延伸的“线”。
- 每一次选择、产生的想法、创建的项目、实际执行和留下的记录，都成为这根线的一部分。
- 用户最终可以回头看见：自己究竟走过了什么路。

视觉上尽量简约。

---

# 3. 产品结构

底部导航栏采用五个 Tab，项目推进工作区固定放在最中间的第三个位置：

1. **探索**
2. **想法**
3. **项目**
4. **记录**
5. **我的**

其中“项目”是 Ariadne 的核心工作区入口，直接作为底部中央 Tab，而不是隐藏在其他页面中的二级入口。

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
│   ├── 想法 Inbox
│   ├── 分类
│   ├── 想法详情
│   ├── 新建想法
│   └── 想法 → 项目
│
├── 项目（中央 Tab）
│   ├── 项目列表 / Sidebar
│   ├── 项目概览
│   ├── 项目任务
│   ├── 项目对话
│   ├── 项目记录
│   └── 项目文件（后续）
│
├── 记录
│   ├── 日历
│   ├── 每日执行记录
│   ├── 项目记录
│   └── 时间统计
│
└── 我的
    ├── 个人信息
    ├── 设置
    ├── 数据管理
    └── 关于
```

---

# 4. Tab 1：探索 Explore

## 4.1 首页定位

首页不是传统意义上的 Dashboard。
首页可以展示：

- “我不知道应该做什么”
- “我有新的想做的事情”
- “我想继续推进之前的事情”
- “我只是想随便看看”
- “我想改变一下最近的生活”

MVP 至少实现前三个入口。

---

## 4.2 “我不知道应该做什么”

进入 Branching Question Engine。

第一层问题示例：

> 你现在更想做什么？

选项：

- 学点新的东西
- 创造一些东西
- 出去体验
- 认识一些人
- 改变自己的生活
- 找点有意思的事情

第二层可以继续询问：

- 更喜欢动手还是思考？
- 想要一个短时间就能完成的事情，还是长期项目？
- 想自己做，还是和别人一起？
- 在线上完成，还是在线下体验？
- 今天愿意投入多少时间？

最终根据用户选择生成若干具体推荐。

结果页：

```text
我觉得你现在可能会喜欢：

[ 用 SwiftUI 做一个小型视觉实验 ]

[ 学一个新的 AI 工具并做个 Demo ]

[ 去一个没去过的地方走走 ]

[ 换一批推荐 ]
```

按钮：

- 我选这个
- 换一批
- 继续探索

MVP 阶段不需要 LLM。

推荐系统先采用：

**规则 + Tag 匹配**

例如：

```text
creative
technology
AI
visual
project
short
solo
```

---

## 4.3 Branching Question Engine

建议数据模型：

```swift
struct BranchQuestion {
    let id: String
    let title: String
    let options: [BranchOption]
}

struct BranchOption {
    let id: String
    let title: String
    let tags: [String]
    let nextQuestionID: String?
}
```

探索结束后生成：

```swift
struct ExploreResult {
    let tags: [String]
    let preferredDuration: DurationPreference
    let preferredMode: ModePreference
}
```

推荐服务：

```swift
RecommendationService
```

MVP 推荐数据可以直接写在本地 JSON / Swift 文件中。
后续再接 AI。

---

# 5. Tab 2：想法 Ideas

## 5.1 核心定位

这是一个 **Idea Inbox**。

用户可以毫无负担地把脑子里的东西扔进去。

例如：

> “突然想做一个能够识别手势，然后生成粒子效果的 App。”

用户不需要提前决定：

- 它是不是项目
- 属于什么分类
- 要不要执行
- 什么时候执行

系统先保存。

---

## 5.2 分类

初始分类：

- 学习
- 技能
- 项目
- 旅行
- 体验
- 生活
- 阅读
- 其他

支持 Tags。

---

## 5.3 Idea 数据模型

```swift
struct Idea {
    let id: UUID
    var title: String
    var content: String
    var category: IdeaCategory
    var tags: [String]
    var status: IdeaStatus
    var createdAt: Date
    var updatedAt: Date
}
```

IdeaStatus：

```text
inbox
exploring
convertedToProject
archived
```

---

## 5.4 想法 ≠ 项目

必须保留这个产品原则。

例如：

```text
想法：
“我想学 Rust”

↓

进一步整理：
“Rust 学习计划”

↓

真正项目：
“用 Rust 写一个 CLI 工具”
```

因此要提供：

> 转化为项目

但不要让每个 Idea 自动变成 Project。

---

## 5.5 AI 后续能力

未来可以让 AI：

- 整理用户的原始想法
- 自动提取标题
- 提取关键词
- 推荐分类
- 合并相似想法
- 将想法整理成项目
- 提供下一步行动建议

但 MVP 不实现 AI。

---

# 6. Tab 3：项目 Projects

## 6.1 产品定位

项目是 Ariadne 中央第三个 Tab，也是整个 App 的核心“推进工作区”。

它是 Ariadne 中最接近 Codex 工作方式的部分。

用户希望它：

> 有点类似于 Codex 的侧边栏。

每个项目拥有独立上下文。

例如：

```text
项目
├── 手势粒子 App
├── Agent Runtime 学习
├── 日语学习
└── 长沙旅行
```

点击项目后进入独立工作区。

---

## 6.2 项目工作区结构

项目 Tab 直接位于底部导航栏正中央，视觉上应成为五个入口中的核心位置。


```text
┌─────────────────────────────────┐
│ Sidebar       │ Project         │
│               │                 │
│ 手势粒子 App   │ 项目标题         │
│ Agent Runtime │ 当前目标         │
│ PI-GCRN       │ 当前任务         │
│ 日语学习       │                 │
│               │ ─────────────── │
│ + 新建项目     │ 项目内容 / Chat  │
│               │                 │
└─────────────────────────────────┘
```

移动端可以使用：

- NavigationSplitView
- 或 NavigationStack + 项目选择页面

不需要强行完全复制 Codex UI。

---

## 6.3 Project 数据模型

```swift
struct Project {
    let id: UUID
    var title: String
    var description: String
    var status: ProjectStatus
    var createdAt: Date
    var updatedAt: Date
    var linkedIdeaID: UUID?
}
```

ProjectStatus：

```text
active
paused
completed
archived
```

---

## 6.4 Project Task

```swift
struct ProjectTask {
    let id: UUID
    let projectID: UUID
    var title: String
    var isCompleted: Bool
    var createdAt: Date
    var completedAt: Date?
}
```

不要把项目设计成单纯 Todo List。

Task 只是项目工作区的一部分。

---

## 6.5 Project Chat

每个项目拥有独立 Chat Context。

例如用户说：

> “我昨天已经把 MediaPipe 接上了，但是粒子效果不知道应该怎么实现。”

AI 应该理解：

- 这是哪个项目
- 项目已经完成了什么
- 当前任务是什么
- 历史对话是什么
- 用户之前留下了哪些记录

未来 AI 服务：

```text
Project Copilot
```

它不是通用聊天机器人，而是“项目副驾驶”。

---

## 6.6 Project 数据结构

建议：

```text
Project
├── ProjectTask
├── ProjectChat
├── ProjectMessage
├── ProjectRecord
└── ProjectFile
```

ProjectFile MVP 暂时可以不实现。

---

# 7. Tab 4：记录 Records

## 7.1 核心理念

记录不是传统的“打卡”。

真正想回答的问题是：

> **我实际上做了什么？**

而不是：

> 我计划做什么？

---

## 7.2 ExecutionRecord

```swift
struct ExecutionRecord {
    let id: UUID
    let projectID: UUID?
    let date: Date
    let startTime: Date?
    let duration: TimeInterval
    let completion: Double
    let note: String
}
```

示例：

```text
9/14

手势粒子 App
45 min
完成度 80%

Agent Runtime
1h20
完成度 60%

日语
20 min
完成度 100%
```

---

## 7.3 UI

推荐：

- 月 / 周日历
- 某一天的执行记录
- 项目维度统计
- 时间统计
- 完成度

例如：

```text
        September 2026

Mon Tue Wed Thu Fri Sat Sun
                    1   2   3
4   5   6   7   8   9  10
...

Today

手势粒子 App       45 min
Agent Runtime      1h 20m
日语                 20 min
```

---

## 7.4 统计

可以展示：

```text
过去 7 天
学习       4h 20m
创造       5h 10m
研究       3h 40m
其他       1h 20m
```

以及：

- 每周执行时间
- 每月执行时间
- 不同项目投入时间
- 执行次数
- 完成度

不要把产品做成强烈的“连续打卡 / Streak”产品。

核心是：

> 观察自己把时间真正放在哪里。

---

# 8. Tab 5：我的 Profile

包含：

```text
我的

头像 / 用户名
执行统计

设置
通知
AI 设置
数据管理
隐私
关于 Ariadne
```

---

# 9. 数据模型总览

MVP 至少包含：

```text
UserProfile
Idea
Project
ProjectTask
ProjectMessage
ExecutionRecord
InterestTag
```

关系：

```text
Idea
 │
 │ optional
 ↓
Project
 ├── ProjectTask
 ├── ProjectMessage
 └── ExecutionRecord
```

Explore 产生：

```text
ExploreResult
 ↓
Recommendation
 ↓
Idea / Project
```

---

# 10. 技术栈

iOS：

- Swift
- SwiftUI
- SwiftData
- URLSession
- Codable

最低目标：

**iOS 17+**

本地数据：

**SwiftData**

MVP 暂时不需要后端。

---

# 11. 推荐工程结构

```text
Ariadne/
│
├── App/
│   ├── AriadneApp.swift
│   └── AppRouter.swift
│
├── Core/
│   ├── Models/
│   │   ├── Idea.swift
│   │   ├── Project.swift
│   │   ├── ProjectTask.swift
│   │   ├── ProjectMessage.swift
│   │   ├── ExecutionRecord.swift
│   │   ├── UserProfile.swift
│   │   └── InterestTag.swift
│   │
│   ├── Services/
│   │   ├── DataService.swift
│   │   ├── RecommendationService.swift
│   │   ├── NotificationService.swift
│   │   └── AIService.swift
│   │
│   ├── Network/
│   │   ├── APIClient.swift
│   │   └── APIEndpoint.swift
│   │
│   └── Utilities/
│       ├── DateHelper.swift
│       └── Constants.swift
│
├── Features/
│   ├── Explore/
│   │   ├── ExploreView.swift
│   │   ├── ExploreViewModel.swift
│   │   ├── BranchEngine.swift
│   │   ├── BranchQuestion.swift
│   │   ├── BranchOption.swift
│   │   ├── ExploreResult.swift
│   │   └── Views/
│   │       ├── ExploreHomeView.swift
│   │       ├── BranchQuestionView.swift
│   │       ├── BranchResultView.swift
│   │       └── RecommendationCard.swift
│   │
│   ├── Ideas/
│   │   ├── IdeasView.swift
│   │   ├── IdeasViewModel.swift
│   │   ├── IdeaListView.swift
│   │   ├── IdeaDetailView.swift
│   │   ├── AddIdeaView.swift
│   │   └── IdeaEditorView.swift
│   │
│   ├── Projects/
│   │   ├── ProjectsView.swift
│   │   ├── ProjectView.swift
│   │   ├── ProjectViewModel.swift
│   │   ├── ProjectSidebarView.swift
│   │   ├── ProjectOverviewView.swift
│   │   ├── ProjectTaskView.swift
│   │   ├── ProjectChatView.swift
│   │   └── ProjectRecordView.swift
│   │
│   ├── Records/
│   │   ├── RecordsView.swift
│   │   ├── RecordsViewModel.swift
│   │   ├── CalendarView.swift
│   │   ├── DayRecordView.swift
│   │   ├── RecordDetailView.swift
│   │   ├── StatisticsView.swift
│   │   └── Components/
│   │       ├── RecordCell.swift
│   │       ├── ProgressRing.swift
│   │       └── HeatmapView.swift
│   │
│   └── Profile/
│       ├── ProfileView.swift
│       ├── ProfileViewModel.swift
│       ├── AccountView.swift
│       ├── InterestProfileView.swift
│       ├── NotificationSettingsView.swift
│       ├── AISettingsView.swift
│       └── AboutView.swift
│
├── AI/
│   ├── AIService.swift
│   ├── AIRequest.swift
│   └── AIResponse.swift
│
└── Resources/
    └── Branches/
```

实际搭建时可以根据 Xcode 工程实际情况适当调整，不要求机械复制目录。

---

# 12. MVP 开发阶段

## Phase 1：纯本地 MVP

不要一开始接 AI。

完成：

1. SwiftUI App 基础结构
2. 五 Tab Navigation
3. 探索首页
4. Branching Question Engine
5. 本地推荐
6. Ideas CRUD
7. Idea 分类
8. Idea → Project
9. 中央 Project Tab
10. Project 列表 / Workspace
11. Project Detail
12. Project Task
13. Execution Record
14. Calendar
15. 基础统计
16. Profile / Settings

核心闭环必须跑通：

```text
探索
 ↓
产生想法
 ↓
保存想法
 ↓
转化为项目
 ↓
执行项目
 ↓
记录执行
 ↓
查看自己的行动轨迹
 ↓
再次探索
```

---

# 13. Phase 2：加入 AI

架构：

```text
iOS App
   │
   │ HTTPS / JSON
   ↓
Python FastAPI
   │
   ├── AI Service
   ├── Prompt
   ├── Recommendation
   └── Project Context
           │
           ↓
         LLM API
```

不要让 iOS App 直接在大量 View 中散落调用 LLM API。

---

# 14. Backend 结构

未来：

```text
backend/
├── main.py
│
├── api/
│   ├── ideas.py
│   ├── projects.py
│   └── chat.py
│
├── services/
│   ├── llm_service.py
│   ├── idea_service.py
│   └── recommendation_service.py
│
├── models/
│
└── prompts/
    ├── idea_organizer.py
    └── project_assistant.py
```

后续需要账号和云同步时再加入：

- PostgreSQL
- Authentication
- Cloud Sync

不要在 MVP 阶段提前实现。

---

# 15. AI 功能规划

AI 不应该成为产品的核心入口。

AI 的角色：

> Organizer / Copilot / Assistant

而不是：

> Life Coach / Oracle

未来功能：

### Idea Organizer

用户输入：

> “我最近突然想学一下 Rust，感觉以后可能有用，但也不知道学了干嘛。”

AI 可以整理成：

```text
标题：学习 Rust

分类：技能

标签：
Rust / Programming / Learning

可能的下一步：
先完成一个简单 CLI Demo
```

### Project Copilot

理解项目上下文：

```text
项目目标
项目任务
历史对话
执行记录
项目文件
```

回答项目相关问题。

### Execution Summary

根据执行记录：

> “你过去一个月在创造类项目上的投入明显增加。”

注意措辞应该基于用户真实记录，而不是进行人格判断。

---

# 16. 产品设计原则

这是非常重要的一部分，开发时不要偏离。

### 原则 1：不要强迫用户知道答案

用户可以不知道自己想做什么。

因此：

**选择 > 输入**

---

### 原则 2：AI 不替用户决定人生

不要出现：

> “根据你的性格，你应该成为一个……的人。”

更合适：

> “你最近留下的记录里，有这些方向出现得比较多。”

---

### 原则 3：想法和项目分离

不是每个想法都值得执行。

允许：

- 保存
- 搁置
- 归档
- 继续探索
- 转化为项目

---

### 原则 4：记录真实行动

产品不应该奖励“计划得很好”。

重点是：

> 我实际上做了什么？

---

### 原则 5：不要制造焦虑

避免把产品做成：

- 打卡 App
- 任务 KPI
- 每日必须完成
- Streak 断了就失败
- “你今天什么都没做”

Ariadne 应该帮助用户观察自己的轨迹，而不是监督用户。

---

### 原则 6：允许迷路

“迷路”不是产品失败。

Ariadne 的核心隐喻就是：

> 人本来就在迷宫里。

App 的价值是帮用户看见自己走过的路，并提供下一条可能的路径。

---

# 17. 视觉方向

整体建议：

- 极简
- 有一点文学感
- 现代
- 安静
- 不要做成传统效率工具
- 不要过度赛博
- 不要堆大量卡片和数据

视觉隐喻：

**线 / 路径 / 迷宫**

例如：

- 细线作为页面装饰
- 路径连接不同状态
- 探索过程中的选择逐渐形成一条线
- 项目和记录可以成为线上的节点

App Icon 可以未来设计为：

> 一条线穿过一个简化的迷宫。

---

# 18. MVP 示例用户流程

第一次打开：

```text
Ariadne

你不需要现在就知道
自己想做什么。

[ 我不知道应该做什么 ]

[ 我有新的想法 ]

[ 我想继续推进之前的事情 ]
```

用户点击：

```text
我不知道应该做什么
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

用 SwiftUI 做一个视觉小实验

[ 我选这个 ]
[ 换一批 ]
[ 继续探索 ]
```

点击“我选这个”：

```text
已加入你的想法

“SwiftUI 视觉小实验”

[ 查看想法 ]
[ 现在开始 ]
```

如果选择“现在开始”：

```text
创建项目

SwiftUI 视觉小实验

当前任务：
创建项目并完成第一个视觉效果
```

开始执行。

完成后：

```text
记录这次执行

今天
45 分钟

完成度
80%

备注：
完成了基础粒子效果
```

之后在“记录”里看到：

```text
今天

SwiftUI 视觉小实验
45 min
80%
```

这就是 Ariadne 的完整核心闭环。

---

# 19. Codex 执行要求

请把本文件作为产品规格和 MVP 实现依据。

开发顺序：

```text
Step 1
创建 SwiftUI 项目 Ariadne

↓

Step 2
搭建 App 基础架构和 Tab Navigation

↓

Step 3
实现 Explore

↓

Step 4
实现 Branching Question Engine

↓

Step 5
实现 Ideas + SwiftData

↓

Step 6
实现 Projects

↓

Step 7
实现 Execution Records + Calendar

↓

Step 8
实现 Profile / Settings

↓

Step 9
打通完整数据流

↓

Step 10
完善 UI / 动画 / 空状态 / 错误状态

↓

Step 11
测试 MVP

↓

Step 12
再考虑 AI Backend
```

不要在第一阶段：

- 接入 LLM
- 搭建复杂后端
- 搭建 PostgreSQL
- 做账号系统
- 做云同步
- 做复杂 Agent
- 做复杂推荐模型

先让本地 MVP 真正跑起来。

---

# 20. 验收标准

MVP 至少能够完成以下操作：

- [ ] App 可以正常启动
- [ ] 五个 Tab 可以正常切换
- [ ] 项目 Tab 位于底部导航栏正中央
- [ ] 探索首页可以正常进入
- [ ] 用户可以完成一套分支问题
- [ ] 系统可以根据 Tag 给出推荐
- [ ] 用户可以保存 Idea
- [ ] Idea 可以编辑 / 删除 / 分类
- [ ] Idea 可以转化为 Project
- [ ] 用户可以创建 Project
- [ ] Project 可以创建 Task
- [ ] Task 可以完成
- [ ] 用户可以创建 Execution Record
- [ ] Record 可以关联 Project
- [ ] Calendar 可以查看记录
- [ ] 可以查看基础统计
- [ ] Profile / Settings 可以正常使用
- [ ] 所有核心数据使用 SwiftData 持久化
- [ ] App 重启后数据不会丢失
- [ ] 核心导航流程没有死路

最终目标不是“页面很多”，而是：

> **让用户可以从“不知道做什么”开始，经过探索、想法、项目和执行，最后在记录里看见自己真正走过的路。**
