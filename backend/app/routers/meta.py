"""Settings, activity logging, measurements export, dev reset."""
import time

from fastapi import APIRouter, Body, Depends
from sqlalchemy.orm import Session

from .. import crud
from ..crud import new_id
from ..db import get_db
from ..deps import get_current_user
from ..models import Activity, Setting, User

router = APIRouter(prefix="/api", tags=["meta"], dependencies=[Depends(get_current_user)])


@router.get("/settings")
def get_settings(db: Session = Depends(get_db)):
    s = db.get(Setting, "app")
    return {"total_budget": float(s.total_budget) if s else 0}


@router.patch("/settings")
def patch_settings(patch: dict = Body(...), db: Session = Depends(get_db)):
    s = db.get(Setting, "app")
    if s is None:
        s = Setting(id="app", total_budget=0)
        db.add(s)
    if "total_budget" in patch:
        s.total_budget = patch["total_budget"]
    db.commit()
    return {"total_budget": float(s.total_budget)}


@router.post("/activity")
def log_activity(
    body: dict = Body(...),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    entry = Activity(
        id=new_id("activity"),
        ts=int(time.time() * 1000),
        text_el=body.get("el", ""),
        text_en=body.get("en", ""),
        user_id=user.id,
    )
    db.add(entry)
    db.commit()
    return {"id": entry.id, "ts": entry.ts, "el": entry.text_el, "en": entry.text_en}


@router.get("/measurements/export")
def export_measurements(db: Session = Depends(get_db)):
    return {
        "rooms": crud.list_all(db, "rooms"),
        "surfaces": crud.list_all(db, "surfaces"),
        "plan": {
            "rooms": crud.list_all(db, "plan_rooms"),
            "walls": crud.list_all(db, "plan_walls"),
        },
    }


@router.post("/admin/reset")
def reset(db: Session = Depends(get_db)):
    from ..seed import seed_all

    seed_all(db, reset=True)
    return {"ok": True}
