"""Starter content for a brand-new project.

A blank project is intimidating, so a new project is scaffolded with the usual
renovation categories, a typical phase timeline (default 14-month window), and a
handful of guidance tasks. Everything is editable/deletable — it's just a head
start. Pass ``blank=True`` to skip it.
"""
from datetime import date

from sqlalchemy.orm import Session

from .crud import new_id
from .models import Category, Phase, Task

# id-suffix, name_el, name_en, sort
DEFAULT_CATEGORIES = [
    ("roof", "Στέγη", "Roof", 1),
    ("masonry", "Τοιχοποιία", "Masonry", 2),
    ("frames", "Κουφώματα", "Frames & openings", 3),
    ("electrical", "Ηλεκτρολογικά", "Electrical", 4),
    ("plumbing", "Υδραυλικά", "Plumbing", 5),
    ("floors", "Δάπεδα", "Floors", 6),
    ("paint", "Βαφές & Φινιρίσματα", "Paint & finishes", 7),
    ("outdoor", "Εξωτερικοί χώροι", "Outdoor", 8),
    ("fees", "Αμοιβές & Άδειες", "Fees & permits", 9),
]

# name_el, name_en, duration in months (spread across the default window)
DEFAULT_PHASES = [
    ("Άδειες & Μελέτες", "Permits & studies", 2),
    ("Καθαιρέσεις", "Demolition", 1),
    ("Στέγη", "Roof", 2),
    ("Η/Μ εγκαταστάσεις", "Electrical & plumbing", 2),
    ("Επιχρίσματα & Αρμολόγημα", "Plaster & pointing", 2),
    ("Δάπεδα & Κουφώματα", "Floors & frames", 3),
    ("Βαφές & Φινιρίσματα", "Paint & finishes", 1),
    ("Εξωτερικοί χώροι", "Outdoor works", 1),
]

# category-suffix, title_el (guidance tasks; all pending, no cost/contractor)
DEFAULT_TASKS = [
    ("fees", "Έκδοση άδειας / έγκριση εργασιών"),
    ("masonry", "Καθαιρέσεις & απομάκρυνση μπάζων"),
    ("roof", "Επισκευή / αντικατάσταση στέγης"),
    ("electrical", "Νέα ηλεκτρική εγκατάσταση"),
    ("plumbing", "Νέες σωληνώσεις ύδρευσης & αποχέτευσης"),
    ("frames", "Παραγγελία κουφωμάτων"),
    ("floors", "Επιλογή & τοποθέτηση δαπέδων"),
    ("paint", "Εσωτερικές & εξωτερικές βαφές"),
]


def _add_months(d: date, n: int) -> date:
    m = d.month - 1 + n
    return date(d.year + m // 12, m % 12 + 1, 1)


def scaffold_project(db: Session, project_id: str) -> dict:
    """Insert default categories, phases, and starter tasks. Returns a span
    {project_start, project_end} the caller should store on the project settings."""
    cats: dict[str, str] = {}
    for suffix, el, en, order in DEFAULT_CATEGORIES:
        cid = f"{new_id('categories')}_{suffix}"
        cats[suffix] = cid
        db.add(Category(id=cid, project_id=project_id, name_el=el, name_en=en, sort_order=order))

    # Timeline: start on the 1st of next month; each phase follows the previous.
    start = _add_months(date.today().replace(day=1), 1)
    cursor = start
    for i, (el, en, months) in enumerate(DEFAULT_PHASES, start=1):
        p_start = cursor
        p_end = _add_months(cursor, months)
        db.add(Phase(
            id=new_id("phases"), project_id=project_id, name_el=el, name_en=en,
            start=p_start.strftime("%Y-%m"), end=p_end.strftime("%Y-%m"), sort_order=i,
        ))
        cursor = p_end
    project_end = cursor

    for suffix, title in DEFAULT_TASKS:
        db.add(Task(
            id=new_id("tasks"), project_id=project_id, category_id=cats.get(suffix),
            title=title, status="pending", priority="medium",
        ))

    return {
        "project_start": start.strftime("%Y-%m"),
        "project_end": project_end.strftime("%Y-%m"),
    }
