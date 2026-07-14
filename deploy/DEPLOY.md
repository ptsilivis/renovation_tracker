# Deploying RenoHub on a Raspberry Pi

Target: a Raspberry Pi (ARM64, Raspberry Pi OS / Debian) running PostgreSQL, the
FastAPI app under systemd, and a **Cloudflare Tunnel** for free HTTPS remote access
gated by **Cloudflare Access**. Users reach it at a private hostname; no
port-forwarding, nothing exposed on your router.

> **Golden rule:** the Pi is a *clean deploy target*. Never edit tracked files on
> it — all host-specific values (emails, secrets, DB creds, paths) live in the
> gitignored `backend/.env`. That keeps `git pull` conflict-free forever.

## 1. System packages

```bash
sudo apt update
sudo apt install -y python3-venv python3-dev postgresql build-essential git
```

## 2. PostgreSQL

```bash
sudo -u postgres psql <<'SQL'
CREATE USER renovation WITH PASSWORD 'CHANGE_ME_STRONG';
CREATE DATABASE renovation OWNER renovation;
SQL
```

## 3. Get the code + Python env

```bash
cd ~
git clone https://github.com/<you>/renovation_tracker.git
cd renovation_tracker/backend
python3 -m venv .venv
./.venv/bin/pip install -r requirements.txt
```

## 4. Configure (`backend/.env`)

```bash
cp .env.example .env
nano .env
```
Set:
```
DATABASE_URL=postgresql+psycopg://renovation:CHANGE_ME_STRONG@localhost:5432/renovation
JWT_SECRET=<python3 -c "import secrets;print(secrets.token_urlsafe(48))">
COOKIE_SECURE=true                 # Cloudflare Tunnel serves HTTPS
UPLOAD_DIR=/home/<you>/renovation_tracker/uploads
SEED_PASSWORD=<initial login password for all accounts>
# Real accounts go HERE, not in seed.py (this file is gitignored):
SEED_USERS=alice@example.com:Alice, bob@example.com:Bob
```

## 5. Migrate + seed

```bash
./.venv/bin/alembic upgrade head
./.venv/bin/python -m app.seed        # sample "Kampos" project + accounts from SEED_USERS
```
Accounts are created from `SEED_USERS` (never overwriting existing ones). Every
seeded account starts on `SEED_PASSWORD` and is **forced to set its own password on
first login** — you never learn anyone else's password. To move an existing
single-database over instead of seeding, restore a `pg_dump` here.

## 6. Run under systemd

Edit `deploy/renovation-api.service` so `User=` and the paths match your account.
The base unit is a **template with host-specific paths**; the environment (e.g.
`RENOHUB_ENV=prod`) lives in a separate **drop-in** so it can be copied safely.
First-time install:
```bash
sudo cp deploy/renovation-api.service /etc/systemd/system/            # base unit (first time only)
sudo mkdir -p /etc/systemd/system/renovation-api.service.d
sudo cp deploy/renovation-api.service.d/10-env.conf \
        /etc/systemd/system/renovation-api.service.d/                 # RENOHUB_ENV=prod
sudo systemctl daemon-reload
sudo systemctl enable --now renovation-api
curl -s localhost:8000/api/health      # {"ok":true}
```

> **Do not `sudo cp deploy/renovation-api.service` on later deploys.** It ships
> placeholder `User=pi` / `/home/pi/...` paths and will overwrite your host's real
> `User`/paths → the service crash-loops with `status=217/USER`. `deploy/update.sh`
> never touches the unit. To change env vars, edit the drop-in and re-copy only
> `10-env.conf` (it carries no host paths).

The app serves both the API and the static frontend, so port 8000 is the whole site
(bound to 127.0.0.1 — only the tunnel reaches it).

## 7. Cloudflare Tunnel + Access

See `cloudflared-README.md` for detail. Summary:
1. **Zero Trust dashboard → Networks → Tunnels → Create tunnel** (Cloudflared
   connector). Run the printed `sudo cloudflared service install <token>` on the Pi
   — it installs cloudflared as an always-on service.
2. **Published application routes**: add `renohub.<yourdomain>` → `HTTP localhost:8000`.
3. **Access → Applications → Add → Public DNS**: name it, session ~1 month, then a
   policy **Allow → Include → Emails** with your users' addresses, login method
   **One-time PIN** (or Google for one-tap + biometric). This is what makes the
   hostname private — only those emails get past the gate.
4. Optional edge hardening (free): **Bot Fight Mode** on, plus a **rate-limiting
   rule** scoped to the hostname.

Quick throwaway URL for testing without a domain (public, no Access):
`cloudflared tunnel --url http://localhost:8000`.

## 8. Backups (do this)

`deploy/backup.sh` dumps the DB (gzip) + archives `UPLOAD_DIR`, keeping the last 14
days (`RENOHUB_BACKUP_RETENTION`). Schedule it and pull copies **off the Pi** so an
SD-card failure can't lose everything:
```bash
mkdir -p ~/backups
crontab -e
# nightly at 03:00:
0 3 * * * cd ~/renovation_tracker && ./deploy/backup.sh >> ~/backups/backup.log 2>&1
```
From another machine, periodically `rsync -avz <pi>:backups/ ~/renohub-backups/`.
Restore with `gunzip -c db_DATE.sql.gz | psql -U renovation -d renovation -h localhost`
and untar the uploads archive back into place.

## 9. Harden SSH (recommended)

Set up key auth (`ssh-copy-id <pi>` from your workstation, verify it works), then
disable passwords via a drop-in read first so it wins over cloud-init defaults:
```bash
printf 'PasswordAuthentication no\nKbdInteractiveAuthentication no\n' | \
  sudo tee /etc/ssh/sshd_config.d/00-hardening.conf
sudo sshd -t && sudo systemctl restart ssh
sudo sshd -T | grep -iE 'passwordauthentication|kbdinteractive'   # both should be "no"
```
Verify key login still works **before** closing your session. Consider `fail2ban`.

## Updating

One command — pull, migrate, restart, health-check:
```bash
cd ~/renovation_tracker && ./deploy/update.sh
```
