import ThreatDataLoader from './threat-data-loader.js';

async function demo() {
  console.log('\n🚀 OraSRS Threat Intelligence Demo\n');
  
  const loader = new ThreatDataLoader();
  await loader.initialize();
  
  const stats = loader.getStats();
  console.log('📊 Stats:', {
    total: stats.totalEntries,
    exactIPs: stats.exactIps,
    cidrNets: stats.cidrNetworks,
    version: stats.version
  });
  
  console.log('\n🔍 Demo Queries:\n');
  
  const tests = [
    '1.10.16.0',     // Spamhaus network address
    '1.10.16.5',     // Within CIDR
    '162.243.103.246', // Exact match
    '8.8.8.8',       // Clean
    '2.57.122.100'   // Within CIDR
  ];
  
  for (const ip of tests) {
    const t0 = Date.now();
    const r = loader.query(ip);
    const ms = Date.now() - t0;
    
    if (r) {
      console.log(`  ${ip}: ${loader.getRiskLevelName(r.risk)} (${r.cidr}) [${ms}ms]`);
    } else {
      console.log(`  ${ip}: Clean [${ms}ms]`);
    }
  }
  
  console.log('\n✅ Complete!\n');
}

demo().catch(console.error);
