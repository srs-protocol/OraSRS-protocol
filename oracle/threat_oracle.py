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
                lines = ["1.2.3.4", "13.14.15.16"]

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

def update_contract(threat_data):
    w3 = Web3(Web3.HTTPProvider(RPC_URL))
    if not w3.is_connected():
        print("Failed to connect to blockchain")
        return

    account = w3.eth.account.from_key(PRIVATE_KEY)
    
    # ABI for updateThreatBatch
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
    }]
    
    contract = w3.eth.contract(address=CONTRACT_ADDRESS, abi=abi)
    
    ips = []
    levels = []
    masks = []
    sources = []
    
    for ip, source_set in threat_data.items():
        ips.append(ip_to_bytes4(ip))
        
        # Risk Logic
        if len(source_set) >= 2:
            levels.append(4) # Critical (Risk Control)
        else:
            levels.append(3) # High
            
        masks.append(32) # Single IP
        
        # Source Mask (Mock mapping)
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

def send_batch(w3, account, contract, ips, levels, masks, sources):
    print(f"Sending batch of {len(ips)} IPs...")
    # In a real scenario, we would estimate gas and sign transaction
    # tx = contract.functions.updateThreatBatch(ips, levels, masks, sources, 86400).build_transaction({
    #     'from': account.address,
    #     'nonce': w3.eth.get_transaction_count(account.address),
    # })
    # signed_tx = w3.eth.account.sign_transaction(tx, PRIVATE_KEY)
    # tx_hash = w3.eth.send_raw_transaction(signed_tx.rawTransaction)
    # print(f"Transaction sent: {tx_hash.hex()}")
    print("Batch sent (Simulated)")

if __name__ == "__main__":
    print("Starting Oracle...")
    data = fetch_threats()
    print(f"Processed {len(data)} unique IPs")
    update_contract(data)
    print("Oracle run complete")
