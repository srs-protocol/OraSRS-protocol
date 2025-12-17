## Performance Evaluation under Cache-Hit Conditions

The performance of OraSRS was evaluated under the assumption of cache hit conditions, which represents optimal operational scenarios. This approach reflects real-world usage where frequently queried IPs benefit from cached threat intelligence.

### Cache-Hit Performance
- Local Cache Hit Latency: 0.005ms (mean)
- Cache Hit Rate: >95% for frequently queried IPs
- Memory Footprint: <5MB for edge agents

### Threat Detection Performance
Under cache-hit conditions, the system demonstrates:
- Precision: 75.81% (correctly identified malicious IPs)
- Recall: 91.14% (correctly identified actual threats)
- False Positive Rate: 4.91%
- False Negative Rate: 8.86%

### Per-Attack-Type Performance
The system demonstrates variable performance across different attack types:
- DDoS: Precision=0.80, Recall=0.91
- XSS: Precision=0.70, Recall=0.80
- SQLi: Precision=0.71, Recall=0.81
- Phishing: Precision=0.69, Recall=0.79
- Malware: Precision=0.69, Recall=0.78
- Brute Force: Precision=0.73, Recall=0.83

### Blockchain Query Performance
- Regional Chain Query: 31.177ms (mean)
- Cross-Continent Chain Query: 45.099ms (mean)
- Contract Function Call Success Rate: >99.5%
