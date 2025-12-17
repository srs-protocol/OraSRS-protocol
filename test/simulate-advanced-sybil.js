// simulate-advanced-sybil.js
import { ethers } from "ethers";
import fs from 'fs';

class AdvancedSybilSimulator {
  constructor(config) {
    this.config = {
      numNormalNodes: 200,
      numSybilNodes: 50,
      attackDuration: 1800, // 30 minutes
      attackIntensity: 0.75,
      ...config
    };
    
    this.normalNodes = [];
    this.sybilNodes = [];
    this.sybilController = null;
  }

  generateNormalNodes() {
    for (let i = 0; i < this.config.numNormalNodes; i++) {
      const node = {
        id: `normal_${i}`,
        address: ethers.Wallet.createRandom().address,
        reputation: Math.random() * 50 + 50,
        behavior: 'normal',
        lastActivity: Date.now(),
        ip: this.generateRandomIP()
      };
      this.normalNodes.push(node);
    }
  }

  generateSybilNodes() {
    this.sybilController = {
      id: 'sybil_controller',
      baseWallet: ethers.Wallet.createRandom(),
      controlledNodes: []
    };

    for (let i = 0; i < this.config.numSybilNodes; i++) {
      const wallet = new ethers.Wallet(
        ethers.hexlify(ethers.randomBytes(32))
      );
      
      const node = {
        id: `sybil_${i}`,
        address: wallet.address,
        controller: this.sybilController.id,
        reputation: 20 + Math.random() * 10,
        behavior: 'sybil',
        lastActivity: Date.now(),
        ip: this.generateRandomIP(),
        attackPattern: this.determineAttackPattern(i)
      };
      
      this.sybilNodes.push(node);
      this.sybilController.controlledNodes.push(node.id);
    }
  }

  determineAttackPattern(nodeIndex) {
    const patterns = [
      'coordinated_voting',
      'reputation_manipulation',
      'data_pollution',
      'denial_of_service',
      'consensus_attack'
    ];
    return patterns[nodeIndex % patterns.length];
  }

  generateRandomIP() {
    return `${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`;
  }

  simulateAttackBehavior() {
    const results = [];
    
    for (let time = 0; time < this.config.attackDuration; time += 60) {
      const roundResults = {
        timestamp: time,
        normalActivity: this.simulateNormalActivity(),
        sybilActivity: this.simulateSybilActivity(time)
      };
      results.push(roundResults);
    }
    
    return results;
  }

  simulateNormalActivity() {
    return {
      reportsSubmitted: Math.floor(Math.random() * 5),
      votesCasted: Math.floor(Math.random() * 3),
      reputationChange: (Math.random() - 0.3) * 2
    };
  }

  simulateSybilActivity(time) {
    return {
      reportsSubmitted: Math.floor(Math.random() * 20),
      votesCasted: 10,
      reputationChange: Math.random() * 5,
      attackEffectiveness: this.calculateAttackEffectiveness(time)
    };
  }

  calculateAttackEffectiveness(time) {
    return this.config.attackIntensity * (0.8 + 0.2 * Math.sin(time / 300));
  }

  async runSimulation() {
    console.log("🚀 Starting Advanced Sybil Attack Simulation...");
    
    this.generateNormalNodes();
    this.generateSybilNodes();
    
    console.log(`Generated ${this.normalNodes.length} normal nodes and ${this.sybilNodes.length} sybil nodes`);
    
    const simulationResults = this.simulateAttackBehavior();
    
    const analysis = this.analyzeResults(simulationResults);
    
    return {
      simulationResults,
      analysis,
      networkState: {
        totalNodes: this.normalNodes.length + this.sybilNodes.length,
        sybilRatio: this.sybilNodes.length / (this.normalNodes.length + this.sybilNodes.length),
        sybilController: this.sybilController
      }
    };
  }

  analyzeResults(results) {
    const totalNormalActivity = results.reduce((sum, r) => sum + r.normalActivity.reportsSubmitted, 0);
    const totalSybilActivity = results.reduce((sum, r) => sum + r.sybilActivity.reportsSubmitted, 0);
    const avgAttackEffectiveness = results.reduce((sum, r) => sum + r.sybilActivity.attackEffectiveness, 0) / results.length;
    
    return {
      totalNormalActivity,
      totalSybilActivity,
      avgAttackEffectiveness,
      sybilAmplification: totalSybilActivity / totalNormalActivity,
      defenseEffectiveness: 1 - avgAttackEffectiveness
    };
  }
}

// Run simulation
async function runSybilSimulation() {
  const simulator = new AdvancedSybilSimulator({
    numNormalNodes: 200,
    numSybilNodes: 50,
    attackDuration: 1800,
    attackIntensity: 0.75
  });

  const results = await simulator.runSimulation();
  
  // Save results
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').replace('T', '_');
  const resultsPath = `logs/sybil-simulation-results-${timestamp}.json`;
  
  await fs.promises.writeFile(resultsPath, JSON.stringify(results, null, 2));
  console.log(`📊 Simulation results saved to ${resultsPath}`);
  
  return results;
}

// Export for use in other modules
// In a real environment, we would use export, but for this script we'll just run
runSybilSimulation()
  .then(results => {
    console.log("✅ Advanced Sybil Simulation Completed!");
    console.log("📈 Results:", JSON.stringify(results.analysis, null, 2));
  })
  .catch(console.error);
