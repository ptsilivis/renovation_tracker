# RenovationHub

A shared, self-hosted dashboard for tracking home-renovation projects — finances
and activities in one place for the people working on them. Manage **multiple
projects** from one install: pick a project on the first screen, or create a new
one.

Built from a Claude Design source turned into a real, multi-user app. It ships
with a sample project (a Greek stone-house renovation) so you can explore it with
realistic data.

## Features

- **Projects** — a first-screen picker to choose, create, rename, or delete a
  renovation. Each project has its own budget, timeline, and data.
- **Overview** — budget/spent/remaining/progress cards, phase Gantt timeline,
  planned-vs-actual chart, next tasks, activity feed.
- **Tasks** — category-grouped, editable table with status/priority/dependency/
  contractor/notes and rolled-up costs; admin category manager.
- **Costs** — spreadsheet grid of planned vs actual per line item, variance,
  status, contractor, date, receipt; filters, sort, category + grand totals.
- **Moodboard** — idea cards with links/photos, room tags, likes.
- **Floor Plan** — SVG room/wall editor with dimensions, zoom, image underlay,
  and GLB 3D model import.
- **Measurements** — rooms & surfaces with cm dimensions, JSON export.
- Bilingual **Greek / English**, shared admin accounts, all data shared per project.

## Stack

- **Backend:** Python + FastAPI, SQLAlchemy, PostgreSQL. JWT auth in an httpOnly
  cookie (argon2 hashing). Uploaded files on the filesystem.
- **Frontend:** vanilla JS / HTML / CSS, no build step. A `fetch()` client is the
  single data layer.
- **Hosting:** any host with Python + PostgreSQL. A Raspberry Pi + Cloudflare
  Tunnel setup is documented in [`deploy/DEPLOY.md`](deploy/DEPLOY.md).

## Local development

```bash
# 1. Postgres (docker) — or use a local Postgres and edit backend/.env
docker compose up -d db

# 2. Backend
cd backend
python3 -m venv .venv && ./.venv/bin/pip install -r requirements.txt
cp .env.example .env                       # defaults point at the docker db
./.venv/bin/alembic upgrade head
./.venv/bin/python -m app.seed             # sample project + admin accounts

# 3. Run (serves API + frontend at http://localhost:8000)
./.venv/bin/uvicorn app.main:app --reload --port 8000
```

Open http://localhost:8000, sign in with the seeded admin account (the seed step
prints the emails and password), and pick a project.

## Repository layout

```
backend/    FastAPI app, models, routers, Alembic migrations, seed
frontend/   vanilla-JS SPA (index.html, css, js/screens)
deploy/     systemd unit, Cloudflare Tunnel guide, DEPLOY.md
doc/prds/   product requirements
```

## Notes

- The database, uploaded files (`backend/uploads/`), and your `.env` are **not**
  tracked — see `.gitignore`. Nothing personal or secret is committed.
- The seed accounts and passwords are placeholders. Change `SEED_PASSWORD` and the
  account emails in `backend/app/seed.py` before any real deployment.
