# Ariadne：Next.js → FastAPI → PostgreSQL

业务数据全部通过 FastAPI 存入 PostgreSQL。默认前端使用原生 Next.js；Cloudflare/Sites 构建入口作为可选部署方式保留，数据库不使用 D1。

## 本地启动（PowerShell）

需要 Node.js 22.13+、Python 3.12+ 和已启动的 Docker Desktop。

### 首次准备后端

```powershell
cd M:\Ariadne\ariadne\backend
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.lock
.\.venv\Scripts\python.exe -m pip install --no-deps -e .
.\.venv\Scripts\python.exe scripts/init_env.py
docker compose up -d --wait db
.\.venv\Scripts\python.exe scripts/create_test_db.py
.\.venv\Scripts\python.exe -m alembic upgrade head
```

配置在 `backend/.env`。`DATABASE_URL` 指向开发库 `ariadne`，`TEST_DATABASE_URL` 指向独立库 `ariadne_test`。本机使用已有的 `postgres:15-alpine` 镜像；示例默认 PostgreSQL 17，可通过 `POSTGRES_IMAGE` 选择。不要在同一数据卷上直接更换大版本。密钥和 `.env` 不进入 Git。

后端终端：

```powershell
cd M:\Ariadne\ariadne\backend
.\.venv\Scripts\python.exe -m uvicorn app.main:create_app --factory --reload --host 127.0.0.1 --port 8000
```

前端另开终端：

```powershell
cd M:\Ariadne\ariadne
npm ci
npm run dev
```

打开 <http://127.0.0.1:3000>，注册并登录。接口文档 <http://127.0.0.1:8000/docs>。

前端 API 默认地址是 `http://127.0.0.1:8000`；需要修改时，在 `ariadne/.env.local` 配置 `NEXT_PUBLIC_API_BASE_URL`，并在后端 `CORS_ORIGINS` 中配置前端来源。公开变量只存 API 地址，不能存密钥。Linux/macOS 将 Python 命令替换为 `./.venv/bin/python`。

## 最终架构

```text
Next.js 页面 / 功能模块
  → lib/api/client.ts（认证头、命名转换、分页、错误处理）
  → FastAPI /api/v1（身份验证和资源归属）
  → SQLAlchemy Session / 事务
  → psycopg → PostgreSQL

探索 / 想法整理 / 项目聊天
  → 同一 API Client → FastAPI → 服务端配置的 LLM API
```

前端保持已有页面与业务交互，新增账号登录和必要的连接/导入状态。`app/page.tsx` 只负责页面组合；Ideas、Projects、Tags、Records、Chat、Explore、Profile、Auth、Workspace 在 `features/` 内分别维护。

## 数据库表

| 表 | 内容与关联 |
| --- | --- |
| `users` | 邮箱、Argon2id 密码哈希、账号状态 |
| `ideas` | 用户想法、标签 ID、状态 |
| `projects` | 项目、内心戏、状态、可选来源想法；一个想法最多关联一个项目 |
| `tags` | 每个用户独立的系统/自定义标签库，支持两级父子标签 |
| `records` | 活动时间记录，可选关联项目与标签 |
| `project_messages` | 项目中的用户/助手消息 |
| `alembic_version` | 数据库结构版本 |

全部业务数据有用户归属。创建项目与更新想法状态在同一事务中完成；归档想法同步归档关联项目。删除项目级联删除其消息、保留时间记录并清空项目引用。删除标签在事务中解除想法和记录引用；系统标签与仍有子标签的父标签不能删除。

## API 列表

所有业务接口使用 `/api/v1` 前缀并要求 `Authorization: Bearer <token>`。只有注册/登录和健康检查无需登录。

| 路径 | 方法 | 用途 |
| --- | --- | --- |
| `/auth/register`、`/auth/login` | POST | 注册、登录（登录使用表单，username 填邮箱） |
| `/users/me` | GET / PATCH | 当前账号；保存名字、头像和主题 |
| `/ideas`、`/projects`、`/tags`、`/records`、`/messages` | GET / POST | 分页列表与创建 |
| 上述资源的 `/{id}` | GET / PATCH / DELETE | 读取、部分修改、删除 |
| `/messages?project_id=...` | GET | 指定项目消息 |
| `/llm/status` | GET | 返回服务商、模型名、地址、配置来源和是否已配置，不返回密钥 |
| `/llm/config` | PUT / DELETE | 保存个人模型配置 / 恢复服务端默认配置 |
| `/llm/test` | POST | 测试填写的配置，不保存；会发起一次真实模型请求 |
| `/llm/explore` | POST | 探索对话 |
| `/llm/organize` | POST | 将对话整理为想法草稿 |
| `/projects/{id}/chat` | POST | 从数据库读取上下文，调用模型，成对保存用户和助手消息 |
| `/imports/local-storage` | POST | 旧浏览器业务数据的原子、可重试导入 |

列表返回 `items/total/limit/offset`，支持 `limit=1..100` 和 `offset>=0`。想法列表额外支持 `status`。`/health/live` 检查应用，`/health/ready` 检查数据库。具体请求结构与错误说明见 `/docs`。

## localStorage 迁移与 LLM 配置

- Ideas、Projects、Tags、Records、Project Messages 不再写入 localStorage。
- 检测到旧数据时，登录后显示“导入当前账号”。只有明确点击后才导入当前账号；失败保留原数据，成功后删除已导入且未被其它标签页修改的原副本。确定性 ID 防止网络重试生成重复项。
- 仅正在计时的临时状态继续保存在本地，并按账号隔离；完成的记录写入数据库。
- 登录令牌保存在当前标签页的 sessionStorage，刷新可恢复；过期后要求重新登录。退出会清除客户端令牌；现阶段仍采用短期 JWT，没有服务端令牌撤销功能。
- 旧的 `ariadne:llm-config`（含浏览器 Key）在应用初始化时清除，不会上传到后端。

登录后在「我的 → API 配置」选择服务商、填写模型 ID 和 API Key，可以测试连接、保存和恢复默认。支持 DeepSeek、OpenAI、Moonshot、硅基流动和通义千问的 Chat Completions 接口；接口地址随服务商选择，不能填写任意 URL。个人配置优先于服务端默认配置，并立即用于探索、想法整理和项目聊天。保存后密钥清空且不回显；同一服务商留空保留已有个人密钥，更换服务商必须填写新密钥。模型“已配置”不代表测试成功。

也可以在 `backend/.env` 中设置默认配置：

```dotenv
LLM_API_KEY=在此填写真实服务商密钥
LLM_PROVIDER=deepseek
LLM_BASE_URL=https://api.deepseek.com/chat/completions
LLM_MODEL=deepseek-chat
```

环境变量修改后重启后端。对话接口不接受密钥、上游地址或 system prompt 的覆盖。超时/上游错误使用受控错误消息；不回传原始上游报错。模型未配置时返回 503，前端保留草稿。项目聊天失败不会留下半条对话。

「我的 → 设置」可上传/移除头像、修改名字、选择浅色/深色/跟随系统主题，以及退出登录。头像在浏览器裁剪压缩为 256 × 256 图片后随账号保存；名字、头像、主题在刷新和重新登录后保留。

更新已有环境时，先安装 `backend/requirements.lock`，再在 backend 目录执行 `python -m alembic upgrade head`（新增 0003 迁移）。个人 API Key 使用 Fernet 加密后存入 PostgreSQL，派生密钥来自 `JWT_SECRET_KEY`；请保持该服务端密钥稳定，轮换后用户需重新填写个人 API Key。浏览器存储中不保存模型密钥。

## 验证命令

```powershell
cd M:\Ariadne\ariadne\backend
.\.venv\Scripts\python.exe -m pytest -q
.\.venv\Scripts\python.exe -m pytest tests/test_postgres.py -q
.\.venv\Scripts\python.exe -m ruff check .
.\.venv\Scripts\python.exe -m ruff format --check .
.\.venv\Scripts\python.exe -m alembic check

cd M:\Ariadne\ariadne
npm run lint
npm run typecheck
npm run build
npm run test:e2e
```

测试必须连接 `*_test` PostgreSQL 数据库，没有 SQLite 回退或 skip。后端测试在每次测试创建的随机 schema 内运行并清理。Playwright 启动测试 API `8001` 和 Next.js `3100`，使用同一专用测试库的 public schema，保留测试数据供排查；不访问开发库。Windows 使用本机 Edge；Linux/macOS 先执行 `npx playwright install chromium`。端口需空闲。

已验证：76 项后端测试通过（包含原 3 项 PostgreSQL 专属测试，无跳过），4 项浏览器 E2E 通过，覆盖真实数据库的创建→刷新→读取→修改→删除、跨账号隔离、旧数据导入、网络故障草稿保留与移动端。LLM 测试使用受控上游替身，未使用真实付费 Key。

## Git 与清理

仓库根目录已统一为 `M:\Ariadne`；保留内层完整历史、外层历史分支与两份已校验 bundle，见 [Git 恢复说明](../docs/git-history.md)。原产品文档保留。

移除了 D1/Drizzle 应用代码、绑定、生成命令与依赖，删除旧部署压缩包、日志、过期构建产物。新构建产物和测试截图均被忽略。`build/` 是构建插件源码，保留。

可选 Cloudflare 前端命令：`npm run dev:cloudflare`、`npm run build:cloudflare`、`npm run start:cloudflare`。保留 `.openai/hosting.json` 中的项目身份及 R2 配置、Sites 构建插件和 Worker 工具链。部署时 API 地址必须是可访问的 HTTPS FastAPI 地址；Python/PostgreSQL 单独部署。本轮没有发布远程站点。
