#!/bin/bash
set -e

echo "========================================"
echo "ZTP Test Client Starting"
echo "========================================"

# Get our MAC address
MAC=$(ip link show eth0 | grep ether | awk '{print $2}')
echo "MAC Address: $MAC"

# Start SSH server in background
echo "Starting SSH server..."
dropbear -R -F -E -p 22 &
SSH_PID=$!

# Wait a moment for network to be ready
sleep 2

# Request DHCP lease
echo "Requesting DHCP lease..."
dhclient -v eth0 2>&1 || true

# Wait for IP
sleep 2

# Show assigned IP
IP=$(ip addr show eth0 | grep 'inet ' | awk '{print $2}' | cut -d/ -f1)
echo "Assigned IP: $IP"

# Get TFTP server from DHCP options (option 66)
TFTP_SERVER=${TFTP_SERVER:-172.30.0.2}
echo "TFTP Server: $TFTP_SERVER"

# Calculate config filename from MAC
CONFIG_FILE=$(echo "$MAC" | tr ':' '_').cfg
echo "Config File: $CONFIG_FILE"

# Fetch configuration via TFTP
echo "Fetching configuration via TFTP..."
cd /config
if tftp "$TFTP_SERVER" -c get "$CONFIG_FILE" 2>&1; then
    echo "Configuration received successfully!"
    echo "========================================"
    echo "Configuration contents:"
    echo "========================================"
    cat "/config/$CONFIG_FILE"
    echo ""
    echo "========================================"
else
    echo "Warning: Could not fetch config from TFTP (device may not be registered yet)"
fi

echo ""
echo "Test client is ready."
echo "SSH access: ssh admin@$IP (password: admin)"
echo "Backup command: show running-config"
echo ""
echo "Waiting for connections..."

# Keep container running
wait $SSH_PID
