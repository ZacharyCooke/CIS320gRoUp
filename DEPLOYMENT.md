# Dev/Staging Deployment

A persistent, non-public instance of the app runs on a LAN machine
(`petrecovery-testlocation`) for exploring the full stack without needing
Docker locally. Not a production deployment — no autoscaling, no backups
beyond Postgres defaults, single instance.

## Topology

- **Postgres 18** (native, not Docker) — db `petrecovery`, role `petrecovery`
- **Redis** — native, bound to `127.0.0.1:6379`
- **Backend** — built with `tsc`, run under **PM2** as `petrecovery-api`
  (`pm2-zachcooke` systemd service enabled, survives reboot), listening on
  `127.0.0.1:3000` conceptually but bound `0.0.0.0:3000` (LAN/tailnet-scoped
  by firewall, see below)
- **Frontend** — built with `vite build`, static files served by **nginx**
  from `/var/www/pet-recovery-app`, reverse-proxying `/api/*` to the backend
  on `:3000`. The `pet-recovery-app` nginx site is the `default_server` on
  port 80, so it answers on any Host header (bare IP, Tailscale hostname,
  etc.) — there is no other real site on this box.

## Access model

**Tailscale only.** The box is *not* reachable from the public internet.
`ufw` restricts ports 22/80/3000/5173 to `192.168.0.0/24` (LAN) plus the
`tailscale0` interface — no rule allows "Anywhere". Reach it via:

- Tailscale IP: `100.103.229.24` (device name `petrecovery-testlocation`)
- Or the LAN IP `192.168.0.167`, if on the same local network

Both this dev machine and the server are joined to the same tailnet
(account `cookiemonstar41@`). Any other device needs to be added to that
same Tailscale account to reach the app.

## Redeploying after a push

```bash
ssh zachcooke@192.168.0.167   # or ssh zachcooke@100.103.229.24 over Tailscale
cd ~/pet-recovery-app
git pull origin master

cd backend && npm install && npm run build && npm run migrate
pm2 reload petrecovery-api

cd ../frontend && npm install && npm run build
sudo rsync -a --delete dist/ /var/www/pet-recovery-app/
sudo chown -R www-data:www-data /var/www/pet-recovery-app
```

## Known gap

The `origin` remote in this checkout has a GitHub PAT embedded directly in
the HTTPS URL (`git remote -v`). That token should be rotated/revoked and
the remote switched to SSH or a credential helper — embedding a live token
in `.git/config` on a shared/always-on box is a standing exposure risk.
