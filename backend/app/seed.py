"""Seed the database with the design's Greek sample data + the 4 family users.

Run as a module:  python -m app.seed
Idempotent: skips seeding if data already present unless reset=True.
"""
from sqlalchemy.orm import Session

from .auth import hash_password
from .config import settings as cfg
from .db import SessionLocal, engine, Base
from .models import (
    Activity,
    Category,
    CostItem,
    MoodboardItem,
    Phase,
    PlanRoom,
    PlanUnderlay,
    PlanWall,
    Room,
    Setting,
    Surface,
    Task,
    User,
)

# --- stable id maps (mirror store.js so foreign keys line up) ---------------
CAT = {k: f"cat_{k}" for k in
       ["roof", "masonry", "frames", "electrical", "plumbing", "floors", "paint", "outdoor", "fees"]}
ROOM = {k: f"room_{k}" for k in ["living", "kitchen", "bath", "bed1", "bed2", "yard"]}
TASK = {k: f"task_{k}" for k in [
    "roofTiles", "roofInsulation", "pointing", "plaster", "demolition", "windows", "doors",
    "shutters", "wiring", "plumbingNew", "bathFixtures", "solar", "screed", "woodFloor",
    "tiles", "paintInt", "paintExt", "yardPaving", "stoneWall", "permit"]}

CATEGORIES = [
    (CAT["roof"], "Στέγη", "Roof", 1),
    (CAT["masonry"], "Τοιχοποιία", "Masonry", 2),
    (CAT["frames"], "Κουφώματα", "Frames & openings", 3),
    (CAT["electrical"], "Ηλεκτρολογικά", "Electrical", 4),
    (CAT["plumbing"], "Υδραυλικά", "Plumbing", 5),
    (CAT["floors"], "Δάπεδα", "Floors", 6),
    (CAT["paint"], "Βαφές & Φινιρίσματα", "Paint & finishes", 7),
    (CAT["outdoor"], "Εξωτερικοί χώροι", "Outdoor", 8),
    (CAT["fees"], "Αμοιβές & Άδειες", "Fees & permits", 9),
]

# id, category, title, status, priority, dependency_note, contractor, notes
TASKS = [
    (TASK["permit"], CAT["fees"], "Έγκριση εργασιών μικρής κλίμακας", "done", "high", "", "Μηχανικός: Κ. Λαμπρόπουλος", "Ισχύει έως 03/2027."),
    (TASK["demolition"], CAT["masonry"], "Καθαιρέσεις εσωτερικών τοίχων & σαθρών επιχρισμάτων", "done", "high", "Μετά την έγκριση εργασιών", "Συνεργείο Καράμπελα", "Κρατήθηκαν οι πέτρες για την αυλή."),
    (TASK["roofTiles"], CAT["roof"], "Αποξήλωση στέγης & νέα κεραμίδια", "done", "high", "", "Γ. Δημόπουλος & Υιοί", "Βυζαντινά κεραμίδια, όπως τα παλιά."),
    (TASK["roofInsulation"], CAT["roof"], "Πέτσωμα & θερμομόνωση στέγης", "done", "high", "Μαζί με τα κεραμίδια", "Γ. Δημόπουλος & Υιοί", "Πετροβάμβακας 10cm."),
    (TASK["wiring"], CAT["electrical"], "Νέα ηλεκτρική εγκατάσταση & πίνακας", "done", "high", "Μετά τις καθαιρέσεις", "Ηλεκτρολόγος: Ν. Τσώνης", "Πρόβλεψη για A/C σε 2 δωμάτια."),
    (TASK["plumbingNew"], CAT["plumbing"], "Νέες σωληνώσεις ύδρευσης & αποχέτευσης", "done", "high", "Παράλληλα με ηλεκτρολογικά", "Υδραυλικός: Π. Μιχαλόπουλος", ""),
    (TASK["plaster"], CAT["masonry"], "Εσωτερικά επιχρίσματα", "in_progress", "high", "Μετά από σωληνώσεις/καλωδιώσεις", "Συνεργείο Καράμπελα", "Πατητή τεχνοτροπία στο σαλόνι."),
    (TASK["pointing"], CAT["masonry"], "Αρμολόγημα εξωτερικής πέτρας", "in_progress", "medium", "", "Συνεργείο Καράμπελα", "Δείγμα στη βόρεια όψη — εγκρίθηκε."),
    (TASK["windows"], CAT["frames"], "Ξύλινα παράθυρα (6 τεμ.)", "in_progress", "high", "Παραγγέλθηκαν 15/06 — παράδοση ~8 εβδ.", "Ξυλουργείο Καλαμάτας", "Καστανιά, διπλά τζάμια."),
    (TASK["doors"], CAT["frames"], "Εξωτερικές πόρτες (2 τεμ.)", "done", "medium", "", "Ξυλουργείο Καλαμάτας", ""),
    (TASK["shutters"], CAT["frames"], "Παντζούρια", "pending", "medium", "Μετά τα παράθυρα", "Ξυλουργείο Καλαμάτας", "Χρώμα: λαδί σκούρο."),
    (TASK["solar"], CAT["plumbing"], "Ηλιακός θερμοσίφωνας", "done", "low", "Μετά τη στέγη", "Υδραυλικός: Π. Μιχαλόπουλος", "200lt, διπλής ενέργειας."),
    (TASK["screed"], CAT["floors"], "Τσιμεντοκονία σαλονιού & κουζίνας", "pending", "high", "Μετά τα επιχρίσματα", "", "Ζητήθηκαν 2 προσφορές."),
    (TASK["woodFloor"], CAT["floors"], "Ξύλινο δάπεδο υπνοδωματίων", "pending", "medium", "Μετά την τσιμεντοκονία", "", ""),
    (TASK["tiles"], CAT["floors"], "Πλακάκια μπάνιου & κουζίνας", "in_progress", "high", "", "Συνεργείο Καράμπελα", "Τερακότα 20x20 στην κουζίνα."),
    (TASK["bathFixtures"], CAT["plumbing"], "Είδη υγιεινής & τοποθέτηση", "pending", "medium", "Μετά τα πλακάκια", "Υδραυλικός: Π. Μιχαλόπουλος", ""),
    (TASK["paintInt"], CAT["paint"], "Εσωτερικές βαφές", "pending", "medium", "Τελευταία φάση εσωτερικών", "", "Ασβεστοχρώματα σε ουδέτερους τόνους."),
    (TASK["paintExt"], CAT["paint"], "Εξωτερικά κονιάματα & βαφή", "pending", "low", "Μετά το αρμολόγημα", "", ""),
    (TASK["yardPaving"], CAT["outdoor"], "Πλακόστρωση αυλής με πέτρα", "pending", "low", "Άνοιξη 2027", "", "Με τις πέτρες από τις καθαιρέσεις."),
    (TASK["stoneWall"], CAT["outdoor"], "Επισκευή πέτρινης μάντρας", "pending", "low", "", "Συνεργείο Καράμπελα", ""),
]

# category, task, description, planned, actual, status, contractor, date, has_receipt
COSTS = [
    (CAT["fees"], TASK["permit"], "Έγκριση εργασιών μικρής κλίμακας", 900, 900, "paid", "Κ. Λαμπρόπουλος", "2026-03-10", True),
    (CAT["fees"], TASK["permit"], "Στατική αποτίμηση & μελέτη", 700, 700, "paid", "Κ. Λαμπρόπουλος", "2026-03-24", True),
    (CAT["masonry"], TASK["demolition"], "Καθαιρέσεις & απομάκρυνση μπάζων", 1200, 1150, "paid", "Συνεργείο Καράμπελα", "2026-04-18", True),
    (CAT["roof"], TASK["roofTiles"], "Αποξήλωση στέγης & νέα κεραμίδια", 8500, 8900, "paid", "Γ. Δημόπουλος & Υιοί", "2026-05-22", True),
    (CAT["roof"], TASK["roofInsulation"], "Πέτσωμα & θερμομόνωση στέγης", 3200, 3200, "paid", "Γ. Δημόπουλος & Υιοί", "2026-05-29", True),
    (CAT["electrical"], TASK["wiring"], "Νέα ηλεκτρική εγκατάσταση & πίνακας", 3800, 3950, "paid", "Ν. Τσώνης", "2026-06-05", True),
    (CAT["electrical"], None, "Φωτιστικά, διακόπτες, πρίζες", 900, 0, "pending", "", None, False),
    (CAT["plumbing"], TASK["plumbingNew"], "Σωληνώσεις ύδρευσης & αποχέτευσης", 2600, 2480, "paid", "Π. Μιχαλόπουλος", "2026-06-12", True),
    (CAT["plumbing"], TASK["solar"], "Ηλιακός θερμοσίφωνας 200lt", 1100, 1050, "paid", "Π. Μιχαλόπουλος", "2026-06-20", True),
    (CAT["plumbing"], TASK["bathFixtures"], "Είδη υγιεινής μπάνιου", 1700, 0, "pending", "", None, False),
    (CAT["masonry"], TASK["plaster"], "Εσωτερικά επιχρίσματα", 2800, 2650, "paid", "Συνεργείο Καράμπελα", "2026-06-28", False),
    (CAT["masonry"], TASK["pointing"], "Αρμολόγημα εξωτερικής πέτρας", 4500, 0, "pending", "Συνεργείο Καράμπελα", None, False),
    (CAT["frames"], TASK["windows"], "Ξύλινα παράθυρα καστανιά (6 τεμ.)", 5400, 0, "pending", "Ξυλουργείο Καλαμάτας", None, False),
    (CAT["frames"], TASK["doors"], "Εξωτερικές πόρτες (2 τεμ.)", 2200, 2350, "paid", "Ξυλουργείο Καλαμάτας", "2026-06-15", True),
    (CAT["frames"], TASK["shutters"], "Παντζούρια", 1800, 0, "pending", "Ξυλουργείο Καλαμάτας", None, False),
    (CAT["floors"], TASK["screed"], "Τσιμεντοκονία σαλονιού & κουζίνας", 1900, 0, "pending", "", None, False),
    (CAT["floors"], TASK["woodFloor"], "Ξύλινο δάπεδο υπνοδωματίων", 2800, 0, "pending", "", None, False),
    (CAT["floors"], TASK["tiles"], "Πλακάκια μπάνιου & κουζίνας", 1600, 1720, "paid", "Συνεργείο Καράμπελα", "2026-07-01", True),
    (CAT["paint"], TASK["paintInt"], "Εσωτερικές βαφές (ασβεστοχρώματα)", 1400, 0, "pending", "", None, False),
    (CAT["paint"], TASK["paintExt"], "Εξωτερικά κονιάματα & βαφή", 1100, 0, "pending", "", None, False),
    (CAT["outdoor"], TASK["yardPaving"], "Πλακόστρωση αυλής με πέτρα", 2400, 0, "pending", "", None, False),
    (CAT["outdoor"], TASK["stoneWall"], "Επισκευή πέτρινης μάντρας", 1000, 0, "pending", "Συνεργείο Καράμπελα", None, False),
    (CAT["outdoor"], None, "Ξύλινη πέργκολα αυλής", 800, 0, "pending", "", None, False),
]

# url, title, room, comment, likes
MOOD = [
    ("https://www.ikea.com/gr/el/p/sinnerlig-fotistiko-orofis-70544298/", "Κρεμαστό φωτιστικό μπαμπού", ROOM["living"], "Για πάνω από το τραπέζι — ζεστό φως.", 3),
    ("https://www.leroymerlin.gr/plakakia-terracotta", "Τερακότα 20x20 για την κουζίνα", ROOM["kitchen"], "Σαν τα παλιά πατώματα της γιαγιάς.", 4),
    ("", "Νιπτήρας από πέτρα", ROOM["bath"], "Το είδαμε σε ξενώνα στην Καρδαμύλη.", 2),
    ("https://www.etsy.com/listing/greek-linen-curtains", "Λινές κουρτίνες σε χρώμα άμμου", ROOM["bed1"], "", 1),
    ("", "Πέργκολα με κληματαριά", ROOM["yard"], "Όπως ήταν παλιά στην αυλή.", 4),
]

ROOMS = [
    (ROOM["living"], "Σαλόνι", 0), (ROOM["kitchen"], "Κουζίνα", 0), (ROOM["bath"], "Μπάνιο", 0),
    (ROOM["bed1"], "Υπνοδωμάτιο 1", 1), (ROOM["bed2"], "Υπνοδωμάτιο 2", 1), (ROOM["yard"], "Αυλή", 0),
]

# room, type, label, width_cm, height_cm, notes
SURFACES = [
    (ROOM["living"], "floor", "Δάπεδο", 480, 520, "Τσιμεντοκονία"),
    (ROOM["living"], "wall", "Βόρειος τοίχος", 520, 290, "Πέτρα εμφανής"),
    (ROOM["living"], "opening", "Παράθυρο ανατολικό", 110, 140, ""),
    (ROOM["living"], "opening", "Εξώπορτα", 105, 215, "Δίφυλλη"),
    (ROOM["kitchen"], "floor", "Δάπεδο", 320, 400, "Τερακότα 20x20"),
    (ROOM["kitchen"], "wall", "Τοίχος πάγκου", 400, 290, "Πλακάκι έως 160cm"),
    (ROOM["kitchen"], "opening", "Παράθυρο νότιο", 90, 120, ""),
    (ROOM["bath"], "floor", "Δάπεδο", 200, 240, ""),
    (ROOM["bath"], "wall", "Τοίχος ντους", 200, 250, "Πλήρης επένδυση"),
    (ROOM["bed1"], "floor", "Δάπεδο", 350, 420, "Ξύλινο"),
    (ROOM["bed1"], "opening", "Παράθυρο δυτικό", 110, 140, ""),
    (ROOM["bed2"], "floor", "Δάπεδο", 320, 380, "Ξύλινο"),
]

# name_el, name_en, start, end — schedule starts ~October with a slow ramp.
PHASES = [
    ("Άδειες & Μελέτες", "Permits & studies", "2026-10", "2026-12"),
    ("Καθαιρέσεις", "Demolition", "2027-01", "2027-02"),
    ("Στέγη", "Roof", "2027-02", "2027-04"),
    ("Η/Μ εγκαταστάσεις", "Electrical & plumbing", "2027-04", "2027-06"),
    ("Επιχρίσματα & Αρμολόγημα", "Plaster & pointing", "2027-06", "2027-08"),
    ("Δάπεδα & Κουφώματα", "Floors & frames", "2027-09", "2027-12"),
    ("Βαφές & Φινιρίσματα", "Paint & finishes", "2028-01", "2028-02"),
    ("Εξωτερικοί χώροι", "Outdoor works", "2028-03", "2028-05"),
]

# ts(ms), el, en
ACTIVITY = [
    (1751358600000, "Πληρωμή: Πλακάκια μπάνιου & κουζίνας — 1.720 €", "Paid: Bathroom & kitchen tiles — €1,720"),
    (1751133900000, "Πληρωμή: Εσωτερικά επιχρίσματα — 2.650 €", "Paid: Interior plastering — €2,650"),
    (1750922520000, "Νέα ιδέα στο moodboard: «Πέργκολα με κληματαριά»", "New moodboard idea: “Pergola with vine”"),
    (1750419600000, "Ολοκληρώθηκε: Ηλιακός θερμοσίφωνας", "Completed: Solar water heater"),
    (1750006800000, "Παραγγελία: Ξύλινα παράθυρα (6 τεμ.) — Ξυλουργείο Καλαμάτας", "Ordered: Wooden windows (6) — Kalamata joinery"),
]

# The 4 family accounts (all admin). CHANGE the placeholder emails after setup.
USERS = [
    ("u_panos", "p.tsilivis10@gmail.com", "Πάνος"),
    ("u_member2", "member2@kampos.gr", "Μέλος 2"),
    ("u_member3", "member3@kampos.gr", "Μέλος 3"),
    ("u_member4", "member4@kampos.gr", "Μέλος 4"),
]

_DATA_TABLES = [
    Activity, CostItem, MoodboardItem, Surface, Task, PlanRoom, PlanWall,
    PlanUnderlay, Phase, Room, Category, Setting,
]


def seed_all(db: Session, reset: bool = False) -> None:
    if reset:
        for model in _DATA_TABLES:
            db.query(model).delete()
        db.commit()

    if db.query(Category).count() == 0:
        db.add(Setting(id="app", total_budget=50000, project_start="2026-10", project_end="2028-05"))
        for cid, el, en, order in CATEGORIES:
            db.add(Category(id=cid, name_el=el, name_en=en, sort_order=order))
        for rid, name, floor in ROOMS:
            db.add(Room(id=rid, name=name, floor_level=floor))
        for tid, cat, title, status, prio, dep, contr, notes in TASKS:
            db.add(Task(id=tid, category_id=cat, title=title, status=status,
                        priority=prio, dependency_note=dep, contractor=contr, notes=notes))
        db.flush()  # categories/rooms/tasks must exist before FK-bearing rows
        from .crud import new_id
        for cat, task, desc, planned, actual, status, contr, date, receipt in COSTS:
            db.add(CostItem(id=new_id("cost_items"), category_id=cat, task_id=task,
                            description=desc, planned_cost=planned, actual_cost=actual,
                            status=status, contractor=contr, date=date, has_receipt=receipt))
        for url, title, room, comment, likes in MOOD:
            db.add(MoodboardItem(id=new_id("moodboard_items"), url=url, title=title,
                                 room_id=room, comment=comment, likes=likes))
        for room, typ, label, w, h, notes in SURFACES:
            db.add(Surface(id=new_id("surfaces"), room_id=room, type=typ, label=label,
                           width_cm=w, height_cm=h, notes=notes))
        for i, (el, en, start, end) in enumerate(PHASES, start=1):
            db.add(Phase(id=new_id("phases"), name_el=el, name_en=en, start=start,
                         end=end, milestone=("2027-03" if en == "Roof" else None), sort_order=i))
        for ts, el, en in ACTIVITY:
            db.add(Activity(id=new_id("activity"), ts=ts, text_el=el, text_en=en))
        db.commit()

    # Users (create any missing; never overwrite an existing password).
    for uid, email, name in USERS:
        if not db.query(User).filter(User.email == email).first():
            db.add(User(id=uid, email=email.lower(),
                        password_hash=hash_password(cfg.seed_password),
                        display_name=name, role="admin"))
    db.commit()


def main() -> None:
    Base.metadata.create_all(engine)  # safety net if migrations not yet applied
    db = SessionLocal()
    try:
        seed_all(db)
        print("Seed complete. Users:")
        for _, email, _ in USERS:
            print(f"  {email}  (password: {cfg.seed_password})")
    finally:
        db.close()


if __name__ == "__main__":
    main()
