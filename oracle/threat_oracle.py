import requests
import ipaddress
import time
from web3 import Web3
from eth_abi import encode

# Configuration
RPC_URL = "http://127.0.0.1:8545"  # Local Hardhat node
PRIVATE_KEY = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80" # Hardhat Account #0
CONTRACT_ADDRESS = "0x..." # To be filled after deployment
BATCH_SIZE = 100

# Source Priority (higher = more critical)
SOURCE_PRIORITY = {
    "Abuse.ch": 4,      # C2 servers - Critical
    "Spamhaus": 3,      # Confirmed botnets - High
    "DShield": 2,       # Scanning activity - Medium
}

# Threat Sources
SOURCES = {
    "Spamhaus": "https://www.spamhaus.org/drop/drop.txt", # Example URL
    "DShield": "https://feeds.dshield.org/block.txt",
    "Abuse.ch": "https://feodotracker.abuse.ch/downloads/ipblocklist.txt"
}

# Reserved Ranges (RFC1918, RFC6598, etc.)
RESERVED_NETWORKS = [
    ipaddress.ip_network("10.0.0.0/8"),
    ipaddress.ip_network("172.16.0.0/12"),
    ipaddress.ip_network("192.168.0.0/16"),
    ipaddress.ip_network("100.64.0.0/10"), # CGNAT
    ipaddress.ip_network("127.0.0.0/8"),
    ipaddress.ip_network("0.0.0.0/8"),
    ipaddress.ip_network("169.254.0.0/16"),
    ipaddress.ip_network("224.0.0.0/4"),
    ipaddress.ip_network("240.0.0.0/4")
]

def is_public_ip(ip_str):
    try:
        ip = ipaddress.ip_address(ip_str)
        for net in RESERVED_NETWORKS:
            if ip in net:
                return False
        return True
    except ValueError:
        return False

def fetch_threats():
    threat_data = {}  # ip -> {'sources': set(), 'priority': int, 'cidr': str}
    
    for name, url in SOURCES.items():
        print(f"Fetching {name}...")
        
        try:
            # Try to fetch real data, fall back to mock
            try:
                response = requests.get(url, timeout=10)
                lines = response.text.splitlines()
                print(f"  Fetched {len(lines)} lines from {name}")
            except Exception as fetch_error:
                print(f"  Failed to fetch from {url}: {fetch_error}, using mock data")
                # Mock data for demonstration
                if name == "Spamhaus":
                    lines = ["1.10.16.0/20 ; SBL256894", "1.19.0.0/16 ; SBL434604"]
                elif name == "DShield":
                    lines = ["1.2.3.4\t100", "9.10.11.12\t50"]
                else:
                    lines = ["1.2.3.4", "13.14.15.16", "45.148.10.2", "15.204.219.215", "162.243.103.246", "167.86.75.145", "51.210.96.48"]

            for line in lines:
                line = line.strip()
                if not line or line.startswith("#") or line.startswith(";"):
                    continue
                
                # Extract IP or CIDR
                parts = line.split()
                if not parts: continue
                ip_or_cidr = parts[0]
                
                # Handle CIDR notation (e.g., 1.2.3.0/24)
                if '/' in ip_or_cidr:
                    try:
                        network = ipaddress.ip_network(ip_or_cidr, strict=False)
                        # Use network address as representative IP
                        ip_str = str(network.network_address)
                        cidr_notation = ip_or_cidr
                        
                        if is_public_ip(ip_str):
                            if ip_str not in threat_data:
                                threat_data[ip_str] = {'sources': set(), 'priority': 0, 'cidr': cidr_notation}
                            threat_data[ip_str]['sources'].add(name)
                            # Update priority to highest
                            threat_data[ip_str]['priority'] = max(
                                threat_data[ip_str]['priority'],
                                SOURCE_PRIORITY.get(name, 1)
                            )
                    except ValueError:
                        continue
                else:
                    # Single IP
                    if is_public_ip(ip_or_cidr):
                        if ip_or_cidr not in threat_data:
                            threat_data[ip_or_cidr] = {'sources': set(), 'priority': 0, 'cidr': f"{ip_or_cidr}/32"}
                        threat_data[ip_or_cidr]['sources'].add(name)
                        threat_data[ip_or_cidr]['priority'] = max(
                            threat_data[ip_or_cidr]['priority'],
                            SOURCE_PRIORITY.get(name, 1)
                        )
                    
        except Exception as e:
            print(f"Error processing {name}: {e}")
    
    # Calculate risk levels based on source count and priority
    for ip, data in threat_data.items():
        source_count = len(data['sources'])
        priority = data['priority']
        
        # Risk control if seen in multiple sources
        if source_count >= 2:
            data['risk_level'] = 4  # Critical/Risk Control
        elif priority >= 4:
            data['risk_level'] = 4  # Critical (Abuse.ch)
        elif priority >= 3:
            data['risk_level'] = 3  # High (Spamhaus)
        else:
            data['risk_level'] = 2  # Medium
            
    return threat_data

def ip_to_bytes4(ip_str):
    return ipaddress.ip_address(ip_str).packed



    # Build and update Merkle Tree
    print("Building Merkle Tree...")
    leaves = []
    # Sort IPs for deterministic tree
    sorted_ips = sorted(threat_data.keys(), key=lambda ip: ipaddress.ip_address(ip))
    
    for ip in sorted_ips:
        # Leaf = keccak256(packed_ip)
        # We pack just the IP for simple membership proof
        # Or we could pack (ip, level, expiry)
        packed = ip_to_bytes4(ip)
        leaf = Web3.keccak(packed)
        leaves.append(leaf)
        
    if leaves:
        root = build_merkle_root(leaves)
        print(f"Merkle Root: {root.hex()}")
        update_merkle_root(w3, account, contract, root)
        
        # Save tree data for clients (simulated CDN)
        import json
def build_merkle_tree(ip_list):
    """Build Merkle Tree with sorted leaves (防 second-preimage)"""
    if not ip_list:
        return b'\x00' * 32
    
    # Sort IP addresses for deterministic tree
    sorted_ips = sorted(ip_list, key=lambda ip: ipaddress.ip_address(ip))
    
    # Create leaves (hash of each IP)
    leaves = []
    for ip in sorted_ips:
        ip_bytes = ip_to_bytes4(ip)
        leaf_hash = Web3.keccak(ip_bytes)
        leaves.append(leaf_hash)
    
    if len(leaves) == 0:
        return b'\x00' * 32
    
    # Build tree bottom-up
    tree = leaves
    while len(tree) > 1:
        level = []
        for i in range(0, len(tree), 2):
            left = tree[i]
            if i + 1 < len(tree):
                right = tree[i+1]
            else:
                right = left  # Duplicate last node if odd
            
            # Standard Merkle Tree: hash(left + right)
            combined = Web3.keccak(left + right)
            level.append(combined)
        tree = level
    return tree[0]

def update_merkle_root(w3, account, contract, root):
    print(f"Updating Merkle Root to {root.hex()}...")
    # In a real scenario, sign and send transaction
    tx = contract.functions.updateMerkleRoot(root).build_transaction({
        'from': account.address,
        'nonce': w3.eth.get_transaction_count(account.address),
    })
    signed_tx = w3.eth.account.sign_transaction(tx, PRIVATE_KEY)
    tx_hash = w3.eth.send_raw_transaction(signed_tx.raw_transaction)
    print(f"Merkle Root updated: {tx_hash.hex()}")
    # print("Merkle Root update sent (Simulated)")

def send_batch(w3, account, contract, ips, levels, masks, sources):
    print(f"Sending batch of {len(ips)} IPs...")
    # In a real scenario, we would estimate gas and sign transaction
    tx = contract.functions.updateThreatBatch(ips, levels, masks, sources, 86400).build_transaction({
        'from': account.address,
        'nonce': w3.eth.get_transaction_count(account.address),
    })
    signed_tx = w3.eth.account.sign_transaction(tx, PRIVATE_KEY)
    tx_hash = w3.eth.send_raw_transaction(signed_tx.raw_transaction)
    print(f"Transaction sent: {tx_hash.hex()}")
    # print("Batch sent (Simulated)")



def update_contract(threat_data, contract_address, added_ips, removed_ips):
    w3 = Web3(Web3.HTTPProvider(RPC_URL))
    if not w3.is_connected():
        print("Failed to connect to blockchain")
        return

    account = w3.eth.account.from_key(PRIVATE_KEY)
    
    # ABI (Same as before + updateMerkleRoot)
    abi = [{
        "inputs": [
            {"internalType": "bytes4[]", "name": "ips", "type": "bytes4[]"},
            {"internalType": "uint8[]", "name": "levels", "type": "uint8[]"},
            {"internalType": "uint8[]", "name": "masks", "type": "uint8[]"},
            {"internalType": "uint16[]", "name": "sources", "type": "uint16[]"},
            {"internalType": "uint64", "name": "duration", "type": "uint64"}
        ],
        "name": "updateThreatBatch",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [{"internalType": "bytes32", "name": "_root", "type": "bytes32"}],
        "name": "updateMerkleRoot",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    }]
    
    contract = w3.eth.contract(address=contract_address, abi=abi)
    
    # 1. Update Added/Existing IPs
    # We should update all current IPs to refresh expiry if they are persistent threats (stacking)
    # But to save gas, maybe only update added + those close to expiry?
    # For this demo, let's update ALL current IPs to demonstrate stacking.
    # Or just added ones if we assume others are fine.
    # User said "incremental update mechanism", so maybe just added?
    # But stacking requires "if IP exists... expiry += 7 days". This happens on update.
    # So we MUST call update on existing IPs to trigger stacking.
    # So we update ALL current IPs.
    
    ips = []
    levels = []
    masks = []
    sources = []
    
    # Process all current IPs
    for ip, info in threat_data.items():
        ips.append(ip_to_bytes4(ip))
        
        # Use computed risk_level
        levels.append(info['risk_level'])
            
        # Parse CIDR mask
        cidr = info['cidr']
        if '/' in cidr:
            mask = int(cidr.split('/')[1])
        else:
            mask = 32
        masks.append(mask)
        
        # Encode sources as bitmask
        src_mask = 0
        source_set = info['sources']
        if "Spamhaus" in source_set: src_mask |= 1
        if "DShield" in source_set: src_mask |= 2
        if "Abuse.ch" in source_set: src_mask |= 4
        sources.append(src_mask)
        
        if len(ips) >= BATCH_SIZE:
            send_batch(w3, account, contract, ips, levels, masks, sources)
            ips, levels, masks, sources = [], [], [], []
            
    if ips:
        send_batch(w3, account, contract, ips, levels, masks, sources)
        
    # 2. Prune Removed IPs (Set level to 0)
    if removed_ips:
        print(f"Pruning {len(removed_ips)} removed IPs...")
        ips, levels, masks, sources = [], [], [], []
        for ip in removed_ips:
            ips.append(ip_to_bytes4(ip))
            levels.append(0) # Level 0 = Delete
            masks.append(32)
            sources.append(0)
            
            if len(ips) >= BATCH_SIZE:
                send_batch(w3, account, contract, ips, levels, masks, sources)
                ips, levels, masks, sources = [], [], [], []
        if ips:
            send_batch(w3, account, contract, ips, levels, masks, sources)

    # Build Merkle Tree (from current state)
    # ... (Same logic as before) ...
    print("Building Merkle Tree...")
    leaves = []
    sorted_ips = sorted(threat_data.keys(), key=lambda ip: ipaddress.ip_address(ip))
    
    for ip in sorted_ips:
        packed = ip_to_bytes4(ip)
        leaf = Web3.keccak(packed)
        leaves.append(leaf)
        
    if leaves:
        root = build_merkle_tree(list(threat_data.keys()))
        print(f"Merkle Root: {root.hex()}")
        update_merkle_root(w3, account, contract, root)
        
        # Save tree data
        tree_data = {
            "root": root.hex(),
            "timestamp": int(time.time()),
            "leaves": [l.hex() for l in leaves],
            "ips": sorted_ips
        }
        with open("oracle/merkle_tree.json", "w") as f:
            json.dump(tree_data, f, indent=2)

if __name__ == "__main__":
    print("Starting Oracle...")
    data = fetch_threats()
    print(f"Processed {len(data)} unique IPs")
    
    # Read contract address
    try:
        with open("oracle/contract_address.txt", "r") as f:
            contract_address = f.read().strip()
    except FileNotFoundError:
        print("Contract address file not found. Please deploy contract first.")
        exit(1)

    print(f"Using Contract Address: {contract_address}")
    
    # Load previous version for diff
    import os
    import json
    prev_data = {}
    if os.path.exists("oracle/latest_threats.json"):
        try:
            with open("oracle/latest_threats.json", "r") as f:
                prev_data = json.load(f)
        except json.JSONDecodeError:
            print("Warning: oracle/latest_threats.json is corrupted. Starting fresh.")
            prev_data = {}
            
    # Calculate Diff
    current_ips = set(data.keys())
    prev_ips = set(prev_data.keys())
    
    added_ips = list(current_ips - prev_ips)
    removed_ips = list(prev_ips - current_ips)
    
    version = time.strftime("v%Y%m%d")
    diff_data = {
        "version": version,
        "timestamp": int(time.time()),
        "added": added_ips,
        "removed": removed_ips,
        "stats": {
            "total_current": len(current_ips),
            "total_previous": len(prev_ips),
            "added_count": len(added_ips),
            "removed_count": len(removed_ips)
        }
    }
    
    # Save Diff
    with open(f"oracle/diff_{version}.json", "w") as f:
        json.dump(diff_data, f, indent=2)
    print(f"Diff saved to oracle/diff_{version}.json")
    
    # Save current state as latest with full metadata
    serializable_data = {}
    for ip, info in data.items():
        serializable_data[ip] = {
            "sources": list(info['sources']),
            "priority": info['priority'],
            "risk_level": info['risk_level'],
            "cidr": info['cidr']
        }
    
    # Save full data
    with open("oracle/latest_threats.json", "w") as f:
        json.dump(serializable_data, f, indent=2)
    
    # Also save a compact version for light clients
    compact_data = {
        "version": version,
        "timestamp": int(time.time()),
        "entries": [
            {
                "ip": ip,
                "cidr": info['cidr'],
                "risk": info['risk_level']
            }
            for ip, info in sorted(data.items(), key=lambda x: ipaddress.ip_address(x[0]))
        ]
    }
    with open("oracle/threats_compact.json", "w") as f:
        json.dump(compact_data, f, indent=2)
    print(f"Saved {len(data)} threats to oracle/latest_threats.json and oracle/threats_compact.json")
        
    update_contract(data, contract_address, added_ips, removed_ips)
    print("Oracle run complete")

