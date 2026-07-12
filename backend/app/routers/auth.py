"""Authentication routes: login / logout / me. No public registration."""
from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..auth import (
    clear_auth_cookie,
    create_token,
    hash_password,
    set_auth_cookie,
    verify_password,
)
from ..db import get_db
from ..deps import get_current_user
from ..models import User
from ..schemas import ChangePasswordIn, LoginIn, UserOut

router = APIRouter(prefix="/api/auth", tags=["auth"])

MIN_PASSWORD_LEN = 10


@router.post("/login", response_model=UserOut)
def login(body: LoginIn, response: Response, db: Session = Depends(get_db)):
    user = db.scalar(select(User).where(User.email == body.email.lower()))
    if not user or not verify_password(body.password, user.password_hash):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "invalid credentials")
    set_auth_cookie(response, create_token(user.id))
    return user


@router.post("/change-password")
def change_password(
    body: ChangePasswordIn,
    response: Response,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    if not verify_password(body.current_password, user.password_hash):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "current password is incorrect")
    new = body.new_password
    if len(new) < MIN_PASSWORD_LEN:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            f"password must be at least {MIN_PASSWORD_LEN} characters",
        )
    if new == body.current_password:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "new password must be different")
    user.password_hash = hash_password(new)
    user.must_change_password = False
    db.commit()
    # Re-issue the session so the current device stays logged in.
    set_auth_cookie(response, create_token(user.id))
    return {"ok": True}


@router.post("/logout")
def logout(response: Response):
    clear_auth_cookie(response)
    return {"ok": True}


@router.get("/me", response_model=UserOut)
def me(user: User = Depends(get_current_user)):
    return user
