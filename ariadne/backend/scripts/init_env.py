"""首次启动前生成本机 .env。只使用标准库，不输出或覆盖已有密钥。"""

from pathlib import Path
from secrets import token_hex


def main() -> None:
    root = Path(__file__).resolve().parents[1]
    contents = (root / ".env.example").read_text(encoding="utf-8")
    contents = contents.replace("JWT_SECRET_KEY=\n", f"JWT_SECRET_KEY={token_hex(32)}\n")
    try:
        with (root / ".env").open("x", encoding="utf-8") as env_file:
            env_file.write(contents)
    except FileExistsError:
        print(".env already exists; kept unchanged.")
    else:
        print("Created .env with a random JWT secret. Review database settings before startup.")


if __name__ == "__main__":
    main()
