"""Generic per-collection CRUD + the full data snapshot (== repo.getAll()).

Every collection is scoped to the active project, passed as a `?project=<id>`
query parameter (the SPA always knows its current project).
"""
from fastapi import APIRouter, Body, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from .. import crud
from ..db import get_db
from ..deps import get_current_user
from ..models import Activity, Setting, User

router = APIRouter(prefix="/api", tags=["data"], dependencies=[Depends(get_current_user)])


def _check(collection: str):
    if collection not in crud.REGISTRY:
        raise HTTPException(status.HTTP_404_NOT_FOUND, f"unknown collection '{collection}'")


@router.get("/data")
def snapshot(project: str = Query(...), db: Session = Depends(get_db)):
    """Everything the SPA needs for one project in one call (mirrors getAll())."""
    setting = db.get(Setting, project)
    activity = (
        db.query(Activity)
        .filter(Activity.project_id == project)
        .order_by(Activity.ts.desc())
        .limit(40)
        .all()
    )
    out = {
        "settings": {
            "total_budget": float(setting.total_budget) if setting else 0,
            "project_start": setting.project_start if setting else None,
            "project_end": setting.project_end if setting else None,
            "plan_scale": float(setting.plan_scale) if setting and setting.plan_scale is not None else 50,
        },
        "activity": [
            {"id": a.id, "ts": a.ts, "el": a.text_el, "en": a.text_en} for a in activity
        ],
    }
    for name in crud.REGISTRY:
        out[name] = crud.list_all(db, name, project)
    return out


@router.post("/{collection}/bulk")
def bulk_create_items(
    collection: str,
    project: str = Query(...),
    items: list[dict] = Body(...),
    db: Session = Depends(get_db),
):
    _check(collection)
    return crud.bulk_create(db, collection, items, project)


@router.post("/{collection}/bulk_delete")
def bulk_delete_items(
    collection: str,
    project: str = Query(...),
    ids: list[str] = Body(...),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    _check(collection)
    if user.role != "admin":
        raise HTTPException(status.HTTP_403_FORBIDDEN, "members cannot delete")
    return {"deleted": crud.bulk_delete(db, collection, ids, project)}


@router.post("/{collection}")
def create_item(
    collection: str,
    project: str = Query(...),
    body: dict = Body(...),
    db: Session = Depends(get_db),
):
    _check(collection)
    return crud.create(db, collection, body, project)


@router.patch("/{collection}/{item_id}")
def update_item(
    collection: str, item_id: str, patch: dict = Body(...), db: Session = Depends(get_db)
):
    _check(collection)
    row = crud.update(db, collection, item_id, patch)
    if row is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "not found")
    return row


@router.delete("/{collection}/{item_id}")
def delete_item(
    collection: str,
    item_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    _check(collection)
    # Role gate (all family members are admin today, but enforced server-side).
    if user.role != "admin":
        raise HTTPException(status.HTTP_403_FORBIDDEN, "members cannot delete")
    if not crud.remove(db, collection, item_id):
        raise HTTPException(status.HTTP_404_NOT_FOUND, "not found")
    return {"ok": True}
