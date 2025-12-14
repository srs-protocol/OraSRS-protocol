#!/usr/bin/env python3
import sys
import json
import requests
import time
import os

# OraSRS Client API
ORASRS_API = "http://127.0.0.1:3006/orasrs/v1/query"
LOG_FILE = "/var/ossec/logs/integrations.log"

def log(msg):
    with open(LOG_FILE, "a") as f:
        f.write(f"{time.strftime('%Y-%m-%d %H:%M:%S')} custom-orasrs: {msg}\n")

def query_orasrs(ip):
    try:
        response = requests.get(f"{ORASRS_API}?ip={ip}", timeout=2)
        if response.status_code == 200:
            return response.json()
    except Exception as e:
        log(f"Error querying OraSRS: {e}")
    return None

def main():
    # Read configuration and alert file
    try:
        alert_file = sys.argv[1]
        user = sys.argv[2]
        hook_url = sys.argv[3]
        api_key = sys.argv[4] if len(sys.argv) > 4 else None
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

    # Query OraSRS
    log(f"Querying OraSRS for IP: {srcip}")
    result = query_orasrs(srcip)

    if result and result.get("response", {}).get("risk_level") in ["高", "严重", "High", "Critical"]:
        # Threat Detected!
        risk_score = result["response"].get("risk_score", 0)
        risk_level = result["response"].get("risk_level", "Unknown")
        
        log(f"Threat detected for {srcip}: {risk_level} (Score: {risk_score})")
        
        # Generate Alert for Wazuh
        alert_output = {
            "orasrs": {
                "source": "orasrs",
                "risk_level": risk_level,
                "risk_score": risk_score,
                "description": f"OraSRS detected high risk IP: {srcip}",
                "srcip": srcip,
                "evidence": result["response"].get("evidence", [])
            },
            "integration": "custom-orasrs"
        }
        
        # Send to Wazuh Manager (via socket or stdout? Integrations usually write to socket or make API call)
        # But standard custom integrations in Wazuh usually just log or send to external.
        # To feed BACK into Wazuh, we usually append to an active response log or use the Wazuh API.
        # However, for simplicity, we can write to a specific log file that Wazuh monitors.
        
        with open("/var/ossec/logs/orasrs-alerts.json", "a") as f:
            f.write(json.dumps(alert_output) + "\n")
            
    else:
        log(f"IP {srcip} is safe or low risk.")

if __name__ == "__main__":
    main()
