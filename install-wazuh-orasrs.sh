#!/bin/bash
set -e

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

print_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
print_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
print_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
print_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# Detect OS
detect_os() {
    if [ -f /etc/os-release ]; then
        . /etc/os-release
        OS=$ID
        VER=$VERSION_ID
    elif type lsb_release >/dev/null 2>&1; then
        OS=$(lsb_release -si | tr '[:upper:]' '[:lower:]')
        VER=$(lsb_release -sr)
    else
        OS=$(uname -s)
        VER=$(uname -r)
    fi
    
    print_info "检测到操作系统: $OS $VER"
}

# 1. Install OraSRS Client
print_info "Installing/Updating OraSRS Client..."
curl -fsSL https://raw.githubusercontent.com/srs-protocol/OraSRS-protocol/lite-client/install-orasrs-client.sh | bash

# Detect OS for package manager
detect_os

# 2. Install Wazuh Agent
print_info "Installing Wazuh Agent..."

if [[ ! -d "/run/systemd/system" ]]; then
    print_warning "Systemd not detected. Wazuh Agent installation might fail or require manual start."
    print_warning "Skipping automatic Wazuh installation. Please install Wazuh Agent manually for your environment."
    WAZUH_INSTALLED=false
else
    case "$OS" in
        ubuntu|debian)
            print_info "Installing Wazuh for Debian/Ubuntu..."
            curl -s https://packages.wazuh.com/key/GPG-KEY-WAZUH | gpg --no-default-keyring --keyring gnupg-ring:/usr/share/keyrings/wazuh.gpg --import && chmod 644 /usr/share/keyrings/wazuh.gpg
            echo "deb [signed-by=/usr/share/keyrings/wazuh.gpg] https://packages.wazuh.com/4.x/apt/ stable main" | tee /etc/apt/sources.list.d/wazuh.list
            apt-get update
            apt-get install -y wazuh-agent
            WAZUH_INSTALLED=true
            ;;
        centos|rhel|fedora|rocky|almalinux)
            print_info "Installing Wazuh for RHEL/CentOS/Fedora..."
            rpm --import https://packages.wazuh.com/key/GPG-KEY-WAZUH
            cat > /etc/yum.repos.d/wazuh.repo << EOF
[wazuh]
gpgcheck=1
gpgkey=https://packages.wazuh.com/key/GPG-KEY-WAZUH
enabled=1
name=EL-\$releasever - Wazuh
baseurl=https://packages.wazuh.com/4.x/yum/
protect=1
EOF
            yum install -y wazuh-agent
            WAZUH_INSTALLED=true
            ;;
        arch|manjaro)
            print_warning "Arch Linux detected. Please install Wazuh manually from AUR."
            WAZUH_INSTALLED=false
            ;;
        *)
            print_warning "Unsupported OS: $OS. Please install Wazuh manually."
            WAZUH_INSTALLED=false
            ;;
    esac
fi

# 3. Configure Integration (only if Wazuh is installed)
if [ "$WAZUH_INSTALLED" = true ]; then
    print_info "Configuring Wazuh Integration..."
    
    # Create directories if they don't exist
    mkdir -p /var/ossec/integrations
    mkdir -p /var/ossec/etc/rules
    
    # Copy integration script
    if [ -f /opt/orasrs/wazuh-integration/custom-orasrs.py ]; then
        cp /opt/orasrs/wazuh-integration/custom-orasrs.py /var/ossec/integrations/custom-orasrs.py
        chmod 750 /var/ossec/integrations/custom-orasrs.py
        chown root:wazuh /var/ossec/integrations/custom-orasrs.py 2>/dev/null || chown root:root /var/ossec/integrations/custom-orasrs.py
        print_success "Integration script installed"
    else
        print_error "Integration script not found at /opt/orasrs/wazuh-integration/custom-orasrs.py"
    fi
    
    # Copy Rules
    if [ -f /opt/orasrs/wazuh-integration/orasrs_rules.xml ]; then
        cp /opt/orasrs/wazuh-integration/orasrs_rules.xml /var/ossec/etc/rules/orasrs_rules.xml
        chown wazuh:wazuh /var/ossec/etc/rules/orasrs_rules.xml 2>/dev/null || chown root:root /var/ossec/etc/rules/orasrs_rules.xml
        chmod 640 /var/ossec/etc/rules/orasrs_rules.xml
        print_success "Rules file installed"
    else
        print_error "Rules file not found at /opt/orasrs/wazuh-integration/orasrs_rules.xml"
    fi
    
    # Update ossec.conf
    if [ -f /var/ossec/etc/ossec.conf ]; then
        if ! grep -q "custom-orasrs" /var/ossec/etc/ossec.conf; then
            print_info "Updating ossec.conf..."
            
            # Create backup
            cp /var/ossec/etc/ossec.conf /var/ossec/etc/ossec.conf.bak
            
            # Add integration configuration
            if [ -f /opt/orasrs/wazuh-integration/ossec.conf.snippet ]; then
                sed -i '/<\/ossec_config>/e cat /opt/orasrs/wazuh-integration/ossec.conf.snippet' /var/ossec/etc/ossec.conf
                print_success "ossec.conf updated"
            else
                print_warning "ossec.conf.snippet not found, skipping configuration"
            fi
        else
            print_info "ossec.conf already configured"
        fi
    else
        print_warning "ossec.conf not found, skipping configuration"
    fi
    
    # Restart Wazuh Agent
    print_info "Restarting Wazuh Agent..."
    systemctl restart wazuh-agent || service wazuh-agent restart || print_warning "Failed to restart Wazuh agent"
    
    print_success "Wazuh + OraSRS Integration Installed Successfully!"
else
    print_warning "Wazuh not installed, skipping integration configuration"
fi

# 4. Install PAM Module (HVAP) - Optional
if [ -f /opt/orasrs/pam/pam_orasrs.py ]; then
    print_info "Installing PAM Module for HVAP..."
    mkdir -p /opt/orasrs/pam
    cp /opt/orasrs/pam/pam_orasrs.py /opt/orasrs/pam/pam_orasrs.py 2>/dev/null || print_warning "PAM module not found"
    chmod 755 /opt/orasrs/pam/pam_orasrs.py 2>/dev/null || true
    print_success "PAM module installed (optional)"
else
    print_info "PAM module not found, skipping (optional feature)"
fi

# Summary
echo ""
print_success "Installation Complete!"
echo ""
print_info "OraSRS Client: http://127.0.0.1:3006 (Local Access Only)"
if [ "$WAZUH_INSTALLED" = true ]; then
    print_info "Wazuh Agent: Active and integrated with OraSRS"
    print_info "Wazuh will query OraSRS for threats and block High/Critical risks"
fi
echo ""
print_info "Next steps:"
echo "  1. Check OraSRS status: sudo systemctl status orasrs-client"
if [ "$WAZUH_INSTALLED" = true ]; then
    echo "  2. Check Wazuh status: sudo systemctl status wazuh-agent"
    echo "  3. View Wazuh logs: sudo tail -f /var/ossec/logs/ossec.log"
fi
echo "  4. Test OraSRS: curl http://localhost:3006/health"
echo ""
