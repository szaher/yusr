# Yusr Installation Guide

Complete guide for installing, upgrading, and operating Yusr on a shared VPS.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [DNS Configuration](#dns-configuration)
3. [Quick Installation](#quick-installation)
4. [Manual Installation](#manual-installation)
5. [Post-Installation](#post-installation)
6. [Configuration Reference](#configuration-reference)
7. [SSL/TLS Setup](#ssltls-setup)
8. [Upgrading](#upgrading)
9. [Fresh Install (Reset)](#fresh-install-reset)
10. [Backup and Recovery](#backup-and-recovery)
11. [Troubleshooting](#troubleshooting)
12. [Uninstallation](#uninstallation)
13. [Security Recommendations](#security-recommendations)

---

## Prerequisites

### Software Requirements

| Software        | Version | Notes                              |
|-----------------|---------|------------------------------------|
| Docker          | 20.10+  | Container runtime                  |
| Docker Compose  | v2+     | Container orchestration            |
| Nginx           | any     | Host-level reverse proxy           |
| openssl         | any     | Secret generation                  |
| Certbot         | any     | SSL certificates (optional)        |

### System Requirements

| Component | Minimum | Recommended |
|-----------|---------|-------------|
| OS        | Ubuntu 20.04+ / Debian 11+ | Ubuntu 22.04 LTS |
| CPU       | 1 core  | 2+ cores    |
| RAM       | 1 GB    | 2+ GB       |
| Storage   | 5 GB    | 20+ GB SSD  |

### Port Requirements

Yusr itself only binds to `127.0.0.1:<port>` (not exposed externally). The host's Nginx handles external traffic:

- **80/TCP** — HTTP (redirect to HTTPS / ACME challenge)
- **443/TCP** — HTTPS
- **22/TCP** — SSH (server management)

---

## DNS Configuration

Before installing, point your domain to the server:

1. Log in to your DNS provider
2. Create an **A Record**:
   ```
   Type:  A
   Name:  yusr            (or your preferred subdomain)
   Value: <server-ip>
   TTL:   3600
   ```
3. Wait for propagation (usually 5–30 minutes)

**Verify:**
```bash
dig yusr.example.com +short
# Should return your server IP
```

---

## Quick Installation

### 1. Install Docker (if not already installed)

```bash
# Ubuntu / Debian
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
# Log out and back in for the group change to take effect
```

### 2. Install Nginx and Certbot (if not already installed)

```bash
sudo apt update
sudo apt install -y nginx certbot python3-certbot-nginx
```

### 3. Download and Run Installer

```bash
git clone https://github.com/szaher/yusr.git
cd yusr/installer
chmod +x install.sh
./install.sh
```

### 4. Follow the Prompts

The wizard asks for:

| Prompt | Default | Notes |
|--------|---------|-------|
| Domain | — | e.g. `yusr.example.com` |
| Install directory | `/opt/yusr` | Where config and compose file live |
| App port | `3000` | Localhost only; Nginx proxies to it |
| Database name | `yusr` | PostgreSQL database |
| Database user | `yusr` | PostgreSQL user |
| Database password | auto-generated | Stored in `.env` |
| VAPID keys | skip | For push notifications; can add later |
| Enable SSL | yes | Uses host Certbot + Nginx |
| Let's Encrypt email | — | For certificate expiry notices |

### 5. Access the Application

After installation (5–10 minutes):

1. Visit `https://your-domain.com`
2. Sign in with the default seed credentials
3. Change your password immediately

---

## Manual Installation

If you prefer to set things up yourself, or the wizard doesn't fit your environment:

### Step 1: Create Installation Directory

```bash
sudo mkdir -p /opt/yusr
sudo chown -R $USER:$USER /opt/yusr
cd /opt/yusr
```

### Step 2: Create Environment File

```bash
cat > .env << 'EOF'
DATABASE_URL=postgresql://yusr:<DB_PASSWORD>@db:5432/yusr
AUTH_SECRET=<generate-with-openssl-rand-base64-32>
AUTH_URL=https://your-domain.com
AUTH_TRUST_HOST=true

# Push notifications (optional — generate with: npx web-push generate-vapid-keys)
VAPID_PUBLIC_KEY=
VAPID_PRIVATE_KEY=
VAPID_SUBJECT=mailto:admin@your-domain.com
EOF

chmod 600 .env
```

Generate secrets:
```bash
# Auth secret
openssl rand -base64 32

# Database password
openssl rand -base64 32 | tr -dc 'a-zA-Z0-9' | head -c 24
```

### Step 3: Create Docker Compose File

```yaml
# docker-compose.prod.yml
services:
  db:
    image: postgres:16-alpine
    container_name: yusr-db
    restart: unless-stopped
    environment:
      POSTGRES_USER: yusr
      POSTGRES_PASSWORD: <DB_PASSWORD>
      POSTGRES_DB: yusr
    volumes:
      - pgdata:/var/lib/postgresql/data
    networks:
      - yusr-network
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U yusr"]
      interval: 10s
      timeout: 5s
      retries: 5

  app:
    image: ghcr.io/szaher/yusr:latest
    container_name: yusr-app
    restart: unless-stopped
    env_file: .env
    ports:
      - "127.0.0.1:3000:3000"
    depends_on:
      db:
        condition: service_healthy
    networks:
      - yusr-network

volumes:
  pgdata:

networks:
  yusr-network:
    driver: bridge
```

### Step 4: Start Services

```bash
cd /opt/yusr
docker compose -f docker-compose.prod.yml pull
docker compose -f docker-compose.prod.yml up -d
```

The app container automatically:
1. Waits for the database to be ready
2. Runs `prisma db push` (schema migrations)
3. Runs `prisma db seed` (initial data)
4. Starts the Next.js server

### Step 5: Configure Nginx

Create `/etc/nginx/sites-available/yusr`:

```nginx
server {
    listen 80;
    listen [::]:80;
    server_name your-domain.com;

    client_max_body_size 10M;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    location /_next/static {
        proxy_pass http://127.0.0.1:3000;
        add_header Cache-Control "public, max-age=31536000, immutable";
    }
}
```

Enable and reload:
```bash
sudo ln -sf /etc/nginx/sites-available/yusr /etc/nginx/sites-enabled/yusr
sudo nginx -t && sudo systemctl reload nginx
```

### Step 6: Enable SSL

```bash
sudo certbot --nginx -d your-domain.com --agree-tos -m you@example.com --redirect
```

### Step 7: Create Systemd Service (optional)

```bash
sudo tee /etc/systemd/system/yusr.service > /dev/null << EOF
[Unit]
Description=Yusr Academy Platform
Requires=docker.service
After=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=/opt/yusr
ExecStart=/usr/bin/docker compose -f docker-compose.prod.yml up -d
ExecStop=/usr/bin/docker compose -f docker-compose.prod.yml down
User=$USER

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable yusr.service
```

---

## Post-Installation

### Verify Services

```bash
cd /opt/yusr

# All containers running?
docker compose -f docker-compose.prod.yml ps

# App logs (watch for errors)
docker compose -f docker-compose.prod.yml logs -f app

# Database healthy?
docker compose -f docker-compose.prod.yml exec db pg_isready -U yusr

# HTTP responding?
curl -sI https://your-domain.com | head -5
```

### Generate VAPID Keys (if skipped during install)

```bash
npx web-push generate-vapid-keys
```

Add the output to `/opt/yusr/.env`:
```env
VAPID_PUBLIC_KEY=BFx...
VAPID_PRIVATE_KEY=abc...
```

Then restart the app:
```bash
docker compose -f docker-compose.prod.yml restart app
```

---

## Configuration Reference

### Environment Variables

All variables live in `/opt/yusr/.env`:

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | yes | PostgreSQL connection string |
| `AUTH_SECRET` | yes | NextAuth session encryption key |
| `AUTH_URL` | yes | Public URL of the app (e.g. `https://yusr.example.com`) |
| `AUTH_TRUST_HOST` | yes | Set to `true` behind a reverse proxy |
| `VAPID_PUBLIC_KEY` | no | Web Push public key |
| `VAPID_PRIVATE_KEY` | no | Web Push private key |
| `VAPID_SUBJECT` | no | Web Push contact (`mailto:...`) |

### Docker Compose Services

| Service | Image | Purpose |
|---------|-------|---------|
| `db` | `postgres:16-alpine` | PostgreSQL database |
| `app` | `ghcr.io/szaher/yusr:latest` | Next.js application (includes Prisma migrations) |

### Nginx

The generated site config (`yusr.nginx.conf`) includes:
- Reverse proxy to `127.0.0.1:<port>`
- Rate limiting on auth endpoints (5 req/min)
- General rate limiting (10 req/s)
- Long-lived cache headers for `/_next/static`
- Security headers (HSTS, X-Frame-Options, etc.)
- SSL/TLS with modern cipher configuration

---

## SSL/TLS Setup

### Automatic (via install script)

If you chose SSL during installation, Certbot was already configured. Certificates auto-renew via the systemd timer that Certbot installs.

**Check renewal timer:**
```bash
sudo systemctl list-timers | grep certbot
```

**Manual renewal:**
```bash
sudo certbot renew
sudo systemctl reload nginx
```

### Custom Certificates

If you have your own certificate files:

1. Place them somewhere Nginx can read (e.g. `/etc/ssl/yusr/`)
2. Update `/etc/nginx/sites-available/yusr`:
   ```nginx
   ssl_certificate     /etc/ssl/yusr/fullchain.pem;
   ssl_certificate_key /etc/ssl/yusr/privkey.pem;
   ```
3. Reload: `sudo nginx -t && sudo systemctl reload nginx`

---

## Upgrading

Yusr publishes pre-built images to `ghcr.io/szaher/yusr`. Upgrading pulls the latest image and restarts. The entrypoint handles database migrations automatically.

### Standard Upgrade

```bash
cd /opt/yusr

# 1. Backup first
./backup.sh

# 2. Pull new image
docker compose -f docker-compose.prod.yml pull

# 3. Restart with new image
docker compose -f docker-compose.prod.yml up -d

# 4. Verify
docker compose -f docker-compose.prod.yml logs -f app
```

**Downtime:** ~10–30 seconds while the container restarts and runs migrations.

### Upgrade to a Specific Version

If a version tag is published:

```bash
# Edit docker-compose.prod.yml — change:
#   image: ghcr.io/szaher/yusr:latest
# to:
#   image: ghcr.io/szaher/yusr:v1.2.3

docker compose -f docker-compose.prod.yml pull
docker compose -f docker-compose.prod.yml up -d
```

### Rollback

If the new version has issues:

```bash
cd /opt/yusr

# Stop the broken version
docker compose -f docker-compose.prod.yml down

# Restore database from backup
gunzip < /var/backups/yusr/db_YYYYMMDD_HHMMSS.sql.gz | \
  docker compose -f docker-compose.prod.yml exec -T db \
  psql -U yusr -d yusr

# Pin to the previous image tag in docker-compose.prod.yml, then:
docker compose -f docker-compose.prod.yml pull
docker compose -f docker-compose.prod.yml up -d
```

---

## Fresh Install (Reset)

To wipe everything and start from scratch while keeping the same configuration:

### Option A: Reset Database Only

```bash
cd /opt/yusr

# Backup first
./backup.sh

# Stop services
docker compose -f docker-compose.prod.yml down

# Remove the database volume
docker volume rm $(docker volume ls -q | grep yusr.*pgdata)

# Start fresh — entrypoint re-creates schema and seeds
docker compose -f docker-compose.prod.yml up -d
```

### Option B: Full Fresh Install

```bash
cd /opt/yusr

# Backup
./backup.sh

# Tear down everything including volumes
docker compose -f docker-compose.prod.yml down -v

# Pull latest image (in case it was updated)
docker compose -f docker-compose.prod.yml pull

# Start clean
docker compose -f docker-compose.prod.yml up -d
```

### Option C: Reinstall from Scratch

```bash
# Run the uninstaller (option 3 for complete removal)
cd /path/to/yusr/installer
./uninstall.sh

# Then run the installer again
./install.sh
```

---

## Backup and Recovery

### Automated Backup Script

Created during installation at `/opt/yusr/backup.sh`.

**What it backs up:**
- PostgreSQL database dump (online, no downtime)
- Environment file (`.env`)

**Where backups are stored:** `/var/backups/yusr/`

**Retention:** 7 days (configurable in the script)

### Manual Backup

```bash
/opt/yusr/backup.sh
```

### Schedule Automatic Backups

```bash
crontab -e

# Daily at 3 AM
0 3 * * * /opt/yusr/backup.sh >> /var/log/yusr-backup.log 2>&1
```

### Restore from Backup

1. **List available backups:**
   ```bash
   ls -lh /var/backups/yusr/
   ```

2. **Extract the backup:**
   ```bash
   cd /var/backups/yusr
   tar xzf yusr_backup_YYYYMMDD_HHMMSS.tar.gz
   ```

3. **Stop the app (keep database running):**
   ```bash
   cd /opt/yusr
   docker compose -f docker-compose.prod.yml stop app
   ```

4. **Restore the database:**
   ```bash
   # Drop and recreate the database
   docker compose -f docker-compose.prod.yml exec -T db \
     psql -U yusr -d postgres -c "DROP DATABASE IF EXISTS yusr;"
   docker compose -f docker-compose.prod.yml exec -T db \
     psql -U yusr -d postgres -c "CREATE DATABASE yusr OWNER yusr;"

   # Restore the dump
   gunzip < /var/backups/yusr/db_YYYYMMDD_HHMMSS.sql.gz | \
     docker compose -f docker-compose.prod.yml exec -T db \
     psql -U yusr -d yusr
   ```

5. **Restore environment file (if needed):**
   ```bash
   cp /var/backups/yusr/.env_YYYYMMDD_HHMMSS /opt/yusr/.env
   ```

6. **Start the app:**
   ```bash
   docker compose -f docker-compose.prod.yml up -d
   ```

### Off-Site Backups

```bash
# rsync to remote server
rsync -avz /var/backups/yusr/ user@backup-server:/backups/yusr/

# AWS S3
aws s3 sync /var/backups/yusr/ s3://your-bucket/yusr-backups/

# rclone (supports many cloud providers)
rclone sync /var/backups/yusr/ remote:yusr-backups/
```

---

## Troubleshooting

### Services Won't Start

```bash
# Check Docker daemon
sudo systemctl status docker

# Check container status
docker compose -f docker-compose.prod.yml ps

# Check logs
docker compose -f docker-compose.prod.yml logs
```

### Database Connection Errors

```bash
# Is the database container running?
docker compose -f docker-compose.prod.yml ps db

# Check database logs
docker compose -f docker-compose.prod.yml logs db

# Test connection
docker compose -f docker-compose.prod.yml exec db \
  psql -U yusr -d yusr -c "SELECT 1;"
```

### App Container Keeps Restarting

```bash
# Check entrypoint logs (migration errors, connection issues)
docker compose -f docker-compose.prod.yml logs --tail=50 app
```

Common causes:
- Database not ready yet (wait a few seconds)
- Invalid `DATABASE_URL` in `.env`
- Prisma schema drift (app uses `db push` which forces the schema)

### Can't Access the Application

```bash
# Is the app listening?
curl -sI http://127.0.0.1:3000 | head -3

# Check Nginx config
sudo nginx -t

# Check Nginx error log
sudo tail -20 /var/log/nginx/error.log

# Check firewall
sudo ufw status
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
```

### SSL Certificate Issues

```bash
# Check certificate status
sudo certbot certificates

# Test renewal
sudo certbot renew --dry-run

# Force renewal
sudo certbot renew --force-renewal
sudo systemctl reload nginx
```

### Performance Issues

```bash
# Container resource usage
docker stats

# Disk space
df -h
docker system df

# Clean unused Docker resources
docker system prune
```

### Database Operations

```bash
# Connect to database shell
docker compose -f docker-compose.prod.yml exec db \
  psql -U yusr -d yusr

# Run a query
docker compose -f docker-compose.prod.yml exec -T db \
  psql -U yusr -d yusr -c "SELECT COUNT(*) FROM \"User\";"

# Check database size
docker compose -f docker-compose.prod.yml exec -T db \
  psql -U yusr -d yusr -c "SELECT pg_size_pretty(pg_database_size('yusr'));"
```

---

## Uninstallation

### Using the Script

```bash
chmod +x uninstall.sh
./uninstall.sh
```

**Option 1 — Stop services only:**
Containers stop. Data volumes, configs, and Nginx config remain. Restart anytime with `docker compose up -d`.

**Option 2 — Remove containers:**
Containers and networks are removed. Data volumes remain on disk. Re-run `docker compose up -d` to recreate.

**Option 3 — Complete removal:**
Creates a final backup, then removes containers, volumes, images, systemd service, Nginx config, and the installation directory.

### Manual Removal

```bash
cd /opt/yusr

# Stop and remove containers + volumes
docker compose -f docker-compose.prod.yml down -v

# Remove images
docker images | grep yusr | awk '{print $3}' | xargs -r docker rmi -f

# Remove systemd service
sudo systemctl stop yusr 2>/dev/null
sudo systemctl disable yusr 2>/dev/null
sudo rm -f /etc/systemd/system/yusr.service
sudo systemctl daemon-reload

# Remove Nginx config
sudo rm -f /etc/nginx/sites-enabled/yusr /etc/nginx/sites-available/yusr
sudo nginx -t && sudo systemctl reload nginx

# Remove installation directory
sudo rm -rf /opt/yusr

# Remove backups (optional)
sudo rm -rf /var/backups/yusr
```

---

## Security Recommendations

### System Security

```bash
# Keep system updated
sudo apt update && sudo apt upgrade -y

# Configure firewall
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable

# Disable root SSH login
sudo sed -i 's/^#*PermitRootLogin.*/PermitRootLogin no/' /etc/ssh/sshd_config
sudo systemctl restart ssh

# Install fail2ban
sudo apt install -y fail2ban
sudo systemctl enable --now fail2ban
```

### Application Security

- Use strong `AUTH_SECRET` (minimum 32 characters, randomly generated)
- Keep the database internal to Docker (no exposed ports)
- Enable HTTPS — never serve in production over plain HTTP
- The generated Nginx config includes rate limiting and security headers
- Regularly update the Docker image (`docker compose pull`)
- Review logs for unusual activity

### Monitoring Checklist

- [ ] Container health (`docker ps`)
- [ ] Disk space (`df -h`)
- [ ] Database size growth
- [ ] SSL certificate expiry (`sudo certbot certificates`)
- [ ] Backup success (`/var/log/yusr-backup.log`)
- [ ] Nginx error log (`/var/log/nginx/error.log`)

### Recommended Tools

- **Uptime Kuma** — lightweight uptime monitoring
- **Netdata** — real-time server metrics
- **Logrotate** — manage log file sizes

---

## Common Operations Cheat Sheet

| Task | Command |
|------|---------|
| Start | `docker compose -f docker-compose.prod.yml up -d` |
| Stop | `docker compose -f docker-compose.prod.yml stop` |
| Restart | `docker compose -f docker-compose.prod.yml restart` |
| Logs | `docker compose -f docker-compose.prod.yml logs -f app` |
| Upgrade | `docker compose -f docker-compose.prod.yml pull && docker compose -f docker-compose.prod.yml up -d` |
| Backup | `/opt/yusr/backup.sh` |
| DB shell | `docker compose -f docker-compose.prod.yml exec db psql -U yusr -d yusr` |
| Nginx reload | `sudo nginx -t && sudo systemctl reload nginx` |
| Renew SSL | `sudo certbot renew && sudo systemctl reload nginx` |
| Container stats | `docker stats` |
| Service status | `sudo systemctl status yusr` |

All `docker compose` commands should be run from the installation directory (default `/opt/yusr`).

---

**Last Updated:** June 2026
