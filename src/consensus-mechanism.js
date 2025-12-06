/**
 * Consensus Mechanism Module for OraSRS
 * 实现节点质押、共识验证和BFT共识机制
 */

class ConsensusMechanism {
  constructor(options = {}) {
    this.options = {
      minStakeAmount: options.minStakeAmount || 100, // 最小质押金额
      maxStakeAmount: options.maxStakeAmount || 10000, // 最大质押金额
      consensusNodesRequired: options.consensusNodesRequired || 3, // 共识节点数量
      reputationThreshold: options.reputationThreshold || 70, // 声誉阈值
      verificationTimeout: options.verificationTimeout || 30000, // 验证超时时间
      ...options
    };
    
    this.nodes = new Map();
    this.stakes = new Map();
    this.reputation = new Map();
    this.challenges = new Map();
    this.verificationQueue = [];
    
    console.log('Consensus Mechanism module initialized');
  }

  /**
   * 节点质押
   */
  stake(nodeId, amount, identityInfo) {
    // 验证质押金额
    if (amount < this.options.minStakeAmount) {
      throw new Error(`Stake amount ${amount} below minimum ${this.options.minStakeAmount}`);
    }
    
    if (amount > this.options.maxStakeAmount) {
      throw new Error(`Stake amount ${amount} exceeds maximum ${this.options.maxStakeAmount}`);
    }
    
    // 验证身份信息
    if (!this.validateIdentityInfo(identityInfo)) {
      throw new Error('Invalid identity information for staking');
    }
    
    // 检查节点是否已存在
    if (this.nodes.has(nodeId)) {
      const existingNode = this.nodes.get(nodeId);
      if (existingNode.status === 'staked') {
        // 增加质押金额
        this.stakes.set(nodeId, this.stakes.get(nodeId) + amount);
        existingNode.totalStake = this.stakes.get(nodeId);
      } else {
        // 更新节点信息
        this.stakes.set(nodeId, amount);
        existingNode.status = 'staked';
        existingNode.totalStake = amount;
      }
    } else {
      // 创建新节点
      const newNode = {
        id: nodeId,
        ...identityInfo,
        status: 'staked',
        totalStake: amount,
        joinDate: new Date().toISOString(),
        lastActivity: new Date().toISOString(),
        reputation: 50, // 新节点初始声誉
        verificationCount: 0,
        challenges: 0,
        challengeSuccesses: 0
      };
      
      this.nodes.set(nodeId, newNode);
      this.stakes.set(nodeId, amount);
      this.reputation.set(nodeId, 50);
    }
    
    // 记录质押事件
    this.logConsensusEvent('stake', {
      nodeId,
      amount,
      identityInfo
    });
    
    return {
      success: true,
      message: `Node ${nodeId} staked successfully with amount ${amount}`,
      node: this.nodes.get(nodeId)
    };
  }

  /**
   * 验证身份信息
   */
  validateIdentityInfo(identityInfo) {
    if (!identityInfo || typeof identityInfo !== 'object') {
      return false;
    }
    
    // 必需字段检查
    const requiredFields = ['organization', 'contact', 'location', 'nodeType'];
    for (const field of requiredFields) {
      if (!identityInfo[field]) {
        return false;
      }
    }
    
    // 验证节点类型
    const validNodeTypes = ['edge', 'consensus', 'intelligence'];
    if (!validNodeTypes.includes(identityInfo.nodeType)) {
      return false;
    }
    
    return true;
  }

  /**
   * 获取节点状态
   */
  getNodeStatus(nodeId) {
    const node = this.nodes.get(nodeId);
    if (!node) {
      return { exists: false, message: `Node ${nodeId} does not exist` };
    }
    
    const status = {
      exists: true,
      node: {
        id: node.id,
        status: node.status,
        totalStake: this.stakes.get(nodeId) || 0,
        reputation: this.reputation.get(nodeId) || node.reputation,
        verificationCount: node.verificationCount,
        challenges: node.challenges,
        challengeSuccesses: node.challengeSuccesses,
        joinDate: node.joinDate,
        lastActivity: node.lastActivity
      }
    };
    
    return status;
  }

  /**
   * 获取共识节点列表
   */
  getConsensusNodes() {
    // 返回质押状态为活跃且声誉达到阈值的节点
    return Array.from(this.nodes.values())
      .filter(node => node.status === 'staked' && 
                   (this.reputation.get(node.id) || node.reputation) >= this.options.reputationThreshold)
      .sort((a, b) => (this.reputation.get(b.id) || b.reputation) - (this.reputation.get(a.id) || a.reputation))
      .slice(0, this.options.consensusNodesRequired * 2); // 返回多一些以供选择
  }

  /**
   * 更新节点声誉
   */
  updateNodeReputation(nodeId, performanceData) {
    if (!this.nodes.has(nodeId)) {
      throw new Error(`Node ${nodeId} does not exist`);
    }
    
    const node = this.nodes.get(nodeId);
    let currentReputation = this.reputation.get(nodeId) || node.reputation;
    
    // 基于性能数据更新声誉
    let reputationChange = 0;
    
    // 验证准确性
    if (performanceData.verificationAccuracy !== undefined) {
      // 准确性高于90%奖励声誉，低于70%扣除声誉
      if (performanceData.verificationAccuracy > 0.9) {
        reputationChange += 5;
      } else if (performanceData.verificationAccuracy > 0.8) {
        reputationChange += 3;
      } else if (performanceData.verificationAccuracy < 0.7) {
        reputationChange -= 5;
      } else if (performanceData.verificationAccuracy < 0.8) {
        reputationChange -= 2;
      }
    }
    
    // 响应时间
    if (performanceData.responseTimeMs !== undefined) {
      // 响应时间少于500ms奖励声誉，超过2000ms扣除声誉
      if (performanceData.responseTimeMs < 500) {
        reputationChange += 2;
      } else if (performanceData.responseTimeMs > 2000) {
        reputationChange -= 3;
      }
    }
    
    // 在线时间
    if (performanceData.uptimePercentage !== undefined) {
      // 在线率高于95%奖励声誉，低于80%扣除声誉
      if (performanceData.uptimePercentage > 95) {
        reputationChange += 3;
      } else if (performanceData.uptimePercentage < 80) {
        reputationChange -= 4;
      }
    }
    
    // 合规性
    if (performanceData.complianceScore !== undefined) {
      if (performanceData.complianceScore > 0.9) {
        reputationChange += 4;
      } else if (performanceData.complianceScore < 0.7) {
        reputationChange -= 6;
      }
    }
    
    // 更新声誉（限制在0-100之间）
    const newReputation = Math.max(0, Math.min(100, currentReputation + reputationChange));
    this.reputation.set(nodeId, newReputation);
    
    // 更新节点记录
    node.lastActivity = new Date().toISOString();
    if (performanceData.verificationCount) {
      node.verificationCount += performanceData.verificationCount;
    }
    
    // 记录声誉更新事件
    this.logConsensusEvent('reputation_update', {
      nodeId,
      oldReputation: currentReputation,
      newReputation,
      reputationChange,
      performanceData
    });
    
    return {
      success: true,
      message: `Reputation updated for node ${nodeId}`,
      nodeId,
      oldReputation: currentReputation,
      newReputation,
      reputationChange
    };
  }

  /**
   * 执行BFT共识
   */
  performBFTConsensus(data, callback) {
    // 获取活跃的共识节点
    const consensusNodes = this.getConsensusNodes();
    
    if (consensusNodes.length < this.options.consensusNodesRequired) {
      throw new Error(`Insufficient consensus nodes. Required: ${this.options.consensusNodesRequired}, Available: ${consensusNodes.length}`);
    }
    
    // 选择指定数量的节点进行共识
    const selectedNodes = consensusNodes.slice(0, this.options.consensusNodesRequired);
    
    // 创建共识任务
    const consensusTask = {
      id: `consensus_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
      data,
      nodes: selectedNodes.map(node => node.id),
      status: 'in_progress',
      votes: new Map(),
      startedAt: new Date().toISOString(),
      results: null
    };
    
    // 启动共识过程
    this.executeConsensusProcess(consensusTask, callback);
    
    return {
      taskId: consensusTask.id,
      message: `BFT consensus initiated with ${selectedNodes.length} nodes`,
      nodes: selectedNodes.map(node => ({ id: node.id, reputation: node.reputation }))
    };
  }

  /**
   * 执行共识过程
   */
  async executeConsensusProcess(consensusTask, callback) {
    try {
      // 模拟向各节点发送共识请求
      const verificationPromises = consensusTask.nodes.map(nodeId => {
        return this.requestNodeVerification(nodeId, consensusTask);
      });
      
      // 等待所有节点的验证结果
      const verificationResults = await Promise.allSettled(verificationPromises);
      
      // 收集结果
      verificationResults.forEach((result, index) => {
        const nodeId = consensusTask.nodes[index];
        if (result.status === 'fulfilled') {
          consensusTask.votes.set(nodeId, result.value);
        } else {
          console.error(`Node ${nodeId} failed to provide verification:`, result.reason);
          consensusTask.votes.set(nodeId, { error: result.reason.message });
        }
      });
      
      // 计算共识结果
      const consensusResult = this.calculateConsensusResult(consensusTask);
      consensusTask.results = consensusResult;
      consensusTask.status = 'completed';
      
      // 更新参与节点的声誉
      this.updateParticipatingNodesReputation(consensusTask);
      
      // 执行回调
      if (callback && typeof callback === 'function') {
        callback(null, consensusResult);
      }
      
      // 记录共识事件
      this.logConsensusEvent('consensus_completed', {
        taskId: consensusTask.id,
        result: consensusResult,
        nodes: consensusTask.nodes
      });
      
    } catch (error) {
      consensusTask.status = 'failed';
      consensusTask.error = error.message;
      
      if (callback && typeof callback === 'function') {
        callback(error, null);
      }
      
      // 记录错误事件
      this.logConsensusEvent('consensus_failed', {
        taskId: consensusTask.id,
        error: error.message
      });
    }
  }

  /**
   * 请求节点验证
   */
  requestNodeVerification(nodeId, consensusTask) {
    return new Promise((resolve, reject) => {
      // 模拟节点验证过程
      const node = this.nodes.get(nodeId);
      if (!node) {
        reject(new Error(`Node ${nodeId} not found`));
        return;
      }
      
      // 模拟验证延迟
      const delay = Math.random() * 1000 + 100; // 100-1100ms延迟
      
      setTimeout(() => {
        try {
          // 模拟验证过程 - 基于节点声誉和随机因素
          const nodeReputation = this.reputation.get(nodeId) || node.reputation;
          const successRate = nodeReputation / 100;
          
          if (Math.random() < successRate) {
            // 验证成功
            resolve({
              nodeId,
              status: 'verified',
              result: this.generateVerificationResult(consensusTask, node),
              timestamp: new Date().toISOString(),
              responseTime: delay
            });
          } else {
            // 验证失败
            reject(new Error(`Node ${nodeId} verification failed`));
          }
        } catch (error) {
          reject(error);
        }
      }, delay);
    });
  }

  /**
   * 生成验证结果
   */
  generateVerificationResult(consensusTask, node) {
    // 基于任务数据和节点特性生成验证结果
    return {
      verified: true,
      confidence: Math.random() * 0.3 + 0.7, // 70-100%置信度
      details: {
        matchedPatterns: Math.floor(Math.random() * 5) + 1,
        signatureVerified: true,
        dataIntegrity: true
      }
    };
  }

  /**
   * 计算共识结果
   */
  calculateConsensusResult(consensusTask) {
    const votes = Array.from(consensusTask.votes.values())
      .filter(vote => vote.status === 'verified');
    
    if (votes.length === 0) {
      return {
        consensus: false,
        reason: 'No valid votes received',
        totalVotes: consensusTask.votes.size,
        validVotes: 0
      };
    }
    
    // 检查是否达成共识（超过2/3的验证节点同意）
    const requiredVotes = Math.ceil(consensusTask.nodes.length * 2 / 3);
    const successfulVerifications = votes.length;
    
    const consensusAchieved = successfulVerifications >= requiredVotes;
    
    // 计算平均置信度
    const avgConfidence = votes.reduce((sum, vote) => sum + vote.result.confidence, 0) / votes.length;
    
    return {
      consensus: consensusAchieved,
      result: consensusAchieved ? 'confirmed' : 'inconclusive',
      requiredVotes,
      successfulVerifications,
      totalEligibleVotes: consensusTask.nodes.length,
      avgConfidence,
      votes: votes.map(vote => ({
        nodeId: vote.nodeId,
        result: vote.result,
        confidence: vote.result.confidence
      }))
    };
  }

  /**
   * 更新参与节点的声誉
   */
  updateParticipatingNodesReputation(consensusTask) {
    for (const [nodeId, vote] of consensusTask.votes.entries()) {
      if (vote.status === 'verified') {
        // 成功参与共识的节点增加声誉
        this.updateNodeReputation(nodeId, {
          verificationAccuracy: vote.result.confidence,
          responseTimeMs: vote.responseTime,
          verificationCount: 1
        });
      } else if (vote.error) {
        // 验证失败的节点减少声誉
        this.updateNodeReputation(nodeId, {
          verificationAccuracy: 0,
          verificationCount: 1
        });
      }
    }
  }

  /**
   * 提交节点挑战
   */
  submitChallenge(challengeId, nodeId, challengerId, challengeData) {
    if (!this.nodes.has(nodeId)) {
      throw new Error(`Node ${nodeId} does not exist`);
    }
    
    if (!this.nodes.has(challengerId)) {
      throw new Error(`Challenger ${challengerId} does not exist`);
    }
    
    // 创建挑战记录
    const challenge = {
      id: challengeId,
      nodeId,
      challengerId,
      challengeData,
      status: 'pending',
      submittedAt: new Date().toISOString(),
      resolvedAt: null,
      resolution: null,
      votes: {
        challengeSuccess: 0,
        challengeFailed: 0
      },
      evidence: challengeData.evidence || []
    };
    
    this.challenges.set(challengeId, challenge);
    
    // 更新被挑战节点的挑战计数
    const node = this.nodes.get(nodeId);
    node.challenges++;
    
    // 记录挑战事件
    this.logConsensusEvent('challenge_submitted', {
      challengeId,
      nodeId,
      challengerId,
      challengeData
    });
    
    return {
      success: true,
      message: `Challenge ${challengeId} submitted against node ${nodeId}`,
      challenge
    };
  }

  /**
   * 解决挑战
   */
  resolveChallenge(challengeId, resolutionData) {
    const challenge = this.challenges.get(challengeId);
    if (!challenge) {
      throw new Error(`Challenge ${challengeId} does not exist`);
    }
    
    if (challenge.status !== 'pending') {
      throw new Error(`Challenge ${challengeId} is not in pending status`);
    }
    
    // 确定挑战结果
    const challengeSuccessful = resolutionData.success || false;
    
    // 更新挑战记录
    challenge.status = 'resolved';
    challenge.resolvedAt = new Date().toISOString();
    challenge.resolution = resolutionData;
    
    // 更新被挑战节点的声誉和记录
    if (challengeSuccessful) {
      // 挑战成功，降低被挑战节点声誉
      this.updateNodeReputation(challenge.nodeId, {
        verificationAccuracy: 0.1, // 严重降低声誉
        verificationCount: 1
      });
      
      // 挑战者声誉增加
      this.updateNodeReputation(challenge.challengerId, {
        verificationAccuracy: 0.9,
        verificationCount: 1
      });
      
      // 更新节点挑战成功计数
      const node = this.nodes.get(challenge.nodeId);
      node.challengeSuccesses++;
    } else {
      // 挑战失败，挑战者声誉降低
      this.updateNodeReputation(challenge.challengerId, {
        verificationAccuracy: 0.3,
        verificationCount: 1
      });
    }
    
    // 记录解决挑战事件
    this.logConsensusEvent('challenge_resolved', {
      challengeId,
      nodeId: challenge.nodeId,
      challengerId: challenge.challengerId,
      resolution: resolutionData,
      successful: challengeSuccessful
    });
    
    return {
      success: true,
      message: `Challenge ${challengeId} resolved`,
      challenge,
      challengeSuccessful
    };
  }

  /**
   * 获取节点统计数据
   */
  getNodeStats(nodeId) {
    const node = this.nodes.get(nodeId);
    if (!node) {
      return null;
    }
    
    return {
      nodeId,
      status: node.status,
      totalStake: this.stakes.get(nodeId) || 0,
      reputation: this.reputation.get(nodeId) || node.reputation,
      verificationCount: node.verificationCount,
      challenges: node.challenges,
      challengeSuccesses: node.challengeSuccesses,
      successRate: node.verificationCount > 0 ? 
        (node.challengeSuccesses / node.verificationCount * 100).toFixed(2) + '%' : '0%',
      joinDate: node.joinDate,
      lastActivity: node.lastActivity
    };
  }

  /**
   * 获取共识网络统计
   */
  getNetworkStats() {
    const allNodes = Array.from(this.nodes.values());
    const stakedNodes = allNodes.filter(node => node.status === 'staked');
    const activeNodes = stakedNodes.filter(node => 
      (this.reputation.get(node.id) || node.reputation) >= this.options.reputationThreshold
    );
    
    const totalStake = Array.from(this.stakes.values()).reduce((sum, stake) => sum + stake, 0);
    const avgReputation = allNodes.length > 0 ? 
      allNodes.reduce((sum, node) => sum + (this.reputation.get(node.id) || node.reputation), 0) / allNodes.length : 0;
    
    return {
      totalNodes: allNodes.length,
      stakedNodes: stakedNodes.length,
      activeNodes: activeNodes.length,
      totalStake,
      averageReputation: avgReputation.toFixed(2),
      challenges: this.challenges.size,
      pendingChallenges: Array.from(this.challenges.values()).filter(c => c.status === 'pending').length,
      requiredConsensusNodes: this.options.consensusNodesRequired
    };
  }

  /**
   * 记录共识事件
   */
  logConsensusEvent(eventType, details) {
    const event = {
      id: `consensus_event_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
      eventType,
      details,
      timestamp: new Date().toISOString()
    };
    
    // 在实际实现中，这里会将事件记录到共识日志
    console.log(`[CONSENSUS] ${JSON.stringify(event)}`);
    
    return event;
  }

  /**
   * 获取共识报告
   */
  getConsensusReport() {
    const networkStats = this.getNetworkStats();
    
    const report = {
      timestamp: new Date().toISOString(),
      network: networkStats,
      consensusMechanism: {
        type: 'BFT (Byzantine Fault Tolerant)',
        requiredNodes: this.options.consensusNodesRequired,
        reputationThreshold: this.options.reputationThreshold,
        minStake: this.options.minStakeAmount,
        maxStake: this.options.maxStakeAmount
      },
      topPerformingNodes: this.getTopPerformingNodes(5),
      recentChallenges: this.getRecentChallenges(10),
      securityMetrics: this.getSecurityMetrics()
    };
    
    return report;
  }

  /**
   * 获取表现最佳的节点
   */
  getTopPerformingNodes(limit = 5) {
    return Array.from(this.nodes.values())
      .filter(node => node.status === 'staked')
      .sort((a, b) => (this.reputation.get(b.id) || b.reputation) - (this.reputation.get(a.id) || a.reputation))
      .slice(0, limit)
      .map(node => ({
        id: node.id,
        reputation: this.reputation.get(node.id) || node.reputation,
        verificationCount: node.verificationCount,
        challenges: node.challenges,
        challengeSuccesses: node.challengeSuccesses
      }));
  }

  /**
   * 获取近期挑战
   */
  getRecentChallenges(limit = 10) {
    return Array.from(this.challenges.values())
      .sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt))
      .slice(0, limit)
      .map(challenge => ({
        id: challenge.id,
        nodeId: challenge.nodeId,
        challengerId: challenge.challengerId,
        status: challenge.status,
        submittedAt: challenge.submittedAt,
        resolvedAt: challenge.resolvedAt
      }));
  }

  /**
   * 获取安全指标
   */
  getSecurityMetrics() {
    const allNodes = Array.from(this.nodes.values());
    const verifiedNodes = allNodes.filter(node => 
      (this.reputation.get(node.id) || node.reputation) >= this.options.reputationThreshold
    );
    
    return {
      networkSecurityScore: this.calculateNetworkSecurityScore(),
      nodeVerificationRate: allNodes.length > 0 ? 
        (verifiedNodes.length / allNodes.length * 100).toFixed(2) + '%' : '0%',
      averageNodeReputation: this.getAverageNodeReputation(),
      totalChallengesResolved: Array.from(this.challenges.values()).filter(c => c.status === 'resolved').length,
      challengeSuccessRate: this.challenges.size > 0 ? 
        (Array.from(this.challenges.values()).filter(c => 
          c.status === 'resolved' && c.resolution?.success
        ).length / this.challenges.size * 100).toFixed(2) + '%' : '0%'
    };
  }

  /**
   * 计算网络安全评分
   */
  calculateNetworkSecurityScore() {
    const allNodes = Array.from(this.nodes.values());
    if (allNodes.length === 0) return 0;
    
    const totalReputation = allNodes.reduce((sum, node) => 
      sum + (this.reputation.get(node.id) || node.reputation), 0);
    
    return (totalReputation / allNodes.length).toFixed(2);
  }

  /**
   * 获取平均节点声誉
   */
  getAverageNodeReputation() {
    const allNodes = Array.from(this.nodes.values());
    if (allNodes.length === 0) return 0;
    
    const totalReputation = allNodes.reduce((sum, node) => 
      sum + (this.reputation.get(node.id) || node.reputation), 0);
    
    return (totalReputation / allNodes.length).toFixed(2);
  }

  /**
   * 验证共识配置
   */
  validateConsensusConfig() {
    const config = {
      minStakeAmount: this.options.minStakeAmount,
      maxStakeAmount: this.options.maxStakeAmount,
      consensusNodesRequired: this.options.consensusNodesRequired,
      reputationThreshold: this.options.reputationThreshold,
      verificationTimeout: this.options.verificationTimeout
    };
    
    const isValid = config.minStakeAmount > 0 &&
                   config.maxStakeAmount > config.minStakeAmount &&
                   config.consensusNodesRequired >= 3 &&
                   config.reputationThreshold >= 0 &&
                   config.reputationThreshold <= 100 &&
                   config.verificationTimeout > 0;
    
    return {
      isValid,
      config,
      validationErrors: isValid ? [] : this.getValidationErrors(config)
    };
  }

  /**
   * 获取验证错误
   */
  getValidationErrors(config) {
    const errors = [];
    
    if (config.minStakeAmount <= 0) errors.push('minStakeAmount must be positive');
    if (config.maxStakeAmount <= config.minStakeAmount) errors.push('maxStakeAmount must be greater than minStakeAmount');
    if (config.consensusNodesRequired < 3) errors.push('consensusNodesRequired must be at least 3 for BFT');
    if (config.reputationThreshold < 0 || config.reputationThreshold > 100) errors.push('reputationThreshold must be between 0 and 100');
    if (config.verificationTimeout <= 0) errors.push('verificationTimeout must be positive');
    
    return errors;
  }
}

module.exports = ConsensusMechanism;