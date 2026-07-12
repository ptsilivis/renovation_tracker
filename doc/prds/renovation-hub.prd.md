# RenovationHub — Product Requirements Document

**Status:** Draft (decisions locked 2026-07-11)
**Owner:** Panos Tsilivis
**Repo:** `renovation_tracker` (git, branch `main`)

---

## 1. Purpose

RenovationHub is a shared web dashboard for tracking home-renovation projects. It
centralises **financial tracking** (planned vs. actual costs) and **project
activities** (tasks, phase timeline, design ideas, floor plan) so that a small
group shares a single source of truth instead of scattered chats, spreadsheets,
and photos. It supports **multiple projects** — the bundled sample is a family
stone-house renovation in Messinian Mani, Greece (working budget ~€50,000).

The UI already exists as a polished design in Claude Design
("Kampos Renovation Hub", file `Kampos Hub - Aegean.dc.html`). This project turns
that design into a real, self-hosted, multi-user application.

## 2. Users

- **4 family members**, all with equal privileges (**all admin**).
- Closed group: **no public sign-up**. An admin pre-creates the four accounts.
- Individual logins exist for authentication and change attribution, even though
  all four share the same admin capabilities.
- Interface language: **Greek and English** (toggle). Seed/content data is in
  Greek.

## 3. Scope

### In scope (adopt the full design as-is) — 6 screens

| Screen | Contents |
|--------|----------|
| **Overview** | Stat cards (budget, spent, remaining, progress); phase **Gantt timeline**; **planned-vs-actual** bar chart by category; next tasks; recent-activity feed. |
| **Tasks** | Editable task table grouped by category — title, status (`pending`/`in_progress`/`done`), priority (`high`/`medium`/`low`), dependency note, contractor, notes, rolled-up linked costs. Admin category manager (add/rename/reorder/delete). |
| **Costs** | Spreadsheet-style grid — category, description, task link, **planned_cost**, **actual_cost**, variance, status (`paid`/`pending`), contractor, date, receipt flag. Category subtotals + grand totals. Filters (category/status) and sort. |
| **Moodboard** | Idea cards — URL and/or uploaded photo, room tag, comment, ❤ like counter. Room filter chips. |
| **Floor Plan** | SVG editor — draw/move/resize rooms and walls, toggle dimensions, zoom, image underlay, **GLB 3D model import**. |
| **Surfaces / Measurements** | Rooms + surfaces (floor/wall/opening) with cm dimensions and notes; JSON export. |

### Out of scope (v1)

- Who-paid-whom / per-member cost splitting (single shared common budget).
- A dedicated vendor entity (contractor is a free-text field).
- Live/real-time collaborative editing.
- A separate decisions log or document library.
- Native mobile apps (responsive web only).

## 4. Data model

Mirrors the design's `store.js` collections. Target: PostgreSQL tables.

- **settings** — `total_budget`, misc app settings.
- **users** — `id`, `email`, `password_hash`, `display_name`, `role` (all `admin`).
- **categories** — `id`, `name_el`, `name_en?`, `sort_order`.
- **tasks** — `id`, `category_id`, `title`, `status`, `priority`,
  `dependency_note`, `contractor`, `notes`.
- **cost_items** — `id`, `category_id`, `task_id?` (nullable), `description`,
  `planned_cost`, `actual_cost`, `status` (`paid`/`pending`), `contractor`,
  `date`, `has_receipt`, `receipt_file?`.
- **moodboard_items** — `id`, `url`, `image_ref?` (file path), `title`,
  `room_id`, `comment`, `likes`.
- **rooms** — `id`, `name`, `floor_level`.
- **surfaces** — `id`, `room_id`, `type` (`floor`/`wall`/`opening`), `label`,
  `width_cm`, `height_cm`, `notes`.
- **plan_rooms**, **plan_walls**, **plan_underlays** — floor-plan editor state.
- **phases** — `id`, `name_el`, `name_en`, `start` (YYYY-MM), `end` (YYYY-MM).
  Standalone timeline; **not linked to costs**.
- **activity** — `id`, `ts`, `text_el`, `text_en`, `user_id?`. Append-only log,
  capped/trimmed for display.

### Financial model

Budget is tracked **per cost line item**: `planned_cost` vs `actual_cost`,
tagged by **category** and optionally linked to a **task**. There is **no
phase↔cost link** — phases are a pure timeline. A single `total_budget` setting
anchors the Overview stat cards. `contractor` is free text (no vendor table).

## 5. Architecture

Self-hosted on the owner's **Raspberry Pi** (free). Clean split:

- **Database:** PostgreSQL on the Pi.
- **Backend:** Python + **FastAPI**, JSON REST API. One endpoint group per
  collection (CRUD), plus auth and file upload/serve. `uvicorn` runtime.
- **Frontend:** **Vanilla JS / HTML / CSS**, rebuilt faithfully from the design.
  The Claude Design canvas format (`x-dc`, `sc-for`, `sc-if`, `{{ }}` bindings,
  `support.js`/`glb.js` runtime) is **not** reused — screens are reimplemented as
  plain JS so the app has no proprietary-runtime dependency. The design's
  repository pattern is preserved: a `fetch()`-based API client replaces the
  `LocalStorageRepository`.
- **Files:** uploads (moodboard photos, floor-plan underlay images, GLB models,
  receipts) saved to the **Pi filesystem**; DB stores the path; served via API.
- **Remote access:** **Cloudflare Tunnel** (`cloudflared`) — free HTTPS domain,
  no port-forwarding, home IP not exposed.

### Auth

- Email + password. Passwords hashed with **argon2** (or bcrypt).
- On login, backend issues a **JWT stored in an httpOnly cookie**.
- Accounts pre-seeded by an admin; no registration endpoint exposed publicly.
- HTTPS is mandatory (provided by the Cloudflare Tunnel) for cookie/password
  safety.

### Concurrency

**Last-write-wins** per-field save (each edit posts to the API; latest write
wins). Other users see changes on manual refresh. Acceptable for four
low-traffic users; live sync and optimistic locking are explicitly deferred.

## 6. Non-functional requirements

- Runs within a Raspberry Pi's resources (mind SD-card space for GLB/photos).
- Bilingual UI (EL/EN) with a runtime toggle; Greek is the default data language.
- Responsive layout (desktop-first grids, horizontally scrollable on mobile).
- Simple backup story: `pg_dump` + the uploads folder.

## 7. Deployment

- `systemd` units for `uvicorn` (API) and `cloudflared` (tunnel); PostgreSQL as a
  system service.
- Static frontend served by FastAPI (or a lightweight static mount).
- One-time seed script loads the Greek sample data from the design's `store.js`.

## 8. Open items / future

- Optional: per-member cost contributions / splitting.
- Optional: live sync (WebSocket) if concurrent editing becomes painful.
- Optional: vendor entity if contractor management grows.
- Optional: automated Pi backups to external storage.

## 9. Decision log

All decisions were settled in a structured grill session on **2026-07-11**:

| # | Decision |
|---|----------|
| 1 | Host on Raspberry Pi, self-hosted, free. |
| 2 | PostgreSQL database. |
| 3 | Python + FastAPI backend; vanilla-JS frontend; separate front/back. |
| 4 | Auth: email+password, JWT httpOnly cookie, admin-seeded, no sign-up. |
| 5 | All 4 users are admin. |
| 6 | Adopt the full design as-is (all 6 screens, bilingual). |
| 7 | Budget per line item (planned vs actual), category + optional task tag; no phase↔cost link. |
| 8 | Unified cost/payment record (= `cost_items`); contractor is free text. |
| 9 | Uploads on Pi filesystem, path in DB, served via API. |
| 10 | Remote access via Cloudflare Tunnel (HTTPS, no port-forward). |
| 11 | Concurrency: last-write-wins + manual refresh. |
| 12 | Rebuild UI in real vanilla JS (drop Claude Design proprietary runtime). |
