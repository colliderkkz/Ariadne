from pydantic import EmailStr, TypeAdapter, ValidationError
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.errors import EmailAlreadyRegisteredError, InvalidCredentialsError
from app.core.security import DUMMY_PASSWORD_HASH, hash_password, verify_password
from app.models.user import User
from app.schemas.user import UserCreate

email_adapter = TypeAdapter(EmailStr)


def register_user(db: Session, data: UserCreate) -> User:
    if db.scalar(select(User).where(User.email == data.email)) is not None:
        raise EmailAlreadyRegisteredError

    user = User(
        email=data.email,
        display_name=data.display_name,
        hashed_password=hash_password(data.password),
    )
    db.add(user)
    try:
        db.commit()
    except IntegrityError as exc:
        # 预先查询不能防止两个并发请求同时注册；数据库唯一约束是最终保障。
        db.rollback()
        if db.scalar(select(User).where(User.email == data.email)) is not None:
            raise EmailAlreadyRegisteredError from exc
        raise
    db.refresh(user)
    return user


def authenticate_user(db: Session, email: str, password: str) -> User:
    if len(email) > 320 or len(password) > 128:
        raise InvalidCredentialsError
    try:
        normalized_email = email_adapter.validate_python(email).lower()
    except ValidationError as exc:
        raise InvalidCredentialsError from exc
    user = db.scalar(select(User).where(User.email == normalized_email))
    candidate_hash = user.hashed_password if user else DUMMY_PASSWORD_HASH
    valid_password = verify_password(password, candidate_hash)
    if user is None or not valid_password or not user.is_active:
        raise InvalidCredentialsError
    return user
