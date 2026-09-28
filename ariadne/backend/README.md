# Python 后端学习指南

完整启动命令、API 一览与前端链路见 [应用 README](../README.md)。本服务使用 Python 3.12+、FastAPI、SQLAlchemy 2、psycopg、PostgreSQL、Alembic、Argon2id 和 JWT。

## 阅读顺序

1. `app/main.py`：应用工厂、CORS、错误响应、资源释放。
2. `app/core/config.py`：环境变量验证，数据库和模型服务配置。
3. `app/db/session.py`：每次请求一个 Session，失败回滚，结束归还连接。
4. `app/models/` 与 `app/schemas/`：表结构与 API 输入/输出的分工。
5. `app/api/deps.py`：JWT 验证、查询当前用户、依赖注入。
6. `app/api/routes/` → `app/services/`：HTTP 路由调用业务函数、检查归属并提交事务。
7. `alembic/versions/`：用户/想法初始结构及项目/标签/记录/消息的增量迁移。
8. `tests/`：真实 PostgreSQL 约束、CRUD、跨账号隔离、迁移、LLM 和旧数据导入测试。

## 请求如何走完一圈

```text
POST /api/v1/projects
→ Pydantic 验证 ProjectCreate
→ get_current_user 验证 JWT + 查询用户
→ create_project 验证 linked_idea_id 的归属
→ SQLAlchemy 更新想法状态、创建项目
→ Session.commit() 提交同一事务
→ ProjectRead 只输出允许的字段
→ JSON 返回前端
```

普通 `def` 路由搭配同步 SQLAlchemy；FastAPI 在线程池运行同步端点。Session 是数据库工作上下文，与用户登录会话不同。业务函数完成一个操作后显式提交，异常由依赖统一回滚。没有启动时自动建表，结构变化必须通过 Alembic。

`services/common.py` 只复用简短的归属查询和分页逻辑，各资源路由仍显式声明，方便在 Swagger 和代码中一一对应。

## 数据库与迁移

在本目录运行：

```powershell
.\.venv\Scripts\python.exe scripts/init_env.py
docker compose up -d --wait db
.\.venv\Scripts\python.exe scripts/create_test_db.py
.\.venv\Scripts\python.exe -m alembic upgrade head
.\.venv\Scripts\python.exe -m alembic check
```

配置必须使用 `postgresql+psycopg://`，`TEST_DATABASE_URL` 必须指向名称以 `_test` 结尾的专用数据库。`create_test_db.py` 只在数据库不存在时创建，不删除数据。

修改模型后执行 `alembic revision --autogenerate -m "描述变更"`，检查生成的迁移再 `upgrade head`。迁移文件保留当时的结构与种子，不依赖随业务变化的模型。第二个迁移会为已有账号补齐标签，并保留旧想法中的标签引用。

## 认证与输入安全

密码只保存 Argon2id 哈希；JWT 固定校验算法、过期时间、issuer、audience 和 token type。每次请求仍检查账号是否存在且启用。客户端不能指定 owner_id，关联其它用户的想法、项目或标签返回 404。

PATCH 只处理传入字段；非空字段不能显式传 null。清空可选关联时可传 null。时间记录使用带时区时间，分钟数必须大于零。字段校验错误不会附带原始密码。

LLM 默认配置从后端环境变量读取，用户可通过 `/llm/config` 保存个人配置；个人 Key 使用 Fernet 加密存储，响应从不回显。加密密钥从 `JWT_SECRET_KEY` 派生，轮换该密钥后需重新填写个人 Key。可选服务商对应的地址由后端白名单定义，聊天接口不允许指定上游地址或认证信息。`/llm/test` 测试草稿配置但不保存。聊天上下文读取 PostgreSQL；返回成功后在一个事务中保存用户和助手消息。旧数据导入通过当前用户锁和确定性 UUID 实现原子性与可重试性。

0003 迁移为账号加入头像、主题和模型配置字段。`PATCH /users/me` 接收名字、头像和主题，头像仅允许有大小限制的 PNG/JPEG/WebP data URL；`GET /users/me` 使用白名单响应，不暴露加密后的模型密钥。

## 测试

```powershell
.\.venv\Scripts\python.exe -m pytest -q
.\.venv\Scripts\python.exe -m pytest tests/test_postgres.py -q
.\.venv\Scripts\python.exe -m ruff check .
.\.venv\Scripts\python.exe -m ruff format --check .
```

没有跳过 PostgreSQL 测试，也没有 SQLite 回退。测试库不可用时直接失败，每项测试通过真实迁移创建随机 schema，最后只清理自己的 schema。LLM 网络边界使用测试替身，不调用付费服务。

参考：[FastAPI JWT](https://fastapi.tiangolo.com/tutorial/security/oauth2-jwt/)、[SQLAlchemy Session](https://docs.sqlalchemy.org/en/20/orm/session_basics.html)、[Alembic](https://alembic.sqlalchemy.org/en/latest/tutorial.html)。
