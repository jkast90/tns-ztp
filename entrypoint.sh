#!/bin/sh
set -e

# Default interface (can be overridden via DHCP_INTERFACE env var)
DHCP_INTERFACE=${DHCP_INTERFACE:-eth0}

# Create initial dnsmasq config if it doesn't exist
if [ ! -f /dnsmasq/dnsmasq.conf ]; then
    echo "Creating initial dnsmasq config..."
    cat > /dnsmasq/dnsmasq.conf << DNSMASQ
# Initial ZTP Server dnsmasq config
user=root
interface=${DHCP_INTERFACE}
bind-interfaces
dhcp-range=172.30.0.100,172.30.0.200,255.255.255.0,12h
dhcp-option=option:router,172.30.0.1
enable-tftp
tftp-root=/tftp
dhcp-option=66,172.30.0.2
dhcp-leasefile=/var/lib/misc/dnsmasq.leases
log-dhcp
log-queries
DNSMASQ
fi

# Start dnsmasq in background with config
echo "Starting dnsmasq..."
dnsmasq --keep-in-foreground --log-facility=- --conf-file=/dnsmasq/dnsmasq.conf &
DNSMASQ_PID=$!
echo $DNSMASQ_PID > /var/run/dnsmasq.pid

# Wait for dnsmasq to be ready
sleep 2

# Start ZTP server
echo "Starting ZTP server..."
exec /app/ztp-server
