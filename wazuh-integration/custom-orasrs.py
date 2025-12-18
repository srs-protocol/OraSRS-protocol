#!/usr/bin/env python3
import sys
import json
import requests
import time
import os

# OraSRS Client API
ORASRS_API_PROCESS = "http://127.0.0.1:3006/orasrs/v1/threats/process"
LOG_FILE = "/var/ossec/logs/integrations.log"

def log(msg):
    with open(LOG_FILE, "a") as f:
        f.write(f"{time.strftime('%Y-%m-%d %H:%M:%S')} custom-orasrs: {msg}\n")

def process_threat(ip, alert_data):
    try:
        payload = {
            "ip": ip,
            "threatType": "Wazuh Alert",
            "threatLevel": "High", # Default to High for Wazuh alerts, or parse from alert_data
            "context": json.dumps(alert_data.get("rule", {})),
            "evidence": "Wazuh Active Response Trigger"
        }
        
        # Extract level from alert if available
        level = alert_data.get("rule", {}).get("level", 0)
        if level >= 12:
            payload["threatLevel"] = "Critical"
        elif level >= 10:
            payload["threatLevel"] = "High"
        else:
            payload["threatLevel"] = "Medium"

        response = requests.post(ORASRS_API_PROCESS, json=payload, timeout=2)
        if response.status_code == 200:
            return response.json()
    except Exception as e:
        log(f"Error processing threat with OraSRS: {e}")
    return None

def main():
    # Read configuration and alert file
    try:
        alert_file = sys.argv[1]
    except IndexError:
        log("Missing arguments")
        sys.exit(1)

    # Read alert
    try:
        with open(alert_file) as f:
            alert_json = json.load(f)
    except Exception as e:
        log(f"Error reading alert file: {e}")
        sys.exit(1)

    # Extract IP
    srcip = alert_json.get("data", {}).get("srcip")
    if not srcip:
        # Try to find ip in other fields
        srcip = alert_json.get("data", {}).get("win", {}).get("eventdata", {}).get("ipAddress")
    
    if not srcip:
        log("No source IP found in alert")
        sys.exit(0)

    # Process Threat with OraSRS
    log(f"Processing IP with OraSRS: {srcip}")
    result = process_threat(srcip, alert_json)

    if result and result.get("action") == "block":
        duration = result.get("duration", 86400)
        reason = result.get("reason", "Unknown")
        
        log(f"OraSRS Decision: BLOCK {srcip} for {duration}s ({reason})")
        
        # Generate Alert for Wazuh to trigger Active Response
        alert_output = {
            "orasrs": {
                "source": "orasrs",
                "action": "block",
                "duration": duration,
                "reason": reason,
                "srcip": srcip,
                "risk_score": result.get("risk_score", 0)
            },
            "integration": "custom-orasrs"
        }
        
        with open("/var/ossec/logs/orasrs-alerts.json", "a") as f:
            f.write(json.dumps(alert_output) + "\n")
            
    elif result and result.get("action") == "allow":
        log(f"OraSRS Decision: ALLOW {srcip} ({result.get('reason')})")
    else:
        log(f"OraSRS Decision: NO ACTION for {srcip}")

if __name__ == "__main__":
    main()
