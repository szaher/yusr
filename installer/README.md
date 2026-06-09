# Yusr Installer

Official installation package for Yusr — Quran memorization and academy management platform.

## Quick Start

```bash
chmod +x install.sh
./install.sh
```

## What's Included

- **install.sh** — Interactive installation wizard
- **uninstall.sh** — Uninstallation script (stop / remove / wipe)
- **INSTALLATION.md** — Complete installation, upgrade, and operations guide

**Generated during installation:**

- `docker-compose.prod.yml` — Production Docker Compose configuration
- `yusr.nginx.conf` — Nginx reverse-proxy site config (host-level)
- `.env` — Environment variables
- `backup.sh` — Database backup script

## Installation Methods

### Method 1: Interactive Installation (Recommended)

```bash
git clone https://github.com/szaher/yusr.git
cd yusr/installer
chmod +x install.sh
./install.sh
```

Guides you through:
- System requirements check
- Domain, database, and security configuration
- SSL certificate setup (via host Certbot)
- Docker container startup
- Nginx reverse-proxy configuration
- Systemd service for auto-start

**Time:** 5–10 minutes

### Method 2: Manual Installation

Follow the step-by-step instructions in [INSTALLATION.md](INSTALLATION.md#manual-installation).

**Time:** 15–30 minutes

## Requirements

### System Requirements

| Component | Minimum     | Recommended   |
|-----------|-------------|---------------|
| CPU       | 1 core      | 2+ cores      |
| RAM       | 1 GB        | 2+ GB         |
| Storage   | 5 GB        | 20+ GB SSD    |
| Network   | 100 Mbps    | —             |

### Software Requirements

- Docker 20.10+
- Docker Compose v2+
- Nginx (on host, for reverse proxy)
- openssl
- Certbot (for SSL — optional)

### Network Requirements

- Domain or subdomain with DNS A record pointing to the server
- Port 80 and 443 accessible (via host Nginx)
- Port 22 for SSH

## Pre-Installation Checklist

- [ ] Server meets minimum requirements
- [ ] Docker and Docker Compose installed
- [ ] Nginx installed on the host
- [ ] Domain/subdomain DNS configured
- [ ] DNS propagated (verify: `dig yourdomain.com +short`)
- [ ] Firewall allows ports 80, 443, 22

## Post-Installation

### Verify

```bash
cd /opt/yusr
docker compose -f docker-compose.prod.yml ps
docker compose -f docker-compose.prod.yml logs -f app
curl -s http://localhost:3000 | head -5
```

### Access

Visit `https://your-domain.com` and sign in.

### Set Up Backups

```bash
# Manual backup
/opt/yusr/backup.sh

# Schedule daily backup at 3 AM
crontab -e
# Add: 0 3 * * * /opt/yusr/backup.sh >> /var/log/yusr-backup.log 2>&1
```

## Upgrading

```bash
cd /opt/yusr
./backup.sh
docker compose -f docker-compose.prod.yml pull
docker compose -f docker-compose.prod.yml up -d
```

The app container automatically runs Prisma migrations and seeding on startup.

See [INSTALLATION.md — Upgrading](INSTALLATION.md#upgrading) for full details.

## Uninstallation

```bash
cd /path/to/yusr/installer   # or wherever uninstall.sh is
chmod +x uninstall.sh
./uninstall.sh
```

Options:
1. **Stop services** — preserve all data
2. **Remove containers** — preserve data volumes
3. **Complete removal** — delete everything (creates a final backup first)

## Support

- **GitHub:** https://github.com/szaher/yusr
- **Issues:** https://github.com/szaher/yusr/issues

## Security

### Reporting Security Issues

**Do not** open public issues for security vulnerabilities. Email them directly instead.

### Best Practices

- Use strong, unique passwords
- Enable HTTPS with a valid SSL certificate
- Keep Docker images and the host OS updated
- Restrict SSH access and use key-based auth
- Set up fail2ban
- Schedule regular backups and test restores
- Monitor logs and container health
