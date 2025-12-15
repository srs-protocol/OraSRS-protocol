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
    threat_data = {} # ip -> set(sources)
    
    for name, url in SOURCES.items():
        print(f"Fetching {name}...")
        try:
            # Mocking response for demo if URL is not reachable or rate limited
            # In production, use requests.get(url).text
            # response = requests.get(url)
            # lines = response.text.splitlines()
            
            # Mock data for demonstration
            if name == "Spamhaus":
                lines = ["1.2.3.4 ; SBL123", "5.6.7.8 ; SBL456"]
            elif name == "DShield":
                lines = ["1.2.3.4\t100", "9.10.11.12\t50"]
            else:
                lines = ["1.2.3.4", "13.14.15.16", "45.148.10.2"]

            for line in lines:
                line = line.strip()
                if not line or line.startswith("#") or line.startswith(";"):
                    continue
                
                # Simple extraction (improve regex for real usage)
                parts = line.split()
                if not parts: continue
                ip_str = parts[0]
                
                if is_public_ip(ip_str):
                    if ip_str not in threat_data:
                        threat_data[ip_str] = set()
                    threat_data[ip_str].add(name)
                    
        except Exception as e:
            print(f"Error fetching {name}: {e}")
            
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
        tree_data = {
            "root": root.hex(),
            "timestamp": int(time.time()),
            "leaves": [l.hex() for l in leaves],
            "ips": sorted_ips
        }
        with open("oracle/merkle_tree.json", "w") as f:
            json.dump(tree_data, f, indent=2)
        print("Tree data saved to oracle/merkle_tree.json")

def build_merkle_root(leaves):
    if not leaves:
        return b'\x00' * 32
    
    tree = leaves
    while len(tree) > 1:
        level = []
        for i in range(0, len(tree), 2):
            left = tree[i]
            if i + 1 < len(tree):
                right = tree[i+1]
            else:
                right = left # Duplicate last node if odd
            
            # Standard Merkle Tree: hash(left + right)
            # Use sorted concatenation to avoid ordering issues? 
            # Usually standard is left+right.
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
    for ip, source_set in threat_data.items():
        ips.append(ip_to_bytes4(ip))
        
        if len(source_set) >= 2:
            levels.append(4)
        else:
            levels.append(3)
            
        masks.append(32)
        
        src_mask = 0
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
        root = build_merkle_root(leaves)
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
                # Convert lists back to sets if needed, but for diff keys() is enough
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
        "removed": removed_ips
    }
    
    # Save Diff
    with open(f"oracle/diff_{version}.json", "w") as f:
        json.dump(diff_data, f, indent=2)
    print(f"Diff saved to oracle/diff_{version}.json")
    
    # Save current state as latest
    # Convert sets to lists for JSON serialization
    serializable_data = {k: list(v) for k, v in data.items()}
    with open("oracle/latest_threats.json", "w") as f:
        json.dump(serializable_data, f, indent=2)
        
    update_contract(data, contract_address, added_ips, removed_ips)
    print("Oracle run complete")

