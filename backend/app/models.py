"""ORM models — one table per store.js collection, plus users.

IDs are strings so the design's stable seed identifiers (e.g. 'cat_roof',
'task_roof_tiles') survive and foreign keys line up with the original data.
"""
from sqlalchemy import (
    BigInteger,
    Boolean,
    CHAR,
    ForeignKey,
    Integer,
    Numeric,
    String,
    Text,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from .db import Base

# Foreign key onto the owning project, applied to every project-scoped table.
# Deleting a project cascades to all of its data.
_PROJECT_FK = lambda: mapped_column(
    ForeignKey("projects.id", ondelete="CASCADE"), index=True, nullable=False
)


class User(Base):
    __tablename__ = "users"
    id: Mapped[str] = mapped_column(String, primary_key=True)
    email: Mapped[str] = mapped_column(String, unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String)
    display_name: Mapped[str] = mapped_column(String)
    role: Mapped[str] = mapped_column(String, default="admin")


class Project(Base):
    """A single renovation. Users are global; all data below belongs to a project."""
    __tablename__ = "projects"
    id: Mapped[str] = mapped_column(String, primary_key=True)
    name: Mapped[str] = mapped_column(String, default="")
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    sort_order: Mapped[int] = mapped_column(Integer, default=0)
    created_ts: Mapped[int] = mapped_column(BigInteger, default=0)  # epoch ms


class Setting(Base):
    """One row per project; the primary key IS the project id."""
    __tablename__ = "settings"
    id: Mapped[str] = mapped_column(
        ForeignKey("projects.id", ondelete="CASCADE"), primary_key=True
    )
    total_budget: Mapped[float] = mapped_column(Numeric(12, 2), default=0)
    project_start: Mapped[str | None] = mapped_column(CHAR(7), nullable=True)  # YYYY-MM
    project_end: Mapped[str | None] = mapped_column(CHAR(7), nullable=True)
    plan_scale: Mapped[float] = mapped_column(Numeric(8, 2), default=50)  # floor-plan px per meter


class Category(Base):
    __tablename__ = "categories"
    id: Mapped[str] = mapped_column(String, primary_key=True)
    project_id: Mapped[str] = _PROJECT_FK()
    name_el: Mapped[str] = mapped_column(String)
    name_en: Mapped[str | None] = mapped_column(String, nullable=True)
    sort_order: Mapped[int] = mapped_column(Integer, default=0)


class Task(Base):
    __tablename__ = "tasks"
    id: Mapped[str] = mapped_column(String, primary_key=True)
    project_id: Mapped[str] = _PROJECT_FK()
    category_id: Mapped[str | None] = mapped_column(
        ForeignKey("categories.id", ondelete="SET NULL"), nullable=True
    )
    title: Mapped[str] = mapped_column(Text, default="")
    status: Mapped[str] = mapped_column(String, default="pending")
    priority: Mapped[str] = mapped_column(String, default="medium")
    dependency_note: Mapped[str] = mapped_column(Text, default="")
    contractor: Mapped[str] = mapped_column(String, default="")
    notes: Mapped[str] = mapped_column(Text, default="")


class CostItem(Base):
    __tablename__ = "cost_items"
    id: Mapped[str] = mapped_column(String, primary_key=True)
    project_id: Mapped[str] = _PROJECT_FK()
    category_id: Mapped[str | None] = mapped_column(
        ForeignKey("categories.id", ondelete="SET NULL"), nullable=True
    )
    task_id: Mapped[str | None] = mapped_column(
        ForeignKey("tasks.id", ondelete="SET NULL"), nullable=True
    )
    description: Mapped[str] = mapped_column(Text, default="")
    planned_cost: Mapped[float] = mapped_column(Numeric(12, 2), default=0)
    actual_cost: Mapped[float] = mapped_column(Numeric(12, 2), default=0)
    status: Mapped[str] = mapped_column(String, default="pending")
    contractor: Mapped[str] = mapped_column(String, default="")
    date: Mapped[str | None] = mapped_column(String, nullable=True)
    has_receipt: Mapped[bool] = mapped_column(Boolean, default=False)
    receipt_file: Mapped[str | None] = mapped_column(String, nullable=True)


class Room(Base):
    __tablename__ = "rooms"
    id: Mapped[str] = mapped_column(String, primary_key=True)
    project_id: Mapped[str] = _PROJECT_FK()
    name: Mapped[str] = mapped_column(String, default="")
    floor_level: Mapped[int] = mapped_column(Integer, default=0)


class Surface(Base):
    __tablename__ = "surfaces"
    id: Mapped[str] = mapped_column(String, primary_key=True)
    project_id: Mapped[str] = _PROJECT_FK()
    room_id: Mapped[str | None] = mapped_column(
        ForeignKey("rooms.id", ondelete="CASCADE"), nullable=True
    )
    type: Mapped[str] = mapped_column(String, default="wall")
    label: Mapped[str] = mapped_column(String, default="")
    width_cm: Mapped[int] = mapped_column(Integer, default=0)
    height_cm: Mapped[int] = mapped_column(Integer, default=0)
    notes: Mapped[str] = mapped_column(Text, default="")


class MoodboardItem(Base):
    __tablename__ = "moodboard_items"
    id: Mapped[str] = mapped_column(String, primary_key=True)
    project_id: Mapped[str] = _PROJECT_FK()
    url: Mapped[str] = mapped_column(Text, default="")
    image_ref: Mapped[str | None] = mapped_column(String, nullable=True)
    title: Mapped[str] = mapped_column(Text, default="")
    room_id: Mapped[str | None] = mapped_column(
        ForeignKey("rooms.id", ondelete="SET NULL"), nullable=True
    )
    comment: Mapped[str] = mapped_column(Text, default="")
    likes: Mapped[int] = mapped_column(Integer, default=0)


class Phase(Base):
    __tablename__ = "phases"
    id: Mapped[str] = mapped_column(String, primary_key=True)
    project_id: Mapped[str] = _PROJECT_FK()
    name_el: Mapped[str] = mapped_column(String, default="")
    name_en: Mapped[str] = mapped_column(String, default="")
    start: Mapped[str] = mapped_column(CHAR(7), default="")  # YYYY-MM
    end: Mapped[str] = mapped_column(CHAR(7), default="")
    milestone: Mapped[str | None] = mapped_column(CHAR(7), nullable=True)  # optional YYYY-MM
    sort_order: Mapped[int] = mapped_column(Integer, default=0)


# Floor-plan editor state — free-form geometry stored as JSON blobs.
class PlanRoom(Base):
    __tablename__ = "plan_rooms"
    id: Mapped[str] = mapped_column(String, primary_key=True)
    project_id: Mapped[str] = _PROJECT_FK()
    data: Mapped[dict] = mapped_column(JSONB, default=dict)


class PlanWall(Base):
    __tablename__ = "plan_walls"
    id: Mapped[str] = mapped_column(String, primary_key=True)
    project_id: Mapped[str] = _PROJECT_FK()
    data: Mapped[dict] = mapped_column(JSONB, default=dict)


class PlanUnderlay(Base):
    __tablename__ = "plan_underlays"
    id: Mapped[str] = mapped_column(String, primary_key=True)
    project_id: Mapped[str] = _PROJECT_FK()
    data: Mapped[dict] = mapped_column(JSONB, default=dict)


class Activity(Base):
    __tablename__ = "activity"
    id: Mapped[str] = mapped_column(String, primary_key=True)
    project_id: Mapped[str] = _PROJECT_FK()
    ts: Mapped[int] = mapped_column(BigInteger, index=True)  # epoch ms
    text_el: Mapped[str] = mapped_column(Text, default="")
    text_en: Mapped[str] = mapped_column(Text, default="")
    user_id: Mapped[str | None] = mapped_column(String, nullable=True)
