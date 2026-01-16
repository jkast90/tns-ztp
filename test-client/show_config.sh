#!/bin/bash
# Mock "show running-config" command for ZTP test client
# This simulates what a real network device would return
# Accepts "show running-config" or just runs without args

export PATH="/sbin:/usr/sbin:/bin:/usr/bin:$PATH"

# Return device config
HOSTNAME=$(hostname)
IP=$(/sbin/ip addr show eth0 2>/dev/null | grep 'inet ' | awk '{print $2}' | cut -d/ -f1)
MAC=$(/sbin/ip link show eth0 2>/dev/null | grep ether | awk '{print $2}')

# Check if we have a downloaded config with content
CONFIG_FILE=$(ls /config/*.cfg 2>/dev/null | head -1)

if [ -n "$CONFIG_FILE" ] && [ -f "$CONFIG_FILE" ] && [ -s "$CONFIG_FILE" ]; then
    # Return the config we received via TFTP
    cat "$CONFIG_FILE"
else
    # Return a default config
    cat << EOF
! Configuration for $HOSTNAME
! Generated: $(date)
! MAC: $MAC
!
hostname $HOSTNAME
!
interface Vlan1
 ip address $IP 255.255.255.0
 no shutdown
!
line vty 0 4
 login local
 transport input ssh
!
end
EOF
fi
