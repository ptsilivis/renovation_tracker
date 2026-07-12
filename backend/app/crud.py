"""Generic collection access shared by the data routers.

The frontend's api.js talks to these collections by name, mirroring the design's
repository. Field names are the DB (snake_case) names; the vanilla-JS frontend
consumes them directly.
"""
import secrets
from decimal import Decimal

from sqlalchemy import inspect
from sqlalchemy.orm import Session

from .models import (
    Category,
    CostItem,
    MoodboardItem,
    Phase,
    PlanRoom,
    PlanUnderlay,
    PlanWall,
    Room,
    Surface,
    Task,
)

# Collections exposed through the generic CRUD router (snake_case == API name).
REGISTRY = {
    "categories": Category,
    "tasks": Task,
    "cost_items": CostItem,
    "moodboard_items": MoodboardItem,
    "rooms": Room,
    "surfaces": Surface,
    "phases": Phase,
    "plan_rooms": PlanRoom,
    "plan_walls": PlanWall,
    "plan_underlays": PlanUnderlay,
}

# Floor-plan tables keep arbitrary geometry in a JSON `data` column; the API
# flattens {id, **data} so the editor sees plain objects.
_JSON_COLLECTIONS = {"plan_rooms", "plan_walls", "plan_underlays"}

_PREFIX = {
    "categories": "cat",
    "tasks": "task",
    "cost_items": "cost",
    "moodboard_items": "mood",
    "rooms": "room",
    "surfaces": "surf",
    "phases": "phase",
    "plan_rooms": "prm",
    "plan_walls": "pwl",
    "plan_underlays": "pun",
}


def new_id(collection: str) -> str:
    return f"{_PREFIX.get(collection, collection[:4])}_{secrets.token_hex(5)}"


def _cols(model) -> list[str]:
    return [c.key for c in inspect(model).columns]


def _clean(value):
    return float(value) if isinstance(value, Decimal) else value


def serialize(collection: str, row) -> dict:
    if collection in _JSON_COLLECTIONS:
        return {"id": row.id, **(row.data or {})}
    return {c: _clean(getattr(row, c)) for c in _cols(type(row))}


def list_all(db: Session, collection: str) -> list[dict]:
    model = REGISTRY[collection]
    rows = db.query(model).all()
    return [serialize(collection, r) for r in rows]


def create(db: Session, collection: str, body: dict) -> dict:
    model = REGISTRY[collection]
    rid = body.get("id") or new_id(collection)
    if collection in _JSON_COLLECTIONS:
        data = {k: v for k, v in body.items() if k != "id"}
        row = model(id=rid, data=data)
    else:
        allowed = set(_cols(model))
        fields = {k: v for k, v in body.items() if k in allowed and k != "id"}
        row = model(id=rid, **fields)
    db.add(row)
    db.commit()
    db.refresh(row)
    return serialize(collection, row)


def bulk_create(db: Session, collection: str, items: list[dict]) -> list[dict]:
    model = REGISTRY[collection]
    rows = []
    for body in items:
        rid = body.get("id") or new_id(collection)
        if collection in _JSON_COLLECTIONS:
            rows.append(model(id=rid, data={k: v for k, v in body.items() if k != "id"}))
        else:
            allowed = set(_cols(model))
            rows.append(model(id=rid, **{k: v for k, v in body.items() if k in allowed and k != "id"}))
    db.add_all(rows)
    db.commit()
    return [serialize(collection, r) for r in rows]


def bulk_delete(db: Session, collection: str, ids: list[str]) -> int:
    model = REGISTRY[collection]
    if not ids:
        return 0
    n = db.query(model).filter(model.id.in_(ids)).delete(synchronize_session=False)
    db.commit()
    return n


def update(db: Session, collection: str, rid: str, patch: dict) -> dict | None:
    model = REGISTRY[collection]
    row = db.get(model, rid)
    if row is None:
        return None
    if collection in _JSON_COLLECTIONS:
        data = dict(row.data or {})
        data.update({k: v for k, v in patch.items() if k != "id"})
        row.data = data
    else:
        allowed = set(_cols(model))
        for k, v in patch.items():
            if k in allowed and k != "id":
                setattr(row, k, v)
    db.commit()
    db.refresh(row)
    return serialize(collection, row)


def remove(db: Session, collection: str, rid: str) -> bool:
    model = REGISTRY[collection]
    row = db.get(model, rid)
    if row is None:
        return False
    db.delete(row)
    db.commit()
    return True
