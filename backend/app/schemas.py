"""Pydantic request/response models (only where a fixed shape is useful;
collection CRUD uses free-form dicts to mirror the design's repository)."""
from pydantic import BaseModel, EmailStr


class LoginIn(BaseModel):
    email: EmailStr
    password: str


class ChangePasswordIn(BaseModel):
    current_password: str
    new_password: str


class UserOut(BaseModel):
    id: str
    email: str
    display_name: str
    role: str
    must_change_password: bool = False
