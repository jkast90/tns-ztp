#!/bin/bash
# Run ZTP Server natively on macOS with an ethernet dongle
# Usage: ./run-native.sh [interface]
# Example: sudo LISTEN_ADDR=:8088 ./run-native.sh en9

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Determine script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Configuration
INTERFACE="${1:-}"
DATA_DIR="${SCRIPT_DIR}/native-data"
DB_PATH="${DATA_DIR}/ztp.db"
DNSMASQ_CONFIG="${DATA_DIR}/dnsmasq.conf"
TFTP_DIR="${DATA_DIR}/tftp"
BACKUP_DIR="${DATA_DIR}/backups"
TEMPLATES_DIR="${SCRIPT_DIR}/configs/templates"
LEASE_PATH="${DATA_DIR}/dnsmasq.leases"
DNSMASQ_PID="${DATA_DIR}/dnsmasq.pid"
LISTEN_ADDR="${LISTEN_ADDR:-:8080}"

# Check if running as root (required for DHCP)
check_root() {
    if [ "$EUID" -ne 0 ]; then
        echo -e "${RED}Error: This script must be run as root (sudo) for DHCP to work${NC}"
        exit 1
    fi
}

# List available ethernet interfaces
list_interfaces() {
    echo -e "${YELLOW}Available network interfaces:${NC}"
    networksetup -listnetworkserviceorder | grep -E "^\([0-9]+\)" | while read line; do
        service=$(echo "$line" | sed 's/([0-9]*) //')
        echo "  $service"
    done
    echo ""
    echo -e "${YELLOW}Active interfaces with IP addresses:${NC}"
    ifconfig | grep -E "^[a-z]|inet " | grep -B1 "inet " | grep -E "^[a-z]" | awk -F: '{print "  " $1}'
}

# Check if interface exists and is valid
check_interface() {
    if [ -z "$INTERFACE" ]; then
        echo -e "${RED}Error: No interface specified${NC}"
        echo ""
        list_interfaces
        echo ""
        echo "Usage: sudo $0 <interface>"
        echo "Example: sudo $0 en8"
        exit 1
    fi

    if ! ifconfig "$INTERFACE" &>/dev/null; then
        echo -e "${RED}Error: Interface '$INTERFACE' not found${NC}"
        echo ""
        list_interfaces
        exit 1
    fi

    echo -e "${GREEN}Using interface: $INTERFACE${NC}"
}

# Check dependencies
check_dependencies() {
    echo "Checking dependencies..."

    # Check for dnsmasq
    if ! command -v dnsmasq &>/dev/null; then
        echo -e "${RED}Error: dnsmasq not found${NC}"
        echo "Install with: brew install dnsmasq"
        exit 1
    fi
    echo -e "  ${GREEN}✓${NC} dnsmasq"

    # Check if Go binary exists or needs building
    if [ ! -f "${SCRIPT_DIR}/backend/ztp-server" ]; then
        echo -e "  ${YELLOW}!${NC} ZTP server binary not found, will build..."
        BUILD_NEEDED=true
    else
        echo -e "  ${GREEN}✓${NC} ztp-server binary"
    fi
}

# Build the Go backend
build_backend() {
    if [ "$BUILD_NEEDED" = true ]; then
        echo "Building ZTP server..."
        cd "${SCRIPT_DIR}/backend"
        go build -o ztp-server .
        echo -e "${GREEN}Build complete${NC}"
    fi
}

# Create data directories
setup_directories() {
    echo "Setting up directories..."
    mkdir -p "$DATA_DIR"
    mkdir -p "$TFTP_DIR"
    mkdir -p "$BACKUP_DIR"
    touch "$LEASE_PATH"
    echo -e "${GREEN}Directories created at: $DATA_DIR${NC}"
}

# Get interface IP address
get_interface_ip() {
    IP=$(ifconfig "$INTERFACE" | grep "inet " | head -1 | awk '{print $2}')
    if [ -z "$IP" ]; then
        echo -e "${YELLOW}Warning: Interface $INTERFACE has no IP address${NC}"
        echo "You may need to configure a static IP on this interface."
        echo ""
        echo "To set a static IP, run:"
        echo "  sudo ifconfig $INTERFACE 10.0.0.1 netmask 255.255.255.0"
        echo ""
        read -p "Would you like to set IP 10.0.0.1/24 on $INTERFACE? [y/N] " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            sudo ifconfig "$INTERFACE" 10.0.0.1 netmask 255.255.255.0
            IP="10.0.0.1"
            echo -e "${GREEN}Set IP to 10.0.0.1${NC}"
        else
            echo "Please configure the interface manually and re-run this script."
            exit 1
        fi
    fi
    echo -e "Interface IP: ${GREEN}$IP${NC}"
}

# Calculate DHCP range based on interface IP
calculate_dhcp_range() {
    # Extract network prefix (first 3 octets)
    PREFIX=$(echo "$IP" | cut -d. -f1-3)
    DHCP_START="${PREFIX}.100"
    DHCP_END="${PREFIX}.200"
    DHCP_GATEWAY="$IP"
    echo "DHCP range: $DHCP_START - $DHCP_END"
}

# Create initial dnsmasq config
create_dnsmasq_config() {
    if [ ! -f "$DNSMASQ_CONFIG" ]; then
        echo "Creating dnsmasq config..."
        cat > "$DNSMASQ_CONFIG" << EOF
# ZTP Server dnsmasq config for native macOS
# Generated for interface: $INTERFACE

user=root
interface=$INTERFACE
bind-interfaces

# DHCP range
dhcp-range=$DHCP_START,$DHCP_END,255.255.255.0,12h
dhcp-option=option:router,$DHCP_GATEWAY

# TFTP Settings
enable-tftp
tftp-root=$TFTP_DIR

# TFTP server option (option 66)
dhcp-option=66,$IP

# Lease file
dhcp-leasefile=$LEASE_PATH

# Logging
log-dhcp
log-queries
EOF
        echo -e "${GREEN}dnsmasq config created${NC}"
    else
        echo "Using existing dnsmasq config"
    fi
}

# Stop any existing dnsmasq
stop_dnsmasq() {
    if [ -f "$DNSMASQ_PID" ]; then
        PID=$(cat "$DNSMASQ_PID" 2>/dev/null)
        if [ -n "$PID" ] && kill -0 "$PID" 2>/dev/null; then
            echo "Stopping existing dnsmasq (PID: $PID)..."
            kill "$PID" 2>/dev/null || true
            sleep 1
        fi
        rm -f "$DNSMASQ_PID"
    fi
    # Also kill any system dnsmasq that might conflict
    pkill -f "dnsmasq.*$INTERFACE" 2>/dev/null || true
}

# Start dnsmasq
start_dnsmasq() {
    echo "Starting dnsmasq..."
    # Clear lease file to force fresh IP assignments based on config
    rm -f "$LEASE_PATH"
    touch "$LEASE_PATH"
    dnsmasq --keep-in-foreground --log-facility=- --conf-file="$DNSMASQ_CONFIG" &
    DNSMASQ_PROC=$!
    echo $DNSMASQ_PROC > "$DNSMASQ_PID"
    sleep 2

    if kill -0 $DNSMASQ_PROC 2>/dev/null; then
        echo -e "${GREEN}dnsmasq started (PID: $DNSMASQ_PROC)${NC}"
    else
        echo -e "${RED}Failed to start dnsmasq${NC}"
        exit 1
    fi
}

# Start ZTP server
start_ztp_server() {
    echo "Starting ZTP server..."
    echo ""
    PORT="${LISTEN_ADDR#:}"
    echo -e "${GREEN}========================================${NC}"
    echo -e "${GREEN}ZTP Server running on http://localhost:${PORT}${NC}"
    echo -e "${GREEN}DHCP/TFTP interface: $INTERFACE ($IP)${NC}"
    echo -e "${GREEN}========================================${NC}"
    echo ""
    echo "Press Ctrl+C to stop"
    echo ""

    # Export environment variables
    export DB_PATH="$DB_PATH"
    export DNSMASQ_CONFIG="$DNSMASQ_CONFIG"
    export TFTP_DIR="$TFTP_DIR"
    export TEMPLATES_DIR="$TEMPLATES_DIR"
    export BACKUP_DIR="$BACKUP_DIR"
    export LEASE_PATH="$LEASE_PATH"
    export DNSMASQ_PID="$DNSMASQ_PID"
    export LISTEN_ADDR="$LISTEN_ADDR"
    export DHCP_INTERFACE="$INTERFACE"
    export FRONTEND_DIR="${SCRIPT_DIR}/frontend/dist"

    # Run the server
    "${SCRIPT_DIR}/backend/ztp-server"
}

# Cleanup on exit
cleanup() {
    echo ""
    echo "Shutting down..."
    stop_dnsmasq
    echo "Done"
}

trap cleanup EXIT

# Generate config using ZTP server (one-shot mode)
generate_ztp_config() {
    echo "Generating dnsmasq config with device reservations..."

    # Export environment variables for the config generator
    export DB_PATH="$DB_PATH"
    export DNSMASQ_CONFIG="$DNSMASQ_CONFIG"
    export TFTP_DIR="$TFTP_DIR"
    export TEMPLATES_DIR="$TEMPLATES_DIR"
    export BACKUP_DIR="$BACKUP_DIR"
    export LEASE_PATH="$LEASE_PATH"
    export DNSMASQ_PID="$DNSMASQ_PID"
    export LISTEN_ADDR="$LISTEN_ADDR"
    export DHCP_INTERFACE="$INTERFACE"
    export FRONTEND_DIR="${SCRIPT_DIR}/frontend/dist"

    # Run config generator (separate binary or use main with flag)
    # For now, create a minimal config if DB exists, ZTP server will regenerate on startup
    if [ -f "$DB_PATH" ]; then
        echo "Database found, ZTP server will generate full config on startup"
    fi

    # Create minimal bootstrap config for dnsmasq to start
    # ZTP server will immediately regenerate with full reservations
    cat > "$DNSMASQ_CONFIG" << EOF
# Bootstrap config - ZTP Server will regenerate with full reservations
user=root
interface=$INTERFACE
bind-interfaces
dhcp-range=$DHCP_START,$DHCP_END,255.255.255.0,12h
dhcp-option=option:router,$DHCP_GATEWAY
enable-tftp
tftp-root=$TFTP_DIR
dhcp-option=66,$IP
dhcp-leasefile=$LEASE_PATH
log-dhcp
log-queries
EOF
    echo -e "${GREEN}Bootstrap config created${NC}"
}

# Main
main() {
    echo ""
    echo "=== ZTP Server Native macOS Runner ==="
    echo ""

    check_root
    check_interface
    check_dependencies
    build_backend
    setup_directories
    get_interface_ip
    calculate_dhcp_range
    stop_dnsmasq
    # Remove old config and leases for fresh start
    rm -f "$DNSMASQ_CONFIG"
    rm -f "$LEASE_PATH"
    touch "$LEASE_PATH"
    # ZTP server will generate config and start dnsmasq
    start_ztp_server
}

main
