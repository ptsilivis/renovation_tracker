"""Settings, activity logging, measurements export, dev reset. All per-project."""
import time

from fastapi import APIRouter, Body, Depends, Query
from sqlalchemy.orm import Session

from .. import crud
from ..crud import new_id
from ..db import get_db
from ..deps import get_current_user
from ..models import Activity, Setting, User

router = APIRouter(prefix="/api", tags=["meta"], dependencies=[Depends(get_current_user)])


def _settings_out(s: Setting | None) -> dict:
    return {
        "total_budget": float(s.total_budget) if s else 0,
        "project_start": s.project_start if s else None,
        "project_end": s.project_end if s else None,
        "plan_scale": float(s.plan_scale) if s and s.plan_scale is not None else 50,
    }


@router.get("/settings")
def get_settings(project: str = Query(...), db: Session = Depends(get_db)):
    return _settings_out(db.get(Setting, project))


@router.patch("/settings")
def patch_settings(project: str = Query(...), patch: dict = Body(...), db: Session = Depends(get_db)):
    s = db.get(Setting, project)
    if s is None:
        s = Setting(id=project, total_budget=0)
        db.add(s)
    if "total_budget" in patch:
        s.total_budget = patch["total_budget"]
    if "project_start" in patch:
        s.project_start = patch["project_start"] or None
    if "project_end" in patch:
        s.project_end = patch["project_end"] or None
    if "plan_scale" in patch and patch["plan_scale"]:
        s.plan_scale = patch["plan_scale"]
    db.commit()
    return _settings_out(s)


@router.post("/activity")
def log_activity(
    project: str = Query(...),
    body: dict = Body(...),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    entry = Activity(
        id=new_id("activity"),
        project_id=project,
        ts=int(time.time() * 1000),
        text_el=body.get("el", ""),
        text_en=body.get("en", ""),
        user_id=user.id,
    )
    db.add(entry)
    db.commit()
    return {"id": entry.id, "ts": entry.ts, "el": entry.text_el, "en": entry.text_en}


@router.get("/measurements/export")
def export_measurements(project: str = Query(...), db: Session = Depends(get_db)):
    return {
        "rooms": crud.list_all(db, "rooms", project),
        "surfaces": crud.list_all(db, "surfaces", project),
        "plan": {
            "rooms": crud.list_all(db, "plan_rooms", project),
            "walls": crud.list_all(db, "plan_walls", project),
        },
    }


@router.post("/admin/reset")
def reset(db: Session = Depends(get_db)):
    from ..seed import seed_all

    seed_all(db, reset=True)
    return {"ok": True}
