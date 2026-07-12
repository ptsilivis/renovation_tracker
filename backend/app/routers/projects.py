"""Project CRUD — the top-level entities users pick between on the first screen.

Projects are NOT project-scoped (they are the scope), so they live here rather
than in the generic collections router. Creating a project also creates its
per-project settings row so the app has somewhere to store budget/dates.
"""
import time

from fastapi import APIRouter, Body, Depends, HTTPException, status
from sqlalchemy.orm import Session

from ..crud import new_id
from ..db import get_db
from ..deps import get_current_user
from ..models import Project, Setting, User

router = APIRouter(prefix="/api/projects", tags=["projects"], dependencies=[Depends(get_current_user)])


def _out(p: Project, setting: Setting | None) -> dict:
    return {
        "id": p.id,
        "name": p.name,
        "description": p.description,
        "sort_order": p.sort_order,
        "created_ts": p.created_ts,
        "total_budget": float(setting.total_budget) if setting else 0,
    }


@router.get("")
def list_projects(db: Session = Depends(get_db)):
    projects = db.query(Project).order_by(Project.sort_order, Project.created_ts).all()
    settings = {s.id: s for s in db.query(Setting).all()}
    return [_out(p, settings.get(p.id)) for p in projects]


@router.post("")
def create_project(body: dict = Body(...), db: Session = Depends(get_db)):
    pid = body.get("id") or new_id("projects")
    last = db.query(Project).order_by(Project.sort_order.desc()).first()
    project = Project(
        id=pid,
        name=(body.get("name") or "").strip() or "Untitled project",
        description=body.get("description"),
        sort_order=(last.sort_order + 1) if last else 1,
        created_ts=int(time.time() * 1000),
    )
    setting = Setting(
        id=pid,
        total_budget=body.get("total_budget") or 0,
        project_start=body.get("project_start") or None,
        project_end=body.get("project_end") or None,
        plan_scale=body.get("plan_scale") or 50,
    )
    db.add(project)
    db.add(setting)
    db.commit()
    return _out(project, setting)


@router.patch("/{project_id}")
def update_project(project_id: str, patch: dict = Body(...), db: Session = Depends(get_db)):
    project = db.get(Project, project_id)
    if project is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "not found")
    if "name" in patch:
        project.name = (patch["name"] or "").strip() or project.name
    if "description" in patch:
        project.description = patch["description"]
    if "sort_order" in patch:
        project.sort_order = patch["sort_order"]
    db.commit()
    return _out(project, db.get(Setting, project_id))


@router.delete("/{project_id}")
def delete_project(
    project_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    if user.role != "admin":
        raise HTTPException(status.HTTP_403_FORBIDDEN, "members cannot delete")
    project = db.get(Project, project_id)
    if project is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "not found")
    db.delete(project)  # cascades to settings + all project-scoped rows
    db.commit()
    return {"ok": True}
