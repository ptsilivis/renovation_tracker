# Kampos Hub

Shared dashboard for tracking a family summer-house renovation (an old stone
house in Messinian Mani) — finances and activities in one place for four family
members. Self-hosted on a Raspberry Pi.

Built from a Claude Design source ("Kampos Renovation Hub") turned into a real,
multi-user app. Full requirements: [`doc/prds/kampos-hub.prd.md`](doc/prds/kampos-hub.prd.md).

## Features

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
- Bilingual **Greek / English**, four admin accounts, all data shared.

## Stack

- **Backend:** Python + FastAPI, SQLAlchemy, PostgreSQL. JWT auth in an httpOnly
  cookie (argon2 hashing). Uploaded files on the filesystem.
- **Frontend:** vanilla JS / HTML / CSS, no build step. A `fetch()` client is the
  single swap point replacing the design's localStorage repository.
- **Hosting:** Raspberry Pi + Cloudflare Tunnel for HTTPS. See
  [`deploy/DEPLOY.md`](deploy/DEPLOY.md).

## Local development

```bash
# 1. Postgres (docker) — or use a local Postgres and edit backend/.env
docker compose up -d db

# 2. Backend
cd backend
python3 -m venv .venv && ./.venv/bin/pip install -r requirements.txt
cp .env.example .env                       # defaults point at the docker db
./.venv/bin/alembic upgrade head
./.venv/bin/python -m app.seed             # sample data + 4 accounts (pw: kampos2026)

# 3. Run (serves API + frontend at http://localhost:8000)
./.venv/bin/uvicorn app.main:app --reload --port 8000
```

Open http://localhost:8000 and sign in with `p.tsilivis10@gmail.com` / `kampos2026`.

## Repository layout

```
backend/    FastAPI app, models, routers, Alembic migrations, seed
frontend/   vanilla-JS SPA (index.html, css, js/screens)
deploy/     systemd unit, Cloudflare Tunnel guide, DEPLOY.md
doc/prds/   product requirements
```
