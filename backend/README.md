# Ariadne Python 后端

这是用于学习后端开发的独立服务，采用 Python 3.12+、FastAPI、REST API、PostgreSQL、SQLAlchemy 2 和 JWT 登录认证。

已实现用户注册、登录、当前用户查询，以及属于当前用户的想法 CRUD。代码中的中文注释重点解释依赖注入、事务、密码哈希、JWT 和权限检查。

## 1. 先理解这些技术之间的关系

Python 是语言；FastAPI 是 Web 框架；REST 是接口设计方式；SQLAlchemy 是 ORM；PostgreSQL 是实际保存数据的数据库。认证通过 FastAPI 的依赖注入接入受保护接口。

```text
浏览器 / Swagger / HTTP 客户端
  │ HTTP 请求：JSON + Authorization: Bearer <token>
  ▼
FastAPI 路由（api/routes）
  ├── Pydantic 校验输入（schemas）
  ├── 验证 JWT、加载当前用户（api/deps.py）
  └── 注入本次请求的数据库 Session（db/session.py）
  ▼
业务函数（services）：规则、归属校验、事务提交
  ▼
SQLAlchemy ORM（models）：Python 对象和 SQL 的映射
  ▼
psycopg 驱动 → PostgreSQL
  │
  └── ORM 对象 → Pydantic 响应模型 → JSON 响应
```

这里使用同步 SQLAlchemy 配合普通 `def` 路由，FastAPI 会在线程池执行这些同步操作。先理解一次完整请求，再考虑异步数据库。没有添加通用 Repository/BaseService 抽象，直接在业务层使用 SQLAlchemy，便于顺着调用阅读。

## 2. 目录结构

```text
backend/
├── app/
│   ├── main.py             # 应用工厂、CORS、异常处理、路由注册
│   ├── api/
│   │   ├── deps.py         # 获取当前用户等共享依赖
│   │   ├── router.py       # /api/v1 路由聚合
│   │   └── routes/         # auth、users、ideas、health
│   ├── core/               # 配置、安全工具、业务异常
│   ├── db/                 # ORM 基类、连接池和 Session
│   ├── models/             # 数据库表结构：User / Idea
│   ├── schemas/            # API 请求和响应的数据结构
│   └── services/           # 业务逻辑、查询和事务
├── alembic/                # 数据库结构版本与迁移
├── tests/                  # 接口、安全、权限、迁移测试
├── scripts/init_env.py     # 安全生成本机配置
├── compose.yaml            # 本地 PostgreSQL 17
├── .env.example            # 配置模板，不包含 JWT 密钥
├── pyproject.toml          # 依赖范围、包信息、开发工具配置
└── requirements.lock       # 本次验证使用的依赖版本（包含测试工具）
```

## 3. Windows / PowerShell 启动

需要 Python 3.12+ 和已经启动的 Docker Desktop。下面命令均在 `M:\Ariadne\ariadne\backend` 执行。

### 安装依赖

```powershell
cd M:\Ariadne\ariadne\backend
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.lock
.\.venv\Scripts\python.exe -m pip install --no-deps -e .
```

直接调用虚拟环境解释器，无需修改 PowerShell 执行策略。若希望根据 `pyproject.toml` 重新解析兼容版本，可改用 `python -m pip install -e ".[dev]"`（使用虚拟环境的 Python）。

macOS / Linux 使用 `python3 -m venv .venv`，将下文 `.\.venv\Scripts\python.exe` 替换为 `./.venv/bin/python`。锁文件来自 Python 3.12 的 Windows 验证环境；跨平台安装仍需对应平台可用的 wheels，Uvicorn 可使用标准 asyncio 事件循环。

### 生成配置并启动数据库

```powershell
.\.venv\Scripts\python.exe scripts/init_env.py
docker compose up -d --wait db
```

初始化脚本复制 `.env.example` 并生成随机 JWT 密钥，已有 `.env` 时保持原样。`.env` 已被 Git 忽略。

默认数据库为 `ariadne`，用户为 `ariadne`，密码为本地示例值 `ariadne_dev_password`，只绑定 `127.0.0.1:5432`。修改 `POSTGRES_PASSWORD` 时，也要同步修改 `DATABASE_URL`。已有数据库卷的密码不会因修改环境变量而自动改变。

默认镜像为 `postgres:17`，也可以通过 `POSTGRES_IMAGE` 指定本机已有的兼容镜像。当前机器的镜像源返回了错误的下载内容，因此本机 `.env` 使用已缓存的 `postgres:15-alpine` 验证。数据库卷创建后不要直接切换 PostgreSQL 大版本；升级时需要使用 PostgreSQL 的升级或导出/导入流程。

数据库连接串使用 **`postgresql+psycopg://`**。如果密码包含 `@`、`:` 等 URL 保留字符，需要对密码做 URL 编码。CORS 地址是 JSON 数组，应填写浏览器实际使用的前端来源（协议 + 主机 + 端口）。

### 执行数据库迁移并启动 API

```powershell
.\.venv\Scripts\python.exe -m alembic upgrade head
.\.venv\Scripts\python.exe -m uvicorn app.main:create_app --factory --reload --host 127.0.0.1 --port 8000
```

- Swagger 交互文档：<http://127.0.0.1:8000/docs>
- OpenAPI 定义：<http://127.0.0.1:8000/openapi.json>
- 应用存活：<http://127.0.0.1:8000/health/live>
- 数据库连通性：<http://127.0.0.1:8000/health/ready>

`ready` 检查数据库连接，不检查迁移版本；启动前仍必须执行 `alembic upgrade head`。正式启动去掉 `--reload`。停止数据库可执行 `docker compose stop db`，数据卷会保留。

## 4. 用 Swagger 跑通第一次登录

1. 打开 `/docs`，执行 `POST /api/v1/auth/register`：

   ```json
   {"email": "learner@example.com", "display_name": "学习者", "password": "learn-python-123"}
   ```

2. 点击右上角 **Authorize**，`username` 填上面的邮箱，`password` 填密码，其他字段保持默认。
3. 执行 `GET /api/v1/users/me`，应返回当前用户信息。
4. 执行 `POST /api/v1/ideas`：

   ```json
   {"title": "学习后端", "content": "先理解一次 HTTP 请求", "tag_ids": ["learning-programming"]}
   ```

5. 复制响应中的 `id`，练习 GET、PATCH、DELETE；换一个账号访问这个 ID 会得到 404。

登录端点接收 `application/x-www-form-urlencoded` 表单，其他写入接口接收 JSON。`username` 字段名来自 OAuth2 表单约定，本项目用邮箱作为账号。这里实现的是自有应用的密码登录和 Bearer Token，不是第三方 OAuth 登录服务。

## 5. REST API 一览

| 方法 | 路径 | 作用 | 登录 |
| --- | --- | --- | --- |
| POST | `/api/v1/auth/register` | 注册，返回 201 | 否 |
| POST | `/api/v1/auth/login` | 获取 JWT 与有效秒数 | 否 |
| GET | `/api/v1/users/me` | 当前用户 | 是 |
| POST | `/api/v1/ideas` | 创建自己的想法，返回 201 和 Location | 是 |
| GET | `/api/v1/ideas` | 分页列表，可按 status 筛选 | 是 |
| GET | `/api/v1/ideas/{id}` | 查看想法 | 是 |
| PATCH | `/api/v1/ideas/{id}` | 部分更新 | 是 |
| DELETE | `/api/v1/ideas/{id}` | 删除，返回 204，无响应体 | 是 |
| GET | `/health/live` | 应用存活 | 否 |
| GET | `/health/ready` | 数据库连接检查 | 否 |

列表示例：`GET /api/v1/ideas?limit=20&offset=0&status=inbox`，响应包含 `items`、`total`、`limit`、`offset`。`limit` 范围 1–100；默认按创建时间和 ID 倒序排列。`total` 和列表是两次查询，其他请求同时写入时它们可能短暂不一致。

想法状态沿用现有前端：`inbox`、`exploring`、`convertedToProject`、`archived`。本阶段只是保存状态，标记 `convertedToProject` 不会创建项目。`tag_ids` 存标签标识，暂不校验标签是否存在。

PATCH 只修改实际传入的字段：`{"status":"archived"}` 不会清空标题或内容；显式 `null` 被拒绝，`content: ""` 和 `tag_ids: []` 可以清空内容或标签。空对象是合法的无操作更新。

常见状态码：400/422 表示请求格式或字段不合法，401 表示认证失败，404 表示资源不存在或不属于当前用户，409 表示邮箱重复，503 表示数据库不可用。业务错误使用 `{"detail":"说明"}`，字段验证错误使用 `{"detail":[...]}`，不回显输入的密码。

## 6. 理解登录认证

```text
注册：明文密码 → Argon2id 哈希 → users.hashed_password
登录：查邮箱 → 验证密码哈希 → 签发有效期 30 分钟的 JWT
访问：Authorization: Bearer JWT → 校验签名/过期/签发者/接收者 → 查用户 → 查资源归属
```

- 密码不会以明文存入数据库，也不会出现在响应中。
- JWT 的 `sub` 是用户 UUID。JWT 是签名数据，不是加密保险箱，因此不存敏感资料。
- 已停用或删除的用户即使持有尚未过期的 JWT，也无法访问受保护接口。
- 服务端从 JWT 获取资源归属，拒绝客户端提交 `owner_id`。
- 当前实现短期 access token，没有 refresh token、服务端注销/吊销列表。前端退出时清除 token，但此前发出的 token 会持续有效直到过期或用户被停用。Swagger 的 Logout 同样只是清除客户端凭证。
- 这是认证与权限的学习基础。对公网开放前，还需要接入 HTTPS、共享登录限流、邮箱验证和密码找回；如需“退出立即失效”，再实现持久化会话或令牌撤销机制。

密码长度 8–128 字符。邮箱采用大小写不敏感的账号规则；密码保留所有空格与大小写。

## 7. 理解数据库与事务

`models` 定义数据库表；`schemas` 定义客户端可以提交和看到的字段。二者分开，可以避免让 `hashed_password` 或 `owner_id` 意外进入 API。

`Session` 是一次数据库工作的上下文，不是登录会话。每个请求创建一个 Session，业务层调用 `commit()` 保存一项操作，出错时依赖负责 `rollback()`，最后关闭 Session 归还连接。SQLAlchemy 将条件表达式编译成参数化 SQL。

邮箱唯一性由数据库 `UNIQUE` 约束最终保障。即使两个注册请求同时通过“邮箱是否存在”的预检查，后一个提交也会触发冲突，代码会回滚并返回 409。

Alembic 管理数据库结构历史。应用启动时不会自动 `create_all()`，避免模型和数据库结构悄悄偏离。

修改 ORM 模型后，在本地开发库执行：

```powershell
.\.venv\Scripts\python.exe -m alembic revision --autogenerate -m "describe your change"
# 阅读并检查生成的迁移文件，再执行：
.\.venv\Scripts\python.exe -m alembic upgrade head
.\.venv\Scripts\python.exe -m alembic check
```

自动生成的迁移仍需检查，尤其是重命名字段等操作。`alembic downgrade -1` 用于回退；当前初始迁移回退会删表，只应在可丢弃的测试库练习。

## 8. 运行测试

不依赖 PostgreSQL 的快速测试：

```powershell
.\.venv\Scripts\python.exe -m pytest -q
.\.venv\Scripts\python.exe -m ruff check .
.\.venv\Scripts\python.exe -m ruff format --check .
```

默认使用内存 SQLite 测试接口，PostgreSQL 专属测试会跳过。这不等于已验证真实 PostgreSQL 行为。

真实 PostgreSQL 测试（先启动 Compose 数据库，创建专用测试库只需一次）：

```powershell
docker compose exec db createdb -U ariadne ariadne_test
$env:TEST_DATABASE_URL = "postgresql+psycopg://ariadne:ariadne_dev_password@localhost:5432/ariadne_test"
.\.venv\Scripts\python.exe -m pytest -q
Remove-Item Env:TEST_DATABASE_URL
```

配置后，整套接口测试会在 PostgreSQL 上运行。每项测试创建随机 schema，通过 Alembic 建表，完成后只删除自己创建的 schema。连接必须指向名称以 `_test` 结尾的专用库；不要指向实际业务库。测试覆盖登录、密码哈希、重复邮箱、JWT 校验、停用账号、分页、输入校验、跨用户隔离、数据库约束和迁移升降级。

## 9. 与现有前端的关系

前端位于上一级目录，目前仍通过 `lib/storage.ts` 使用 localStorage；本次后端没有自动接管或迁移浏览器数据。Python 服务独立运行，也不会随现有 Cloudflare Worker 一起部署。项目、记录、标签和聊天的后端接口尚未实现，可以沿用当前分层继续扩展。

API 字段采用 Python 常用的 `snake_case`。后续连接前端时，需要显式转换 `tag_ids ↔ tagIds`、`created_at ↔ createdAt`、`updated_at ↔ updatedAt`。

最小浏览器调用示例（令牌仅保存在变量中）：

```typescript
const baseUrl = "http://127.0.0.1:8000/api/v1";
const login = await fetch(`${baseUrl}/auth/login`, {
  method: "POST",
  body: new URLSearchParams({ username: "learner@example.com", password: "learn-python-123" }),
});
if (!login.ok) throw new Error("登录失败");
const { access_token } = await login.json();
const response = await fetch(`${baseUrl}/ideas`, {
  headers: { Authorization: `Bearer ${access_token}` },
});
if (!response.ok) throw new Error("读取想法失败");
const page = await response.json();
console.log(page.items);
```

## 10. 建议阅读与练习顺序

1. `app/main.py`：应用怎样创建、路由怎样注册。
2. `schemas/user.py` 与 `models/user.py`：API 数据与数据库数据有什么区别。
3. `api/routes/auth.py` → `services/auth.py` → `db/session.py`：注册如何保存数据。
4. `core/security.py` → `api/deps.py`：密码验证、JWT 签发与依赖注入。
5. `api/routes/ideas.py` → `services/ideas.py`：REST、分页和对象权限。
6. `alembic/versions/0001_create_users_and_ideas.py`：表结构如何被记录和部署。
7. `tests/test_ideas.py`：用两个用户证明隔离规则确实成立，再尝试为项目增加同样的测试。

实现参考：[FastAPI JWT 教程](https://fastapi.tiangolo.com/tutorial/security/oauth2-jwt/)、[SQLAlchemy Session 文档](https://docs.sqlalchemy.org/en/20/orm/session_basics.html)、[Alembic 迁移教程](https://alembic.sqlalchemy.org/en/latest/tutorial.html)。
