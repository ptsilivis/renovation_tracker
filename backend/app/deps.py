"""Shared FastAPI dependencies."""
from fastapi import Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from .auth import COOKIE_NAME, decode_token
from .db import get_db
from .models import User


def get_current_user(request: Request, db: Session = Depends(get_db)) -> User:
    token = request.cookies.get(COOKIE_NAME)
    user_id = decode_token(token) if token else None
    if not user_id:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "not authenticated")
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "user not found")
    return user
