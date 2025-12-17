#!/usr/bin/env python3
import sys
import os
import requests
import json
import syslog

# OraSRS Client API
ORASRS_API = "http://127.0.0.1:3006/orasrs/v1/query"

# Syslog setup
syslog.openlog(ident="pam_orasrs", facility=syslog.LOG_AUTH)

def log(msg):
    syslog.syslog(syslog.LOG_INFO, msg)

def get_risk_score(ip):
    try:
        response = requests.get(f"{ORASRS_API}?ip={ip}", timeout=2)
        if response.status_code == 200:
            data = response.json()
            # Parse risk score
            # Response format: { "response": { "risk_score": 85, "risk_level": "High" } }
            score = data.get("response", {}).get("risk_score", 0)
            return float(score) / 100.0 if score > 1 else float(score) # Normalize to 0-1 if needed, but usually score is 0-100. Let's assume 0-100.
    except Exception as e:
        log(f"Error querying OraSRS: {e}")
    return 0

def main():
    # PAM passes the remote host in PAM_RHOST environment variable
    rhost = os.environ.get("PAM_RHOST")
    
    if not rhost:
        # Local connection or no host info
        sys.exit(0) # Allow

    log(f"Checking risk for {rhost}")
    
    score = get_risk_score(rhost)
    log(f"Risk Score for {rhost}: {score}")

    # HVAP Logic
    # L1: < 40 (0.4) -> Allow
    # L2: 40 <= Score < 80 (0.8) -> Warning / MFA (Return 0 but log warning, or return specific code if configured)
    # L3: >= 80 (0.8) -> Block
    
    if score >= 80:
        log(f"BLOCKING High Risk IP {rhost} (Score: {score})")
        print(f"Access Denied: High Risk IP (Score: {score})")
        sys.exit(1) # Deny
        
    if score >= 40:
        log(f"WARNING Medium Risk IP {rhost} (Score: {score}). MFA Recommended.")
        # For now, we allow, but this log can trigger Wazuh to alert admin or we can configure PAM to require MFA.
        # If this script is used in 'auth required pam_exec.so', exit 0 means success (proceed to next module).
        # If we want to ENFORCE MFA here, we can't easily do it from a single script unless we use pam_succeed_if in PAM config.
        sys.exit(0)

    sys.exit(0) # Allow

if __name__ == "__main__":
    main()
