"""Session authentication for underwriters."""

from fastapi import Header, HTTPException


class User:
    def __init__(self, user_id: str, role: str):
        self.id = user_id
        self.role = role


def current_underwriter(authorization: str = Header(...)) -> User:
    if not authorization.startswith("Bearer "):
        raise HTTPException(401, "unauthorized")
    return User(user_id=authorization.removeprefix("Bearer "), role="underwriter")
