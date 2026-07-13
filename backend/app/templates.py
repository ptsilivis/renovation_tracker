"""Starter content for a brand-new project.

A blank project is intimidating, so a new project is scaffolded with renovation
categories, a phase timeline, and a handful of guidance tasks. Everything is
editable/deletable — it's just a head start. Pass ``blank=True`` to skip it.

Two scaffolding modes:
- **Default** (no ``scope``): the full-renovation head start used by the seed and
  by projects created without answering the scope wizard.
- **Scope-driven**: the new-project wizard passes what the renovation covers
  (indoor painting / floor change / kitchen / bathroom, how many floors, and
  outdoor works). We then create only the relevant categories, a matching phase
  timeline, and sample tasks — repeating the per-floor ones for each floor.
"""
from datetime import date

from sqlalchemy.orm import Session

from .crud import new_id
from .models import Category, Phase, Task

# ── default (full renovation) head start ────────────────────────────────────
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

# ── scope-driven scaffolding ────────────────────────────────────────────────
# Master category catalogue: suffix -> (name_el, name_en, sort_order). Only the
# ones a project's scope needs get created, but always in this stable order.
CATEGORY_CATALOG = {
    "fees": ("Αμοιβές & Άδειες", "Fees & permits", 1),
    "masonry": ("Τοιχοποιία & Καθαιρέσεις", "Masonry & demolition", 2),
    "electrical": ("Ηλεκτρολογικά", "Electrical", 3),
    "plumbing": ("Υδραυλικά", "Plumbing", 4),
    "floors": ("Δάπεδα", "Floors", 5),
    "kitchen": ("Κουζίνα", "Kitchen", 6),
    "bathroom": ("Μπάνιο", "Bathroom", 7),
    "paint": ("Βαφές & Φινιρίσματα", "Paint & finishes", 8),
    "outdoor": ("Εξωτερικοί χώροι", "Outdoor", 9),
    "garden": ("Κήπος", "Garden", 10),
}

# Which categories each scope choice needs.
SCOPE_CATEGORIES = {
    "indoor_paint": ["paint"],
    "indoor_floors": ["masonry", "floors", "paint"],
    "kitchen": ["kitchen", "plumbing", "electrical"],
    "bathroom": ["masonry", "bathroom", "plumbing", "electrical"],
    "outdoor_paint": ["outdoor"],
    "balconies": ["outdoor"],
    "garden": ["garden"],
}

# Sample tasks per scope choice: (category_suffix, title_el, per_floor).
# per_floor tasks are repeated for each renovated floor (with a floor label).
SCOPE_TASKS = {
    "indoor_paint": [
        ("paint", "Προετοιμασία & στοκάρισμα τοίχων", False),
        ("paint", "Επιλογή χρωμάτων", False),
        ("paint", "Βαφή εσωτερικών χώρων", True),
    ],
    "indoor_floors": [
        ("masonry", "Αποξήλωση παλαιών δαπέδων", False),
        ("floors", "Επιλογή δαπέδου (πλακάκι/laminate/ξύλο)", False),
        ("floors", "Τοποθέτηση νέου δαπέδου", True),
        ("paint", "Σοβατεπί & φινιρίσματα", False),
    ],
    "kitchen": [
        ("kitchen", "Σχεδιασμός κουζίνας", False),
        ("plumbing", "Υδραυλικές παροχές κουζίνας", False),
        ("electrical", "Ηλεκτρικές παροχές & φωτισμός κουζίνας", False),
        ("kitchen", "Παραγγελία ντουλαπιών", False),
        ("kitchen", "Πάγκος & νεροχύτης", False),
        ("kitchen", "Πλακάκια & επιστρώσεις", False),
    ],
    "bathroom": [
        ("masonry", "Αποξήλωση παλιού μπάνιου", True),
        ("plumbing", "Υδραυλική εγκατάσταση μπάνιου", True),
        ("bathroom", "Στεγανοποίηση", True),
        ("bathroom", "Πλακάκια μπάνιου", True),
        ("bathroom", "Είδη υγιεινής & μπαταρίες", True),
        ("electrical", "Ηλεκτρολογικά & εξαερισμός", False),
    ],
    "outdoor_paint": [
        ("outdoor", "Εξωτερικές βαφές & σοβάδες", False),
    ],
    "balconies": [
        ("outdoor", "Στεγανοποίηση & πλακάκια μπαλκονιών", False),
        ("outdoor", "Κάγκελα / στηθαία", False),
    ],
    "garden": [
        ("garden", "Διαμόρφωση κήπου & φύτευση", False),
        ("garden", "Άρδευση / πότισμα", False),
    ],
}

# Phase (name_el, name_en) emitted when the given category is in scope, in order.
# fees always leads; the rest follow the natural build sequence.
PHASE_FOR_CATEGORY = [
    ("masonry", "Καθαιρέσεις", "Demolition"),
    ("electrical", "Η/Μ εγκαταστάσεις", "Electrical & plumbing"),
    ("plumbing", "Η/Μ εγκαταστάσεις", "Electrical & plumbing"),
    ("floors", "Δάπεδα", "Floors"),
    ("kitchen", "Κουζίνα", "Kitchen"),
    ("bathroom", "Μπάνιο", "Bathroom"),
    ("paint", "Βαφές & Φινιρίσματα", "Paint & finishes"),
    ("outdoor", "Εξωτερικοί χώροι", "Outdoor works"),
    ("garden", "Εξωτερικοί χώροι", "Outdoor works"),
]

FLOOR_LABELS = ["Ισόγειο", "1ος όροφος", "2ος όροφος", "3ος όροφος", "4ος όροφος", "5ος όροφος"]


def _add_months(d: date, n: int) -> date:
    m = d.month - 1 + n
    return date(d.year + m // 12, m % 12 + 1, 1)


def _floor_labels(n: int) -> list[str]:
    n = max(1, min(n, len(FLOOR_LABELS)))
    return FLOOR_LABELS[:n]


def scaffold_project(db: Session, project_id: str, scope: dict | None = None) -> dict:
    """Insert categories, phases, and starter tasks. Returns a span
    {project_start, project_end} the caller should store on the project settings.

    ``scope`` (from the new-project wizard) has shape
    ``{"types": [...], "floors": int, "outdoor": [...]}``; when it selects at
    least one thing, scaffolding is tailored to it. Otherwise the full-renovation
    default is used.
    """
    if scope and (scope.get("types") or scope.get("outdoor")):
        return _scaffold_from_scope(db, project_id, scope)
    return _scaffold_default(db, project_id)


def _scaffold_default(db: Session, project_id: str) -> dict:
    cats: dict[str, str] = {}
    for suffix, el, en, order in DEFAULT_CATEGORIES:
        cid = f"{new_id('categories')}_{suffix}"
        cats[suffix] = cid
        db.add(Category(id=cid, project_id=project_id, name_el=el, name_en=en, sort_order=order))

    start = _add_months(date.today().replace(day=1), 1)
    cursor = start
    for i, (el, en, months) in enumerate(DEFAULT_PHASES, start=1):
        p_end = _add_months(cursor, months)
        db.add(Phase(
            id=new_id("phases"), project_id=project_id, name_el=el, name_en=en,
            start=cursor.strftime("%Y-%m"), end=p_end.strftime("%Y-%m"), sort_order=i,
        ))
        cursor = p_end
    project_end = cursor

    for suffix, title in DEFAULT_TASKS:
        db.add(Task(
            id=new_id("tasks"), project_id=project_id, category_id=cats.get(suffix),
            title=title, status="pending", priority="medium",
        ))

    return {"project_start": start.strftime("%Y-%m"), "project_end": project_end.strftime("%Y-%m")}


def _scaffold_from_scope(db: Session, project_id: str, scope: dict) -> dict:
    types = [t for t in (scope.get("types") or []) if t in SCOPE_CATEGORIES]
    outdoor = [o for o in (scope.get("outdoor") or []) if o in SCOPE_CATEGORIES]
    choices = types + outdoor
    floors = _floor_labels(int(scope.get("floors") or 1))

    # Categories: fees always, plus everything the choices need — in catalogue order.
    needed = {"fees"}
    for choice in choices:
        needed.update(SCOPE_CATEGORIES[choice])
    cats: dict[str, str] = {}
    order = 0
    for suffix, (el, en, _sort) in CATEGORY_CATALOG.items():
        if suffix not in needed:
            continue
        order += 1
        cid = f"{new_id('categories')}_{suffix}"
        cats[suffix] = cid
        db.add(Category(id=cid, project_id=project_id, name_el=el, name_en=en, sort_order=order))

    # Phases: permits/prep first, then one per relevant stage (deduped, in order).
    phases: list[tuple[str, str]] = [("Άδειες & Προετοιμασία", "Permits & prep")]
    seen = set()
    for suffix, el, en in PHASE_FOR_CATEGORY:
        if suffix in needed and (el, en) not in seen:
            seen.add((el, en))
            phases.append((el, en))

    start = _add_months(date.today().replace(day=1), 1)
    cursor = start
    for i, (el, en) in enumerate(phases, start=1):
        p_end = _add_months(cursor, 1)
        db.add(Phase(
            id=new_id("phases"), project_id=project_id, name_el=el, name_en=en,
            start=cursor.strftime("%Y-%m"), end=p_end.strftime("%Y-%m"), sort_order=i,
        ))
        cursor = p_end
    project_end = cursor

    # A permit task only when there's real work beyond simple painting.
    structural = [c for c in choices if c != "indoor_paint"]
    if structural:
        db.add(Task(
            id=new_id("tasks"), project_id=project_id, category_id=cats.get("fees"),
            title="Έκδοση άδειας / έγκριση εργασιών", status="pending", priority="high",
        ))

    # Sample tasks per choice; per-floor ones repeat with a floor label.
    for choice in choices:
        for suffix, title, per_floor in SCOPE_TASKS[choice]:
            titles = [f"{title} — {lbl}" for lbl in floors] if (per_floor and len(floors) > 1) else [title]
            for tt in titles:
                db.add(Task(
                    id=new_id("tasks"), project_id=project_id, category_id=cats.get(suffix),
                    title=tt, status="pending", priority="medium",
                ))

    return {"project_start": start.strftime("%Y-%m"), "project_end": project_end.strftime("%Y-%m")}
