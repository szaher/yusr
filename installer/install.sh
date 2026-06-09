#!/bin/bash

# Yusr Installation Script
# Interactive wizard for deploying Yusr on a shared VPS

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_header() {
    echo -e "\n${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}  $1${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"
}

print_success() { echo -e "${GREEN}✓${NC} $1"; }
print_error()   { echo -e "${RED}✗${NC} $1"; }
print_warning() { echo -e "${YELLOW}⚠${NC} $1"; }
print_info()    { echo -e "${BLUE}ℹ${NC} $1"; }

# ---------------------------------------------------------------------------
# Pre-flight checks
# ---------------------------------------------------------------------------

check_root() {
    if [[ $EUID -eq 0 ]]; then
        print_error "Do not run this script as root"
        print_info "Run as a regular user with sudo privileges"
        exit 1
    fi
}

check_requirements() {
    print_header "Checking System Requirements"

    local all_ok=true

    # Docker
    if command -v docker &> /dev/null; then
        DOCKER_VERSION=$(docker --version | cut -d' ' -f3 | cut -d',' -f1)
        print_success "Docker ${DOCKER_VERSION}"
    else
        print_error "Docker is not installed"
        print_info "Install: https://docs.docker.com/engine/install/"
        all_ok=false
    fi

    # Docker Compose
    if docker compose version &> /dev/null 2>&1; then
        COMPOSE_VERSION=$(docker compose version | awk '{print $NF}')
        print_success "Docker Compose ${COMPOSE_VERSION}"
    elif command -v docker-compose &> /dev/null; then
        COMPOSE_VERSION=$(docker-compose --version | awk '{print $NF}')
        print_success "Docker Compose ${COMPOSE_VERSION}"
    else
        print_error "Docker Compose is not installed"
        all_ok=false
    fi

    # docker group
    if groups | grep -q docker; then
        print_success "User is in docker group"
    else
        print_warning "User is not in docker group — you may need sudo for docker commands"
    fi

    # openssl (for secret generation)
    if command -v openssl &> /dev/null; then
        print_success "openssl available"
    else
        print_error "openssl is required for secret generation"
        all_ok=false
    fi

    # Disk space (minimum 5 GB for a smaller app)
    available_space=$(df -BG . | tail -1 | awk '{print $4}' | sed 's/G//')
    if [ "$available_space" -ge 5 ] 2>/dev/null; then
        print_success "Disk space: ${available_space}GB available"
    else
        print_warning "Low disk space (${available_space}GB). Recommended: 5GB+"
    fi

    # Memory (minimum 1 GB)
    if command -v free &> /dev/null; then
        total_mem=$(free -g | awk '/^Mem:/{print $2}')
        if [ "$total_mem" -ge 1 ] 2>/dev/null; then
            print_success "Memory: ${total_mem}GB"
        else
            print_warning "Low memory (${total_mem}GB). Recommended: 1GB+"
        fi
    fi

    if [ "$all_ok" = false ]; then
        print_error "Please install missing requirements before continuing"
        exit 1
    fi
    echo ""
}

# ---------------------------------------------------------------------------
# Gather configuration
# ---------------------------------------------------------------------------

gather_details() {
    print_header "Installation Configuration"

    # Domain
    read -p "Domain or subdomain (e.g. yusr.example.com): " DOMAIN
    while [[ -z "$DOMAIN" ]]; do
        print_error "Domain cannot be empty"
        read -p "Domain or subdomain: " DOMAIN
    done

    # Install directory
    DEFAULT_INSTALL_DIR="/opt/yusr"
    read -p "Installation directory [$DEFAULT_INSTALL_DIR]: " INSTALL_DIR
    INSTALL_DIR=${INSTALL_DIR:-$DEFAULT_INSTALL_DIR}

    # App port on localhost (for reverse proxy)
    read -p "App port on localhost [3000]: " APP_PORT
    APP_PORT=${APP_PORT:-3000}

    # ---- Database ----
    print_info "Database Configuration"
    read -p "Database name [yusr]: " DB_NAME
    DB_NAME=${DB_NAME:-yusr}

    read -p "Database user [yusr]: " DB_USER
    DB_USER=${DB_USER:-yusr}

    read -sp "Database password (empty to auto-generate): " DB_PASSWORD
    echo ""
    if [[ -z "$DB_PASSWORD" ]]; then
        DB_PASSWORD=$(openssl rand -base64 32 | tr -dc 'a-zA-Z0-9' | head -c 24)
        print_info "Generated database password"
    fi

    # ---- Auth secret ----
    print_info "Security Configuration"
    AUTH_SECRET=$(openssl rand -base64 32)
    print_info "Generated AUTH_SECRET"

    # ---- VAPID keys ----
    print_info "Push Notification Configuration"
    echo ""
    echo "VAPID keys are needed for Web Push notifications."
    echo "If you already have keys, enter them below. Otherwise leave blank to skip."
    echo "(You can generate them later with: npx web-push generate-vapid-keys)"
    echo ""
    read -p "VAPID public key (empty to skip): " VAPID_PUBLIC_KEY
    if [[ -n "$VAPID_PUBLIC_KEY" ]]; then
        read -p "VAPID private key: " VAPID_PRIVATE_KEY
    else
        VAPID_PRIVATE_KEY=""
    fi

    read -p "VAPID subject [mailto:admin@${DOMAIN}]: " VAPID_SUBJECT
    VAPID_SUBJECT=${VAPID_SUBJECT:-"mailto:admin@${DOMAIN}"}

    # ---- SSL ----
    print_info "SSL/TLS Configuration"
    echo ""
    echo "Since this is a shared VPS, SSL is typically handled by the host's"
    echo "Nginx and Certbot installation rather than inside Docker."
    echo ""
    read -p "Generate Nginx site config with SSL (Let's Encrypt)? (y/n) [y]: " ENABLE_SSL
    ENABLE_SSL=${ENABLE_SSL:-y}

    if [[ "$ENABLE_SSL" =~ ^[Yy]$ ]]; then
        USE_SSL=true
        read -p "Email for Let's Encrypt: " SSL_EMAIL
        while [[ ! "$SSL_EMAIL" =~ ^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$ ]]; do
            print_error "Invalid email format"
            read -p "Email for Let's Encrypt: " SSL_EMAIL
        done
    else
        USE_SSL=false
    fi

    echo ""
}

# ---------------------------------------------------------------------------
# Summary & confirmation
# ---------------------------------------------------------------------------

show_summary() {
    print_header "Installation Summary"

    echo -e "${BLUE}Domain:${NC}              ${DOMAIN}"
    echo -e "${BLUE}Install Directory:${NC}   ${INSTALL_DIR}"
    echo -e "${BLUE}App Port:${NC}            ${APP_PORT} (localhost only)"
    echo -e "${BLUE}Database:${NC}            ${DB_NAME} (user: ${DB_USER})"
    if [[ "$USE_SSL" = true ]]; then
        echo -e "${BLUE}SSL:${NC}                 Let's Encrypt (${SSL_EMAIL})"
    else
        echo -e "${BLUE}SSL:${NC}                 Disabled"
    fi
    if [[ -n "$VAPID_PUBLIC_KEY" ]]; then
        echo -e "${BLUE}Push Notifications:${NC} Configured"
    else
        echo -e "${BLUE}Push Notifications:${NC} Not configured (can add later)"
    fi

    echo ""
    read -p "Proceed with installation? (y/n): " CONFIRM
    if [[ ! "$CONFIRM" =~ ^[Yy]$ ]]; then
        print_warning "Installation cancelled"
        exit 0
    fi
}

# ---------------------------------------------------------------------------
# Create installation directory
# ---------------------------------------------------------------------------

create_install_dir() {
    print_header "Creating Installation Directory"

    if [[ -d "$INSTALL_DIR" ]]; then
        print_warning "Directory $INSTALL_DIR already exists"
        read -p "Remove existing installation? (y/n): " REMOVE_EXISTING
        if [[ "$REMOVE_EXISTING" =~ ^[Yy]$ ]]; then
            sudo rm -rf "$INSTALL_DIR"
            print_success "Removed existing installation"
        else
            print_error "Installation cancelled"
            exit 1
        fi
    fi

    sudo mkdir -p "$INSTALL_DIR"
    sudo chown -R "$USER":"$USER" "$INSTALL_DIR"
    print_success "Created $INSTALL_DIR"
}

# ---------------------------------------------------------------------------
# Generate .env
# ---------------------------------------------------------------------------

generate_env() {
    print_header "Generating Environment Configuration"

    cat > "$INSTALL_DIR/.env" << EOF
# Yusr Production Environment
# Generated on $(date)

# Database
DATABASE_URL=postgresql://${DB_USER}:${DB_PASSWORD}@db:5432/${DB_NAME}

# Authentication (NextAuth)
AUTH_SECRET=${AUTH_SECRET}
AUTH_URL=https://${DOMAIN}
AUTH_TRUST_HOST=true

# Push Notifications (VAPID)
VAPID_PUBLIC_KEY=${VAPID_PUBLIC_KEY}
VAPID_PRIVATE_KEY=${VAPID_PRIVATE_KEY}
VAPID_SUBJECT=${VAPID_SUBJECT}
EOF

    chmod 600 "$INSTALL_DIR/.env"
    print_success "Environment file generated"
}

# ---------------------------------------------------------------------------
# Generate docker-compose.prod.yml
# ---------------------------------------------------------------------------

generate_docker_compose() {
    print_header "Generating Docker Compose Configuration"

    cat > "$INSTALL_DIR/docker-compose.prod.yml" << EOF
services:
  db:
    image: postgres:16-alpine
    container_name: yusr-db
    restart: unless-stopped
    environment:
      POSTGRES_USER: ${DB_USER}
      POSTGRES_PASSWORD: ${DB_PASSWORD}
      POSTGRES_DB: ${DB_NAME}
    volumes:
      - pgdata:/var/lib/postgresql/data
    networks:
      - yusr-network
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${DB_USER}"]
      interval: 10s
      timeout: 5s
      retries: 5

  app:
    image: ghcr.io/szaher/yusr:latest
    container_name: yusr-app
    restart: unless-stopped
    env_file: .env
    ports:
      - "127.0.0.1:${APP_PORT}:3000"
    depends_on:
      db:
        condition: service_healthy
    networks:
      - yusr-network

volumes:
  pgdata:
    driver: local

networks:
  yusr-network:
    driver: bridge
EOF

    print_success "Docker Compose configuration generated"
}

# ---------------------------------------------------------------------------
# Generate Nginx site config (host-level, for shared VPS)
# ---------------------------------------------------------------------------

generate_nginx_config() {
    print_header "Generating Nginx Site Configuration"

    if [[ "$USE_SSL" = true ]]; then
        cat > "$INSTALL_DIR/yusr.nginx.conf" << EOF
# Yusr — Nginx reverse proxy (shared VPS)
# Copy to /etc/nginx/sites-available/yusr and symlink to sites-enabled

# Rate limiting zones
limit_req_zone \$binary_remote_addr zone=yusr_general:10m rate=10r/s;
limit_req_zone \$binary_remote_addr zone=yusr_auth:10m    rate=5r/m;

# Redirect HTTP → HTTPS
server {
    listen 80;
    listen [::]:80;
    server_name ${DOMAIN};

    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    location / {
        return 301 https://\$host\$request_uri;
    }
}

# HTTPS
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name ${DOMAIN};

    ssl_certificate     /etc/letsencrypt/live/${DOMAIN}/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/${DOMAIN}/privkey.pem;
    ssl_session_timeout 1d;
    ssl_session_cache   shared:YusrSSL:10m;
    ssl_session_tickets off;

    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers 'ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384';
    ssl_prefer_server_ciphers off;

    # Security headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options            "SAMEORIGIN"                         always;
    add_header X-Content-Type-Options     "nosniff"                            always;
    add_header Referrer-Policy            "strict-origin-when-cross-origin"    always;

    client_max_body_size 10M;

    # Auth endpoints — stricter rate limit
    location /api/auth/ {
        limit_req zone=yusr_auth burst=5 nodelay;

        proxy_pass http://127.0.0.1:${APP_PORT};
        proxy_http_version 1.1;
        proxy_set_header Host              \$host;
        proxy_set_header X-Real-IP         \$remote_addr;
        proxy_set_header X-Forwarded-For   \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

    # Next.js static assets — long cache
    location /_next/static {
        proxy_pass http://127.0.0.1:${APP_PORT};
        add_header Cache-Control "public, max-age=31536000, immutable";
    }

    # Everything else
    location / {
        limit_req zone=yusr_general burst=20 nodelay;

        proxy_pass http://127.0.0.1:${APP_PORT};
        proxy_http_version 1.1;
        proxy_set_header Upgrade           \$http_upgrade;
        proxy_set_header Connection        'upgrade';
        proxy_set_header Host              \$host;
        proxy_set_header X-Real-IP         \$remote_addr;
        proxy_set_header X-Forwarded-For   \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }
}
EOF
    else
        cat > "$INSTALL_DIR/yusr.nginx.conf" << EOF
# Yusr — Nginx reverse proxy (shared VPS, no SSL)
# Copy to /etc/nginx/sites-available/yusr and symlink to sites-enabled

limit_req_zone \$binary_remote_addr zone=yusr_general:10m rate=10r/s;
limit_req_zone \$binary_remote_addr zone=yusr_auth:10m    rate=5r/m;

server {
    listen 80;
    listen [::]:80;
    server_name ${DOMAIN};

    client_max_body_size 10M;

    # Security headers
    add_header X-Frame-Options        "SAMEORIGIN"                      always;
    add_header X-Content-Type-Options "nosniff"                         always;
    add_header Referrer-Policy        "strict-origin-when-cross-origin" always;

    location /api/auth/ {
        limit_req zone=yusr_auth burst=5 nodelay;

        proxy_pass http://127.0.0.1:${APP_PORT};
        proxy_http_version 1.1;
        proxy_set_header Host              \$host;
        proxy_set_header X-Real-IP         \$remote_addr;
        proxy_set_header X-Forwarded-For   \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

    location /_next/static {
        proxy_pass http://127.0.0.1:${APP_PORT};
        add_header Cache-Control "public, max-age=31536000, immutable";
    }

    location / {
        limit_req zone=yusr_general burst=20 nodelay;

        proxy_pass http://127.0.0.1:${APP_PORT};
        proxy_http_version 1.1;
        proxy_set_header Upgrade           \$http_upgrade;
        proxy_set_header Connection        'upgrade';
        proxy_set_header Host              \$host;
        proxy_set_header X-Real-IP         \$remote_addr;
        proxy_set_header X-Forwarded-For   \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }
}
EOF
    fi

    print_success "Nginx site configuration generated at $INSTALL_DIR/yusr.nginx.conf"
}

# ---------------------------------------------------------------------------
# Install Nginx config & obtain SSL certificate
# ---------------------------------------------------------------------------

setup_nginx() {
    print_header "Setting Up Nginx"

    # Check if nginx is installed on the host
    if ! command -v nginx &> /dev/null; then
        print_warning "Nginx is not installed on this host"
        print_info "Install it with: sudo apt install nginx"
        print_info "Then copy $INSTALL_DIR/yusr.nginx.conf to /etc/nginx/sites-available/yusr"
        return
    fi

    # Copy and enable site
    sudo cp "$INSTALL_DIR/yusr.nginx.conf" /etc/nginx/sites-available/yusr
    sudo ln -sf /etc/nginx/sites-available/yusr /etc/nginx/sites-enabled/yusr

    # Test config
    if sudo nginx -t 2>/dev/null; then
        print_success "Nginx configuration is valid"
    else
        print_error "Nginx configuration test failed"
        print_info "Fix the config and run: sudo nginx -t && sudo systemctl reload nginx"
        return
    fi

    if [[ "$USE_SSL" = true ]]; then
        print_info "Obtaining SSL certificate..."

        # Install certbot if not present
        if ! command -v certbot &> /dev/null; then
            print_info "Installing certbot..."
            sudo apt-get update -qq && sudo apt-get install -y -qq certbot python3-certbot-nginx
        fi

        # Reload nginx first (with HTTP-only config for ACME challenge)
        sudo systemctl reload nginx

        # Obtain certificate
        sudo certbot --nginx -d "$DOMAIN" --non-interactive --agree-tos -m "$SSL_EMAIL" --redirect

        if [ $? -eq 0 ]; then
            print_success "SSL certificate obtained and configured"
        else
            print_error "Failed to obtain SSL certificate"
            print_info "You can retry later: sudo certbot --nginx -d ${DOMAIN}"
        fi
    else
        sudo systemctl reload nginx
        print_success "Nginx reloaded"
    fi
}

# ---------------------------------------------------------------------------
# Pull images and start services
# ---------------------------------------------------------------------------

start_services() {
    print_header "Starting Services"

    cd "$INSTALL_DIR"

    print_info "Pulling Docker images..."
    docker compose -f docker-compose.prod.yml pull

    print_info "Starting containers..."
    docker compose -f docker-compose.prod.yml up -d

    if [ $? -ne 0 ]; then
        print_error "Failed to start services"
        exit 1
    fi

    # Wait for health checks
    print_info "Waiting for services to become healthy..."
    local retries=30
    while [ $retries -gt 0 ]; do
        if docker ps --filter "name=yusr-app" --filter "status=running" --format '{{.Names}}' | grep -q yusr-app; then
            break
        fi
        sleep 2
        retries=$((retries - 1))
    done

    if docker ps | grep -q yusr-app && docker ps | grep -q yusr-db; then
        print_success "All services are running"
    else
        print_error "Some services failed to start"
        docker compose -f docker-compose.prod.yml ps
        docker compose -f docker-compose.prod.yml logs --tail=30
        exit 1
    fi
}

# ---------------------------------------------------------------------------
# Systemd service (auto-start on reboot)
# ---------------------------------------------------------------------------

create_systemd_service() {
    print_header "Systemd Service"

    read -p "Create systemd service for auto-start on reboot? (y/n) [y]: " CREATE_SERVICE
    CREATE_SERVICE=${CREATE_SERVICE:-y}

    if [[ ! "$CREATE_SERVICE" =~ ^[Yy]$ ]]; then
        return
    fi

    sudo tee /etc/systemd/system/yusr.service > /dev/null << EOF
[Unit]
Description=Yusr Academy Platform
Requires=docker.service
After=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=${INSTALL_DIR}
ExecStart=/usr/bin/docker compose -f docker-compose.prod.yml up -d
ExecStop=/usr/bin/docker compose -f docker-compose.prod.yml down
User=${USER}

[Install]
WantedBy=multi-user.target
EOF

    sudo systemctl daemon-reload
    sudo systemctl enable yusr.service
    print_success "Systemd service created and enabled"
    print_info "Manage with: sudo systemctl {start|stop|restart|status} yusr"
}

# ---------------------------------------------------------------------------
# Backup script
# ---------------------------------------------------------------------------

generate_backup_script() {
    print_header "Generating Backup Script"

    cat > "$INSTALL_DIR/backup.sh" << 'BACKUPEOF'
#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKUP_DIR="/var/backups/yusr"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p "$BACKUP_DIR"

cd "$SCRIPT_DIR"

# Database dump (while running — no downtime)
echo "Dumping database..."
docker compose -f docker-compose.prod.yml exec -T db \
    pg_dump -U "${POSTGRES_USER:-yusr}" "${POSTGRES_DB:-yusr}" \
    | gzip > "$BACKUP_DIR/db_${DATE}.sql.gz"

# Environment file
cp .env "$BACKUP_DIR/.env_${DATE}"

# Combined archive
tar czf "$BACKUP_DIR/yusr_backup_${DATE}.tar.gz" \
    -C "$BACKUP_DIR" "db_${DATE}.sql.gz" ".env_${DATE}"

rm -f "$BACKUP_DIR/db_${DATE}.sql.gz" "$BACKUP_DIR/.env_${DATE}"

echo "Backup completed: $BACKUP_DIR/yusr_backup_${DATE}.tar.gz"

# Keep only last 7 days
find "$BACKUP_DIR" -name "yusr_backup_*.tar.gz" -mtime +7 -delete
BACKUPEOF

    chmod +x "$INSTALL_DIR/backup.sh"
    print_success "Backup script created at $INSTALL_DIR/backup.sh"
}

# ---------------------------------------------------------------------------
# Completion
# ---------------------------------------------------------------------------

show_completion() {
    print_header "Installation Complete!"

    echo -e "${GREEN}"
    echo "╔══════════════════════════════════════════════════════════╗"
    echo "║                                                          ║"
    echo "║              Yusr Successfully Installed!                ║"
    echo "║                                                          ║"
    echo "╚══════════════════════════════════════════════════════════╝"
    echo -e "${NC}"

    echo ""
    echo -e "${BLUE}Access:${NC}"
    if [[ "$USE_SSL" = true ]]; then
        echo -e "  URL: ${GREEN}https://${DOMAIN}${NC}"
    else
        echo -e "  URL: ${GREEN}http://${DOMAIN}${NC}"
    fi
    echo ""

    echo -e "${BLUE}Installation Directory:${NC} ${INSTALL_DIR}"
    echo ""

    echo -e "${BLUE}Useful Commands:${NC}"
    echo -e "  View logs:       ${YELLOW}cd ${INSTALL_DIR} && docker compose -f docker-compose.prod.yml logs -f${NC}"
    echo -e "  Stop services:   ${YELLOW}cd ${INSTALL_DIR} && docker compose -f docker-compose.prod.yml stop${NC}"
    echo -e "  Start services:  ${YELLOW}cd ${INSTALL_DIR} && docker compose -f docker-compose.prod.yml start${NC}"
    echo -e "  Restart:         ${YELLOW}cd ${INSTALL_DIR} && docker compose -f docker-compose.prod.yml restart${NC}"
    echo -e "  Update image:    ${YELLOW}cd ${INSTALL_DIR} && docker compose -f docker-compose.prod.yml pull && docker compose -f docker-compose.prod.yml up -d${NC}"
    echo -e "  Run backup:      ${YELLOW}${INSTALL_DIR}/backup.sh${NC}"
    echo ""

    echo -e "${BLUE}Next Steps:${NC}"
    echo "  1. Visit your application and sign in"
    echo "  2. Set up a cron job for automatic backups:"
    echo "     0 3 * * * ${INSTALL_DIR}/backup.sh >> /var/log/yusr-backup.log 2>&1"
    if [[ -z "$VAPID_PUBLIC_KEY" ]]; then
        echo "  3. Generate VAPID keys for push notifications:"
        echo "     npx web-push generate-vapid-keys"
        echo "     Then add VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY to ${INSTALL_DIR}/.env"
    fi
    echo ""

    print_warning "IMPORTANT: Save these credentials in a secure location!"
    echo -e "  Database Password: ${YELLOW}${DB_PASSWORD}${NC}"
    echo -e "  AUTH_SECRET:       ${YELLOW}${AUTH_SECRET:0:20}...${NC}"
    echo ""
    echo -e "${GREEN}Thank you for installing Yusr!${NC}"
    echo ""
}

# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

main() {
    clear

    echo -e "${BLUE}"
    cat << "EOF"
╔═══════════════════════════════════════════════════════════════════╗
║                                                                   ║
║                  YUSR INSTALLATION WIZARD                        ║
║                                                                   ║
║            Quran Memorization & Academy Platform                 ║
║                                                                   ║
╚═══════════════════════════════════════════════════════════════════╝
EOF
    echo -e "${NC}\n"

    print_info "This wizard will guide you through the installation process"
    print_info "Designed for shared VPS environments with existing Nginx"
    echo ""

    check_root
    check_requirements
    gather_details
    show_summary
    create_install_dir
    generate_env
    generate_docker_compose
    generate_nginx_config
    setup_nginx
    start_services
    create_systemd_service
    generate_backup_script
    show_completion
}

main "$@"
