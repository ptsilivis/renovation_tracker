# Cloudflare Tunnel setup

Gives the Pi a public HTTPS address without opening any router ports or exposing
your home IP. `cloudflared` dials out to Cloudflare and forwards traffic to the
local app on `http://localhost:8000`.

## Install

```bash
# Raspberry Pi OS (ARM64)
curl -L https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-arm64 -o cloudflared
sudo mv cloudflared /usr/local/bin/ && sudo chmod +x /usr/local/bin/cloudflared
```

## Option A — named tunnel on your own domain (recommended, stable URL)

Requires a domain on a Cloudflare account (the free plan is fine).

```bash
cloudflared tunnel login                     # opens browser, authorizes a domain
cloudflared tunnel create kampos             # creates tunnel + credentials json
```

Create `~/.cloudflared/config.yml`:

```yaml
tunnel: kampos
credentials-file: /home/pi/.cloudflared/<TUNNEL_ID>.json
ingress:
  - hostname: kampos.yourdomain.com
    service: http://localhost:8000
  - service: http_status:404
```

Point DNS + run as a service:

```bash
cloudflared tunnel route dns kampos kampos.yourdomain.com
sudo cloudflared service install
sudo systemctl enable --now cloudflared
```

Then the site lives at `https://kampos.yourdomain.com`. Set `COOKIE_SECURE=true`
in `backend/.env` (already advised in DEPLOY.md) so the session cookie is HTTPS-only.

## Option B — quick throwaway URL (no domain)

```bash
cloudflared tunnel --url http://localhost:8000
```

Prints a random `https://<something>.trycloudflare.com` URL. Good for testing;
the URL changes each run, so use Option A for the real family deployment.
