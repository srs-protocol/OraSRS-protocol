---
title: Decentralized Threat Signaling Protocol (DTSP) using OraSRS
abbrev: DTSP
docname: draft-luo-orasrs-decentralized-threat-signaling-00
date: 2025-12-16
category: std

ipr: trust200902
area: Security
workgroup: Network Working Group
keyword: Internet-Draft

stand_alone: yes
pi: [toc, sortrefs, symrefs]

author:
 -
    ins: G. Luo
    name: Great Luo
    organization: OraSRS Protocol
    email: luo@orasrs.net

normative:
  RFC2119:

informative:
  OraSRS-Paper:
    title: "OraSRS: Decentralized Threat Intelligence"
    date: 2024

--- abstract

This document specifies the Decentralized Threat Signaling Protocol (DTSP), a mechanism for distributed edge clients to collaboratively detect, report, and mitigate network threats. The protocol defines a state machine for threat lifecycle management (T0-T3), a standardized data format for threat signaling, and security mechanisms to prevent abuse in a permissionless environment.

--- middle

# Introduction

The increasing sophistication of network attacks requires a collaborative defense mechanism that operates at the edge. Centralized threat intelligence systems suffer from single points of failure and latency issues. DTSP enables a decentralized network of edge clients to share threat intelligence in real-time, leveraging a blockchain-based consensus mechanism for verification.

# Terminology

The key words "MUST", "MUST NOT", "REQUIRED", "SHALL", "SHALL NOT", "SHOULD", "SHOULD NOT", "RECOMMENDED", "NOT RECOMMENDED", "MAY", and "OPTIONAL" in this document are to be interpreted as described in BCP 14 {{RFC2119}} {{!RFC8174}} when, and only when, they appear in all capitals, as shown here.

# Protocol Logic

The lifecycle of a threat in DTSP is modeled as a Finite State Machine (FSM). Each edge client maintains the state of detected threats.

## State Machine

The FSM consists of the following states:

*   **IDLE**: No threat detected.
*   **OPTIMISTIC_BLOCK (T0)**: Local detection of suspicious activity. Immediate local mitigation.
*   **REPORTED (T1)**: Threat evidence submitted to the network.
*   **VERIFIED (T2)**: Network consensus reached. Threat confirmed.
*   **GLOBAL_ENFORCE (T3)**: Global propagation of the threat signature.
*   **EXPIRED**: Threat entry validity period ended.

## State Transitions

### T0: Local Detection

The Edge Client MUST transition to the `OPTIMISTIC_BLOCK` state immediately upon detection of traffic matching local heuristic rules (e.g., high-frequency connection attempts).

In this state, the client:
1.  MUST block the source IP locally.
2.  SHOULD generate a `ThreatEvidence` package.

### T1: Signaling

The Edge Client MUST transition to the `REPORTED` state after generating valid evidence. The client sends a `ThreatSignal` message to the network.

To prevent front-running, the client MUST use a Commit-Reveal scheme:
1.  **Commit**: Send `Hash(Evidence + Salt)`.
2.  **Reveal**: Send `Evidence + Salt` after a random delay.

### T2: Verification

The state transitions to `VERIFIED` when the network (via Smart Contract or Oracle) validates the evidence.
A threat is considered verified if:
`Sum(Reputation(Reporters)) > Threshold`

### T3: Global Enforcement

Upon entering the `GLOBAL_ENFORCE` state, the threat signature is added to the Global Blocklist.
All participating clients MUST synchronize this list and enforce blocking rules via their local kernel datapath (e.g., eBPF).

# Data Format

## Threat Signal

The `ThreatSignal` message is used to report a detected threat. It is serialized using JSON.

| Field          | Type      | Description                                      |
|----------------|-----------|--------------------------------------------------|
| `version`      | uint8     | Protocol version (e.g., 1)                       |
| `type`         | uint8     | Threat type (0=DDoS, 1=Scanning, 2=Malware)      |
| `source_ip`    | uint32    | IPv4 address of the attacker                     |
| `target_ip`    | uint32    | IPv4 address of the victim (optional)            |
| `timestamp`    | uint64    | Unix timestamp of detection (ms)                 |
| `evidence`     | bytes     | Cryptographic proof or log snippet               |
| `signature`    | bytes     | Digital signature of the reporting client        |

## Evidence Package

| Field          | Type      | Description                                      |
|----------------|-----------|--------------------------------------------------|
| `packet_dump`  | bytes     | Sample of malicious packets (pcap format)        |
| `flow_stats`   | struct    | Flow statistics (PPS, BPS, duration)             |
| `heuristics`   | string    | ID of the heuristic rule triggered               |

# Security Considerations

## Sybil Attack Defense

To prevent Sybil attacks where an adversary creates multiple identities to flood the network with false reports, DTSP utilizes a Reputation System.

*   Each client MUST stake tokens to participate in reporting.
*   The weight of a report is proportional to the client's `ReputationScore`.
*   `ReputationScore` increases with valid reports and decreases with false positives.

## Commit-Reveal Mechanism

To prevent "free-riding" (copying others' reports) or front-running:

1.  Clients MUST NOT broadcast raw evidence immediately.
2.  Clients MUST broadcast `Commit = Hash(Evidence | Nonce)`.
3.  After `T_reveal` blocks, clients MUST broadcast `Reveal = (Evidence, Nonce)`.
4.  The network verifies `Hash(Reveal) == Commit`.

# IANA Considerations

This document has no IANA actions.

--- back
