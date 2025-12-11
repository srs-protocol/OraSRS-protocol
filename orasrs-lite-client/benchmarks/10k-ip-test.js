#!/usr/bin/env node

// 10k IP Threat Intelligence Processing Benchmark
// Tests the performance of processing 10,000 IP addresses for threat intelligence

const axios = require('axios');
const fs = require('fs');

async function benchmark10kIPs() {
    console.log('Starting 10k IP threat intelligence benchmark...');
    
    // Generate 10,000 test IP addresses
    const testIPs = [];
    for (let i = 0; i < 10000; i++) {
        testIPs.push(`192.168.${Math.floor(i/256)}.${i % 256}`);
    }
    
    console.log(`Generated ${testIPs.length} test IP addresses`);
    
    const startTime = Date.now();
    let processedCount = 0;
    let errors = 0;
    
    // Process IPs in batches to avoid overwhelming the server
    const batchSize = 100;
    for (let i = 0; i < testIPs.length; i += batchSize) {
        const batch = testIPs.slice(i, i + batchSize);
        
        for (const ip of batch) {
            try {
                // Query the local OraSRS service
                const response = await axios.get(`http://localhost:3006/orasrs/v1/query?ip=${ip}`, {
                    timeout: 5000 // 5 second timeout
                });
                
                if (response.data && response.data.response) {
                    processedCount++;
                }
            } catch (error) {
                errors++;
                console.error(`Error querying ${ip}:`, error.message);
            }
        }
        
        // Log progress every 1000 IPs
        if ((i + batchSize) % 1000 === 0) {
            console.log(`Processed ${i + batchSize}/${testIPs.length} IPs...`);
        }
    }
    
    const endTime = Date.now();
    const totalTime = endTime - startTime;
    const avgTimePerIP = totalTime / testIPs.length;
    
    const results = {
        totalIPs: testIPs.length,
        processedIPs: processedCount,
        errors: errors,
        totalTimeMs: totalTime,
        avgTimePerIPMs: avgTimePerIP.toFixed(2),
        throughput: ((testIPs.length / totalTime) * 1000).toFixed(2), // IPs per second
        timestamp: new Date().toISOString()
    };
    
    console.log('\n=== Benchmark Results ===');
    console.log(`Total IPs: ${results.totalIPs}`);
    console.log(`Processed IPs: ${results.processedIPs}`);
    console.log(`Errors: ${results.errors}`);
    console.log(`Total Time: ${results.totalTimeMs} ms`);
    console.log(`Average Time per IP: ${results.avgTimePerIPMs} ms`);
    console.log(`Throughput: ${results.throughput} IPs/second`);
    
    // Save results to log file
    const resultsDir = './logs/hybrid-cloud-test-results';
    if (!fs.existsSync(resultsDir)) {
        fs.mkdirSync(resultsDir, { recursive: true });
    }
    
    const resultsFile = `${resultsDir}/10k-ip-benchmark-${new Date().toISOString().split('T')[0]}.json`;
    fs.writeFileSync(resultsFile, JSON.stringify(results, null, 2));
    console.log(`\nResults saved to: ${resultsFile}`);
    
    return results;
}

// Run benchmark if called directly
if (require.main === module) {
    benchmark10kIPs()
        .then(results => {
            console.log('\nBenchmark completed successfully!');
            process.exit(0);
        })
        .catch(error => {
            console.error('Benchmark failed:', error);
            process.exit(1);
        });
}

module.exports = benchmark10kIPs;