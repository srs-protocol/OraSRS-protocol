# Threat Labeling Methodology

## Overview
This document describes the methodology used for labeling network traffic as either normal or malicious in the OraSRS threat detection system.

## Approach
The labeling process combines multiple sources of ground truth:

1. **Expert Analysis**: Network security experts manually review suspicious traffic patterns
2. **Open Source Intelligence**: Integration with known threat databases
3. **Behavioral Analysis**: Statistical modeling of normal vs anomalous behavior
4. **Blockchain Evidence**: Permanently stored threat evidence on-chain

## Labeling Process
1. Traffic logs are preprocessed and normalized
2. Features are extracted based on network protocols, timing, and behavior
3. Labels are assigned using a weighted combination of:
   - Known malicious IP databases
   - Historical threat reports
   - Anomaly detection algorithms
   - Expert validation

## Quality Control
- All labels are reviewed by at least 2 experts
- Disagreements are resolved through consensus
- Random samples are validated by a third expert
- Inter-rater reliability is measured and maintained above 0.85

## Attack Type Labels
- DDoS: Distributed Denial of Service attacks
- SQLi: SQL Injection attempts
- XSS: Cross-Site Scripting attacks
- Phishing: Credential harvesting attempts
- Malware: Malicious file downloads/distribution
- BruteForce: Automated password guessing
