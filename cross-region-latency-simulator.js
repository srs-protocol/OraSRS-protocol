// cross-region-latency-simulator.js
import fs from 'fs';

class CrossRegionLatencySimulator {
  constructor(config) {
    this.config = {
      regions: [
        { name: 'Asia', nodes: 20, baseLatency: { min: 0, max: 50 } },
        { name: 'Europe', nodes: 15, baseLatency: { min: 50, max: 100 } },
        { name: 'North America', nodes: 15, baseLatency: { min: 100, max: 150 } },
        { name: 'South America', nodes: 10, baseLatency: { min: 150, max: 200 } },
        { name: 'Oceania', nodes: 8, baseLatency: { min: 200, max: 250 } },
        { name: 'Africa', nodes: 7, baseLatency: { min: 250, max: 300 } }
      ],
      testDuration: 1800, // 30 minutes for testing
      requestRate: 100, // requests per minute
      ...config
    };
    
    this.regionNodes = [];
  }

  generateRegionNodes() {
    for (const region of this.config.regions) {
      for (let i = 0; i < region.nodes; i++) {
        const node = {
          id: `${region.name.toLowerCase()}_node_${i}`,
          region: region.name,
          baseLatency: this.getRandomLatency(region.baseLatency),
          requestCount: 0,
          avgLatency: 0,
          throughput: 0
        };
        this.regionNodes.push(node);
      }
    }
  }

  getRandomLatency(latencyRange) {
    return Math.random() * (latencyRange.max - latencyRange.min) + latencyRange.min;
  }

  simulateNetworkLatency(region) {
    const baseLatency = this.getRegionBaseLatency(region);
    const jitter = (Math.random() - 0.5) * 20;
    return Math.max(0, baseLatency + jitter);
  }

  getRegionBaseLatency(regionName) {
    const region = this.config.regions.find(r => r.name === regionName);
    return this.getRandomLatency(region.baseLatency);
  }

  async simulateCrossRegionRequests() {
    const results = {
      regionPerformance: {},
      globalThroughput: 0,
      avgGlobalLatency: 0,
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      detailedLogs: []
    };

    for (let time = 0; time < this.config.testDuration; time += 60) {
      const minuteResults = await this.simulateMinuteRequests();
      this.aggregateMinuteResults(results, minuteResults);
    }

    return results;
  }

  async simulateMinuteRequests() {
    const minuteResults = {
      regionalResults: {},
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      avgLatency: 0
    };

    for (const node of this.regionNodes) {
      const requestsThisMinute = this.calculateRequestsForNode(node);
      
      // Initialize regional results if not already done
      if (!minuteResults.regionalResults[node.region]) {
        minuteResults.regionalResults[node.region] = {
          requests: 0,
          successful: 0,
          failed: 0,
          avgLatency: 0,
          totalLatency: 0
        };
      }

      for (let i = 0; i < requestsThisMinute; i++) {
        const requestResult = await this.simulateRequest(node);
        
        minuteResults.totalRequests++;
        if (requestResult.success) {
          minuteResults.successfulRequests++;
          minuteResults.regionalResults[node.region].successful++;
        } else {
          minuteResults.failedRequests++;
          minuteResults.regionalResults[node.region].failed++;
        }
        
        // Add to regional latency tracking
        minuteResults.regionalResults[node.region].totalLatency += requestResult.latency;
      }

      const regional = minuteResults.regionalResults[node.region];
      regional.requests += requestsThisMinute;
    }

    for (const region in minuteResults.regionalResults) {
      const data = minuteResults.regionalResults[region];
      data.avgLatency = data.requests > 0 ? data.totalLatency / data.requests : 0;
    }

    return minuteResults;
  }

  calculateRequestsForNode(node) {
    return Math.floor(this.config.requestRate / this.regionNodes.length);
  }

  async simulateRequest(node) {
    const networkDelay = this.simulateNetworkLatency(node.region);
    const processingTime = 10 + Math.random() * 20;
    const totalTime = networkDelay + processingTime;
    const success = Math.random() > (networkDelay / 1000);
    
    return {
      success,
      latency: totalTime,
      networkDelay,
      processingTime,
      timestamp: Date.now()
    };
  }

  aggregateMinuteResults(totalResults, minuteResults) {
    totalResults.totalRequests += minuteResults.totalRequests;
    totalResults.successfulRequests += minuteResults.successfulRequests;
    totalResults.failedRequests += minuteResults.failedRequests;

    for (const region in minuteResults.regionalResults) {
      if (!totalResults.regionPerformance[region]) {
        totalResults.regionPerformance[region] = {
          totalRequests: 0,
          successfulRequests: 0,
          failedRequests: 0,
          totalLatency: 0,
          requestCount: 0
        };
      }

      const minuteRegionData = minuteResults.regionalResults[region];
      const totalRegionData = totalResults.regionPerformance[region];

      totalRegionData.totalRequests += minuteRegionData.requests;
      totalRegionData.successfulRequests += minuteRegionData.successful;
      totalRegionData.failedRequests += minuteRegionData.failed;
      totalRegionData.totalLatency += minuteRegionData.avgLatency * minuteRegionData.requests;
      totalRegionData.requestCount += 1;
    }
  }

  calculateFinalMetrics(results) {
    results.successRate = results.totalRequests > 0 ? 
      results.successfulRequests / results.totalRequests : 0;
    
    results.globalThroughput = results.totalRequests / this.config.testDuration;
    
    let totalLatency = 0;
    let totalWeight = 0;
    
    for (const region in results.regionPerformance) {
      const regionData = results.regionPerformance[region];
      if (regionData.totalRequests > 0) {
        const avgRegionLatency = regionData.totalLatency / regionData.totalRequests;
        totalLatency += avgRegionLatency * regionData.totalRequests;
        totalWeight += regionData.totalRequests;
      }
    }
    
    results.avgGlobalLatency = totalWeight > 0 ? totalLatency / totalWeight : 0;
    
    for (const region in results.regionPerformance) {
      const data = results.regionPerformance[region];
      data.avgLatency = data.totalRequests > 0 ? data.totalLatency / data.totalRequests : 0;
      data.successRate = data.totalRequests > 0 ? data.successfulRequests / data.totalRequests : 0;
      data.throughput = data.totalRequests / this.config.testDuration;
    }
  }

  async runSimulation() {
    console.log("🌐 Starting Cross-Region Latency Simulation...");
    
    this.generateRegionNodes();
    console.log(`Generated ${this.regionNodes.length} nodes across ${this.config.regions.length} regions`);
    
    const results = await this.simulateCrossRegionRequests();
    
    this.calculateFinalMetrics(results);
    
    return results;
  }
}

// Run simulation
async function runCrossRegionSimulation() {
  const simulator = new CrossRegionLatencySimulator({
    requestRate: 100,
    testDuration: 1800
  });

  const results = await simulator.runSimulation();
  
  // Save results
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').replace('T', '_');
  const resultsPath = `logs/cross-region-latency-results-${timestamp}.json`;
  
  await fs.promises.writeFile(resultsPath, JSON.stringify(results, null, 2));
  console.log(`📊 Cross-region simulation results saved to ${resultsPath}`);
  
  return results;
}

  runCrossRegionSimulation()
    .then(results => {
      console.log("✅ Cross-Region Latency Simulation Completed!");
      console.log("📈 Global Metrics:");
      console.log(`   Success Rate: ${(results.successRate * 100).toFixed(2)}%`);
      console.log(`   Global Throughput: ${results.globalThroughput.toFixed(2)} req/sec`);
      console.log(`   Avg Global Latency: ${results.avgGlobalLatency.toFixed(2)}ms`);
      console.log("📊 Regional Performance:", JSON.stringify(results.regionPerformance, null, 2));
    })
    .catch(console.error);
