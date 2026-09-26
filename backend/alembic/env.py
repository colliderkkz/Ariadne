from logging.config import fileConfig

from alembic import context
from sqlalchemy import create_engine, pool

from app import models  # noqa: F401 -- 注册全部 ORM 模型到 metadata
from app.core.config import Settings
from app.db.base import Base

config = context.config
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = Base.metadata


def run_migrations_offline() -> None:
    context.configure(
        url=Settings().database_url.get_secret_value(),
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        compare_type=True,
    )
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    # 集成测试可传入专用连接；常规命令从配置创建短生命周期连接。
    connection = config.attributes.get("connection")
    if connection is not None:
        apply_migrations(connection)
        return
    engine = create_engine(Settings().database_url.get_secret_value(), poolclass=pool.NullPool)
    try:
        with engine.connect() as connection:
            apply_migrations(connection)
    finally:
        engine.dispose()


def apply_migrations(connection) -> None:
    context.configure(connection=connection, target_metadata=target_metadata, compare_type=True)
    with context.begin_transaction():
        context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
