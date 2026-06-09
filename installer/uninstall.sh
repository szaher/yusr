#!/bin/bash

# Yusr Uninstallation Script

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_header()  { echo -e "\n${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n${BLUE}  $1${NC}\n${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"; }
print_success() { echo -e "${GREEN}✓${NC} $1"; }
print_error()   { echo -e "${RED}✗${NC} $1"; }
print_warning() { echo -e "${YELLOW}⚠${NC} $1"; }
print_info()    { echo -e "${BLUE}ℹ${NC} $1"; }

main() {
    clear
    print_header "Yusr Uninstallation"

    print_warning "This will remove Yusr from your system!"
    echo ""
    read -p "Installation directory [/opt/yusr]: " INSTALL_DIR
    INSTALL_DIR=${INSTALL_DIR:-/opt/yusr}

    if [ ! -d "$INSTALL_DIR" ]; then
        print_error "Installation directory not found: $INSTALL_DIR"
        exit 1
    fi

    echo ""
    print_warning "What would you like to do?"
    echo "  1) Stop services only (preserve data)"
    echo "  2) Stop services and remove containers (preserve data volumes)"
    echo "  3) Complete removal (DELETE ALL DATA)"
    echo "  4) Cancel"
    echo ""
    read -p "Select option [1-4]: " OPTION

    case $OPTION in
        1)
            print_header "Stopping Services"
            cd "$INSTALL_DIR"
            docker compose -f docker-compose.prod.yml stop
            print_success "Services stopped. All data preserved."
            ;;
        2)
            print_header "Removing Containers"
            cd "$INSTALL_DIR"
            docker compose -f docker-compose.prod.yml down
            print_success "Containers removed. Volumes and data preserved."
            ;;
        3)
            print_warning "THIS WILL DELETE ALL DATA PERMANENTLY!"
            read -p "Type 'DELETE' to confirm: " CONFIRM

            if [ "$CONFIRM" != "DELETE" ]; then
                print_info "Uninstallation cancelled"
                exit 0
            fi

            # Create a final backup
            print_header "Creating Final Backup"
            if [ -f "$INSTALL_DIR/backup.sh" ]; then
                "$INSTALL_DIR/backup.sh" || print_warning "Backup failed, continuing..."
                print_success "Final backup saved to /var/backups/yusr/"
            fi

            print_header "Removing Yusr"

            # Stop and remove containers + volumes
            cd "$INSTALL_DIR"
            docker compose -f docker-compose.prod.yml down -v

            # Remove Docker images
            print_info "Removing Docker images..."
            docker images | grep yusr | awk '{print $3}' | xargs -r docker rmi -f 2>/dev/null || true

            # Remove systemd service
            if [ -f "/etc/systemd/system/yusr.service" ]; then
                print_info "Removing systemd service..."
                sudo systemctl stop yusr 2>/dev/null || true
                sudo systemctl disable yusr 2>/dev/null || true
                sudo rm -f /etc/systemd/system/yusr.service
                sudo systemctl daemon-reload
                print_success "Systemd service removed"
            fi

            # Remove nginx config
            if [ -f "/etc/nginx/sites-enabled/yusr" ]; then
                print_info "Removing Nginx configuration..."
                sudo rm -f /etc/nginx/sites-enabled/yusr
                sudo rm -f /etc/nginx/sites-available/yusr
                sudo nginx -t 2>/dev/null && sudo systemctl reload nginx
                print_success "Nginx configuration removed"
            fi

            # Remove installation directory
            print_info "Removing installation directory..."
            cd /
            sudo rm -rf "$INSTALL_DIR"
            print_success "Installation directory removed"

            # Ask about backups
            echo ""
            read -p "Remove backups at /var/backups/yusr? (y/n) [n]: " REMOVE_BACKUPS
            if [[ "$REMOVE_BACKUPS" =~ ^[Yy]$ ]]; then
                sudo rm -rf /var/backups/yusr
                print_success "Backups removed"
            else
                print_info "Backups preserved at /var/backups/yusr"
            fi

            print_success "Yusr completely removed"
            ;;
        4)
            print_info "Uninstallation cancelled"
            exit 0
            ;;
        *)
            print_error "Invalid option"
            exit 1
            ;;
    esac

    echo ""
    print_success "Operation completed"
    echo ""
}

main "$@"
