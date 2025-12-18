# OraSRS Quick Start Guide

## For Operators (Running the Oracle)

### Prerequisites
```bash
# Install Python dependencies
pip3 install web3 requests ipaddress

# Ensure Hardhat node is running (or use production RPC)
npx hardhat node
```

### Run Oracle
```bash
# First time: Deploy contract
npx hardhat run scripts/deploy_optimized.cjs --network localhost

# Run oracle (fetches real data)
python3 oracle/threat_oracle.py
```

**Expected Output**:
```
Starting Oracle...
Fetching Spamhaus...
  Fetched 913 lines from Spamhaus
Fetching DShield...
Fetching Abuse.ch...
Processed 1510 unique IPs
Sending batch of 100 IPs...
Transaction sent: 0x...
Merkle Root: a2e...
Oracle run complete
```

### Verify Data
```bash
# Check generated files
ls -lh oracle/*.json

# Output:
# diff_v20251215.json       (1-5 KB)   - Daily changes
# latest_threats.json       (200 KB)   - Full metadata  
# threats_compact.json      (132 KB)   - Light client
# weekly_snapshot_2025_W50.json (132 KB) - Weekly backup
# merkle_tree.json          (136 KB)   - Merkle proofs
```

## For Clients (Querying Threats)

### Option 1: Direct Query via API

```bash
# Query a single IP
curl "http://localhost:3006/orasrs/v1/query?ip=1.10.16.0"

# Response:
{
  "risk_score": 75,
  "risk_level": "高",
  "evidence": [{
    "type": "blockchain_registry",
    "sources": 1
  }]
}
```

### Option 2: Use Threat Data Loader

```javascript
// app.js
import ThreatDataLoader from './threat-data-loader.js';

const loader = new ThreatDataLoader({
  dataDir: './oracle'
});

await loader.initialize();

// Query threats
const result = loader.query('1.10.16.5');
console.log(result);
// { ip: '1.10.16.0', cidr: '1.10.16.0/20', risk: 3 }
```

### Option 3: CLI Tool

```bash
# Install globally
npm link

# Query
orasrs-cli query 162.243.103.246

# Output:
🔍 查询 IP: 162.243.103.246
风险评估:
  风险评分: 75/100
  风险等级: 高
  建议操作: 阻止
```

## Testing the Full Stack

### 1. Start Services
```bash
# Terminal 1: Hardhat node
npx hardhat node

# Terminal 2: OraSRS client service
systemctl start orasrs-client
# OR: node orasrs-simple-client.js
```

### 2. Run Oracle
```bash
# Terminal 3
python3 oracle/threat_oracle.py
```

### 3. Test Queries
```bash
# Test exact IP (from Abuse.ch)
curl -s "http://localhost:3006/orasrs/v1/query?ip=162.243.103.246" | jq

# Test CIDR match (from Spamhaus DROP)
node -e "
const ThreatDataLoader = require('./threat-data-loader.js').default;
const loader = new ThreatDataLoader();
loader.initialize().then(() => {
  console.log(loader.query('1.10.16.5')); // Matches 1.10.16.0/20
});
"

# Test via CLI
orasrs-cli query 1.10.16.0
```

## Understanding Risk Levels

| Risk | Score | Meaning | Action |
|------|-------|---------|--------|
| 🔴 **Critical** | 100 | C2 server OR multi-source | Block immediately |
| 🟠 **High** | 75 | Confirmed botnet (Spamhaus) | Block + Alert |
| 🟡 **Medium** | 50 | Scanning activity (DShield) | Rate limit |
| 🟢 **Low** | 25 | Suspicious | Monitor |

## Sync Strategies

### Daily Sync (Recommended)
```bash
# cron: Run at 2 AM daily
0 2 * * * python3 /opt/orasrs/oracle/threat_oracle.py

# Client auto-syncs diffs on startup
```

### Real-time Sync
```javascript
// In production
setInterval(async () => {
  await loader.syncDiffs();
  console.log('Synced', loader.getStats());
}, 3600 * 1000); // Every hour
```

### Manual Refresh
```javascript
await loader.refresh(); // Forces full CDN fetch
```

## Common Issues

### "No Data Found"
**Cause**: Client using wrong contract address  
**Fix**: Update `user-config.json` or `local-config.json`:
```json
{
  "network": {
    "contractAddress": "0xE6E340D132b5f46d1e472DebcD681B2aBc16e57E"
  }
}
```

### "Contract Not Deployed"
**Cause**: Oracle contract not deployed  
**Fix**:
```bash
npx hardhat run scripts/deploy_optimized.cjs --network localhost
# Copy address to oracle/contract_address.txt
```

### "Transaction Reverted"
**Cause**: Not enough gas or wrong network  
**Fix**:
```bash
# Check balance
npx hardhat console --network localhost
> (await ethers.provider.getBalance('0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266')).toString()

# Ensure RPC_URL matches network
export RPC_URL=http://127.0.0.1:8545
```

## Performance Tips

### For Light Clients
```javascript
// Only load compact format
const loader = new ThreatDataLoader({
  compactOnly: true  // Skip full metadata
});
```

### For High-Volume APIs
```javascript
// Pre-warm cache
await loader.initialize();

// Use in-memory cache
const cache = new Map();
app.get('/check/:ip', (req, res) => {
  const ip = req.params.ip;
  
  if (cache.has(ip)) {
    return res.json(cache.get(ip));
  }
  
  const result = loader.query(ip);
  cache.set(ip, result);
  res.json(result);
});
```

### For CDN Distribution
```bash
# Enable compression
gzip -9 oracle/threats_compact.json

# Upload to S3/CloudFlare
aws s3 cp oracle/threats_compact.json.gz s3://cdn.orasrs.net/ \
  --content-encoding gzip \
  --content-type application/json \
  --cache-control "max-age=3600"
```

## Next Steps

1. **Production Deployment**
   - [ ] Deploy contracts to mainnet
   - [ ] Configure Oracle cron job
   - [ ] Set up CDN (CloudFlare/AWS S3)
   - [ ] Enable monitoring (Prometheus/Grafana)

2. **Client Integration**
   - [ ] Add ThreatDataLoader to your app
   - [ ] Implement Merkle proof verification
   - [ ] Set up diff sync cron

3. **Security Hardening**
   - [ ] Rotate Oracle private key
   - [ ] Enable multi-sig for contract updates
   - [ ] Audit CDN access logs
   - [ ] Set up alerting for anomalies

---

📚 **Full Documentation**: [threat_intelligence_system.md](./threat_intelligence_system.md)  
🐛 **Issues**: https://github.com/orasrs/protocol/issues  
💬 **Community**: https://discord.gg/orasrs
