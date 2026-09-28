class EmailAlreadyRegisteredError(Exception):
    """邮箱唯一约束冲突。业务层不依赖 HTTP 状态码。"""


class InvalidCredentialsError(Exception):
    """统一表示用户不存在、密码错误或账号停用。"""


class IdeaNotFoundError(Exception):
    """不存在和无权访问使用相同错误，避免泄露他人的资源是否存在。"""
