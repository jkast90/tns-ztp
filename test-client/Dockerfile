FROM alpine:3.19

# Install required packages
RUN apk add --no-cache \
    dhclient \
    tftp-hpa \
    dropbear \
    dropbear-scp \
    bash \
    curl

# Create directories
RUN mkdir -p /etc/dropbear /root/.ssh /config

# Generate SSH host keys
RUN dropbearkey -t rsa -f /etc/dropbear/dropbear_rsa_host_key && \
    dropbearkey -t ecdsa -f /etc/dropbear/dropbear_ecdsa_host_key

# Create admin user with password 'admin'
RUN adduser -D -s /bin/bash admin && \
    echo "admin:admin" | chpasswd

# Copy scripts
COPY entrypoint.sh /entrypoint.sh
COPY show_config.sh /usr/local/bin/show
RUN chmod +x /entrypoint.sh /usr/local/bin/show

# Make 'show running-config' work
RUN ln -s /usr/local/bin/show /usr/local/bin/show-running-config && \
    mkdir -p /usr/local/bin && \
    echo '#!/bin/bash' > /usr/local/bin/running-config && \
    echo 'exec /usr/local/bin/show running-config' >> /usr/local/bin/running-config && \
    chmod +x /usr/local/bin/running-config

EXPOSE 22

ENTRYPOINT ["/entrypoint.sh"]
