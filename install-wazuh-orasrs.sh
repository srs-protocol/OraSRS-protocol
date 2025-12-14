#!/bin/bash
set -e

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

print_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
print_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }

# 1. Install OraSRS Client
print_info "Installing/Updating OraSRS Client..."
curl -fsSL https://raw.githubusercontent.com/srs-protocol/OraSRS-protocol/lite-client/install-orasrs-client.sh | bash

# 2. Install Wazuh Agent (if not installed)
if ! command -v /var/ossec/bin/wazuh-control &> /dev/null; then
    print_info "Installing Wazuh Agent..."
    curl -s https://packages.wazuh.com/key/GPG-KEY-WAZUH | gpg --no-default-keyring --keyring gnupg-ring:/usr/share/keyrings/wazuh.gpg --import && chmod 644 /usr/share/keyrings/wazuh.gpg
    echo "deb [signed-by=/usr/share/keyrings/wazuh.gpg] https://packages.wazuh.com/4.x/apt/ stable main" | tee -a /etc/apt/sources.list.d/wazuh.list
    apt-get update
    apt-get install -y wazuh-agent
else
    print_info "Wazuh Agent already installed."
fi

# 3. Setup Integration
print_info "Configuring OraSRS Integration for Wazuh..."

# Copy integration script
cp /opt/orasrs/wazuh-integration/custom-orasrs.py /var/ossec/integrations/custom-orasrs.py
chmod 750 /var/ossec/integrations/custom-orasrs.py
chown root:wazuh /var/ossec/integrations/custom-orasrs.py

# Copy Rules
cp /opt/orasrs/wazuh-integration/orasrs_rules.xml /var/ossec/etc/rules/orasrs_rules.xml
chown wazuh:wazuh /var/ossec/etc/rules/orasrs_rules.xml
chmod 640 /var/ossec/etc/rules/orasrs_rules.xml

# Update ossec.conf
if ! grep -q "custom-orasrs" /var/ossec/etc/ossec.conf; then
    print_info "Appending configuration to ossec.conf..."
    # Insert before </ossec_config>
    sed -i '/<\/ossec_config>/e cat /opt/orasrs/wazuh-integration/ossec.conf.snippet' /var/ossec/etc/ossec.conf
fi

# 4. Restart Services
print_info "Restarting Wazuh Agent..."
systemctl restart wazuh-agent

print_success "Wazuh + OraSRS Integration Installed Successfully!"
print_info "OraSRS Client is running on 127.0.0.1:3006 (Local Access Only)"
print_info "Wazuh will now query OraSRS for threats and block High/Critical risks."
