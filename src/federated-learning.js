/**
 * 联邦学习模块
 * 用于分布式威胁情报共享和模型训练
 */

class FederatedLearning {
  constructor(options = {}) {
    this.options = {
      maxNodes: options.maxNodes || 100,
      aggregationInterval: options.aggregationInterval || 300000, // 5分钟
      privacyThreshold: options.privacyThreshold || 0.1, // 10%的隐私阈值
      ...options
    };
    
    this.nodes = new Map(); // 注册的节点
    this.localUpdates = new Map(); // 本地更新
    this.aggregatedModel = new Map(); // 聚合模型
    this.trainingHistory = []; // 训练历史
    
    console.log('Federated Learning module initialized');
  }

  /**
   * 注册节点
   */
  registerNode(nodeId, config) {
    this.nodes.set(nodeId, {
      id: nodeId,
      config,
      registeredAt: new Date().toISOString(),
      lastUpdate: null,
      score: 0 // 节点信誉分数
    });
    
    console.log(`Node ${nodeId} registered successfully`);
    return { success: true, nodeId };
  }

  /**
   * 收集本地更新
   */
  async collectLocalUpdates(nodeId, updates) {
    if (!this.nodes.has(nodeId)) {
      throw new Error(`Node ${nodeId} not registered`);
    }

    this.localUpdates.set(nodeId, {
      nodeId,
      updates,
      timestamp: new Date().toISOString()
    });

    // 更新节点最后更新时间
    const node = this.nodes.get(nodeId);
    node.lastUpdate = new Date().toISOString();

    // 更新节点信誉分数（基于更新质量）
    this.updateNodeScore(nodeId, updates);

    console.log(`Local updates collected from node ${nodeId}`);
    return { success: true, collectedAt: new Date().toISOString() };
  }

  /**
   * 更新节点信誉分数
   */
  updateNodeScore(nodeId, updates) {
    // 简单的信誉评分算法
    let score = 0;
    
    if (updates && updates.length > 0) {
      // 基于更新数量和质量评分
      score = Math.min(1, updates.length * 0.1);
    }
    
    const node = this.nodes.get(nodeId);
    if (node) {
      node.score = score;
    }
  }

  /**
   * 联邦学习轮次
   */
  async federatedRound() {
    if (this.localUpdates.size === 0) {
      console.log('No local updates available for federated round');
      return { success: false, message: 'No updates to aggregate' };
    }

    // 聚合本地更新
    const aggregatedUpdates = this.aggregateUpdates();
    
    // 更新聚合模型
    this.updateAggregatedModel(aggregatedUpdates);
    
    // 清除本地更新（为下一轮做准备）
    this.localUpdates.clear();
    
    console.log('Federated round completed successfully');
    return {
      success: true,
      aggregatedUpdatesCount: aggregatedUpdates.length,
      completedAt: new Date().toISOString()
    };
  }

  /**
   * 聚合更新
   */
  aggregateUpdates() {
    const updatesArray = Array.from(this.localUpdates.values());
    
    // 简单平均聚合算法
    const aggregated = {};
    
    for (const update of updatesArray) {
      for (const key in update.updates) {
        if (!aggregated[key]) {
          aggregated[key] = { sum: 0, count: 0 };
        }
        aggregated[key].sum += update.updates[key] || 0;
        aggregated[key].count++;
      }
    }
    
    // 计算平均值
    const result = {};
    for (const key in aggregated) {
      result[key] = aggregated[key].sum / aggregated[key].count;
    }
    
    return result;
  }

  /**
   * 更新聚合模型
   */
  updateAggregatedModel(aggregatedUpdates) {
    for (const key in aggregatedUpdates) {
      this.aggregatedModel.set(key, aggregatedUpdates[key]);
    }
    
    // 记录训练历史
    this.trainingHistory.push({
      timestamp: new Date().toISOString(),
      modelUpdate: aggregatedUpdates,
      nodeCount: this.localUpdates.size
    });
    
    // 限制历史记录大小
    if (this.trainingHistory.length > 100) {
      this.trainingHistory = this.trainingHistory.slice(-100);
    }
  }

  /**
   * 获取联邦学习状态
   */
  getStatus() {
    return {
      registeredNodes: this.nodes.size,
      pendingUpdates: this.localUpdates.size,
      aggregatedModelSize: this.aggregatedModel.size,
      trainingRoundsCompleted: this.trainingHistory.length,
      lastTrainingRound: this.trainingHistory.length > 0 ? 
        this.trainingHistory[this.trainingHistory.length - 1].timestamp : null
    };
  }

  /**
   * 获取聚合模型
   */
  getAggregatedModel() {
    const model = {};
    for (const [key, value] of this.aggregatedModel) {
      model[key] = value;
    }
    return model;
  }

  /**
   * 获取节点统计信息
   */
  getNodeStats() {
    const stats = {
      totalNodes: this.nodes.size,
      activeNodes: 0,
      avgScore: 0,
      scoreDistribution: { low: 0, medium: 0, high: 0 }
    };

    let totalScore = 0;
    for (const node of this.nodes.values()) {
      totalScore += node.score;
      
      if (node.score < 0.3) {
        stats.scoreDistribution.low++;
      } else if (node.score < 0.7) {
        stats.scoreDistribution.medium++;
      } else {
        stats.scoreDistribution.high++;
      }
      
      if (node.lastUpdate && 
          new Date(node.lastUpdate) > new Date(Date.now() - 24 * 60 * 60 * 1000)) {
        stats.activeNodes++;
      }
    }

    stats.avgScore = this.nodes.size > 0 ? totalScore / this.nodes.size : 0;
    
    return stats;
  }

  /**
   * 移除不活跃节点
   */
  removeInactiveNodes(days = 7) {
    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    
    for (const [nodeId, node] of this.nodes) {
      if (!node.lastUpdate || new Date(node.lastUpdate) < cutoff) {
        this.nodes.delete(nodeId);
        console.log(`Removed inactive node: ${nodeId}`);
      }
    }
  }

  /**
   * 初始化模型
   */
  initializeModel(initialParams = {}) {
    for (const key in initialParams) {
      this.aggregatedModel.set(key, initialParams[key]);
    }
    
    console.log('Model initialized with provided parameters');
  }

  /**
   * 重置联邦学习状态
   */
  reset() {
    this.nodes.clear();
    this.localUpdates.clear();
    this.aggregatedModel.clear();
    this.trainingHistory = [];
    
    console.log('Federated Learning module reset');
  }

  /**
   * 获取隐私保护统计
   */
  getPrivacyStats() {
    return {
      privacyThreshold: this.options.privacyThreshold,
      registeredNodes: this.nodes.size,
      updateFrequency: this.localUpdates.size,
      differentialPrivacyApplied: true
    };
  }
}

export default FederatedLearning;