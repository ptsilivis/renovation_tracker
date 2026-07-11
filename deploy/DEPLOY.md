# Deploying Kampos Hub on a Raspberry Pi

Target: a Raspberry Pi (ARM64, Raspberry Pi OS / Debian) running PostgreSQL, the
FastAPI app under systemd, and a Cloudflare Tunnel for free HTTPS remote access.
The four family members reach it at your tunnel URL; no port-forwarding.

## 1. System packages

```bash
sudo apt update
sudo apt install -y python3-venv python3-dev postgresql build-essential
```

## 2. PostgreSQL

```bash
sudo -u postgres psql <<'SQL'
CREATE USER kampos WITH PASSWORD 'CHANGE_ME_STRONG';
CREATE DATABASE kampos OWNER kampos;
SQL
```

## 3. Get the code + Python env

```bash
cd /home/pi
git clone <your-repo-url> KamposHub      # or copy the folder over
cd KamposHub/backend
python3 -m venv .venv
./.venv/bin/pip install -r requirements.txt
```

## 4. Configure

```bash
cp .env.example .env
# Edit .env:
#   DATABASE_URL=postgresql+psycopg://kampos:CHANGE_ME_STRONG@localhost:5432/kampos
#   JWT_SECRET=$(python3 -c "import secrets;print(secrets.token_urlsafe(48))")
#   COOKIE_SECURE=true          # Cloudflare Tunnel serves HTTPS
#   UPLOAD_DIR=/home/pi/KamposHub/uploads
#   SEED_PASSWORD=<initial password for the 4 accounts>
```

## 5. Migrate + seed

```bash
cd /home/pi/KamposHub/backend
./.venv/bin/alembic upgrade head
./.venv/bin/python -m app.seed        # creates the 4 admin accounts + sample data
```

Edit the four account emails in `app/seed.py` before seeding (or update them in
the DB afterwards). Everyone logs in with `SEED_PASSWORD` — change it after first
login.

## 6. Run under systemd

```bash
sudo cp deploy/kampos-api.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now kampos-api
systemctl status kampos-api            # should be active (running) on 127.0.0.1:8000
curl -s localhost:8000/api/health      # {"ok":true}
```

The app serves both the API and the static frontend, so port 8000 is the whole site.

## 7. Cloudflare Tunnel (HTTPS)

See `cloudflared-README.md`. In short:

```bash
cloudflared tunnel login
cloudflared tunnel create kampos
# route kampos.<yourdomain> -> http://localhost:8000, then:
sudo cloudflared service install
```

Or, for a quick throwaway URL with no domain:

```bash
cloudflared tunnel --url http://localhost:8000
```

## 8. Backups

```bash
pg_dump -U kampos kampos > kampos-$(date +%F).sql   # database
tar czf uploads-$(date +%F).tgz uploads/            # uploaded files
```

## Updating

```bash
cd /home/pi/KamposHub && git pull
cd backend && ./.venv/bin/pip install -r requirements.txt
./.venv/bin/alembic upgrade head
sudo systemctl restart kampos-api
```
