/**
 * OraSRS 联邦学习模块
 * 用于多节点威胁情报数据的安全聚合
 */

class FederatedLearning {
  constructor(options = {}) {
    this.nodes = new Map(); // 存储联邦节点
    this.localModel = new Map(); // 本地模型数据
    this.aggregatedModel = new Map(); // 聚合模型
    this.federationId = options.federationId || 'default-federation';
    this.privacyBudget = options.privacyBudget || 1.0; // 差分隐私预算
    this.epochs = options.epochs || 10; // 联邦学习轮次
  }

  /**
   * 注册联邦节点
   */
  registerNode(nodeId, nodeConfig) {
    this.nodes.set(nodeId, {
      id: nodeId,
      config: nodeConfig,
      lastSeen: new Date(),
      status: 'active'
    });
    
    console.log(`节点 ${nodeId} 已注册到联邦学习网络`);
  }

  /**
   * 从节点收集本地模型更新
   */
  async collectLocalUpdates(nodeId, localUpdates) {
    if (!this.nodes.has(nodeId)) {
      throw new Error(`节点 ${nodeId} 未注册`);
    }

    // 应用差分隐私保护
    const privatizedUpdates = this.applyDifferentialPrivacy(localUpdates);
    
    // 更新本地模型
    this.localModel.set(nodeId, {
      updates: privatizedUpdates,
      timestamp: new Date(),
      node: nodeId
    });

    console.log(`从节点 ${nodeId} 收集到本地模型更新`);
    return true;
  }

  /**
   * 应用差分隐私保护
   */
  applyDifferentialPrivacy(updates) {
    // 简化的差分隐私实现 - 添加拉普拉斯噪声
    const noiseScale = 1.0 / this.privacyBudget;
    
    const privatizedUpdates = JSON.parse(JSON.stringify(updates)); // 深拷贝
    
    // 为数值类型的更新添加噪声
    for (const [key, value] of Object.entries(privatizedUpdates)) {
      if (typeof value === 'number') {
        const noise = this.laplaceNoise(noiseScale);
        privatizedUpdates[key] = value + noise;
      } else if (Array.isArray(value)) {
        privatizedUpdates[key] = value.map(v => 
          typeof v === 'number' ? v + this.laplaceNoise(noiseScale) : v
        );
      }
    }
    
    return privatizedUpdates;
  }

  /**
   * 生成拉普拉斯噪声
   */
  laplaceNoise(scale) {
    const u = Math.random() - 0.5; // [-0.5, 0.5]
    return -scale * Math.sign(u) * Math.log(1 - 2 * Math.abs(u));
  }

  /**
   * 聚合本地模型更新
   */
  aggregateModels() {
    if (this.localModel.size === 0) {
      console.log('没有本地模型更新可供聚合');
      return null;
    }

    const aggregated = {};
    const nodeCount = this.localModel.size;
    
    // 首先获取所有键
    const allKeys = new Set();
    for (const model of this.localModel.values()) {
      Object.keys(model.updates).forEach(key => allKeys.add(key));
    }

    // 平均聚合
    for (const key of allKeys) {
      let sum = 0;
      let count = 0;
      
      for (const model of this.localModel.values()) {
        if (model.updates[key] !== undefined && typeof model.updates[key] === 'number') {
          sum += model.updates[key];
          count++;
        }
      }
      
      if (count > 0) {
        aggregated[key] = sum / count;
      }
    }

    this.aggregatedModel = new Map(Object.entries(aggregated));
    
    console.log(`聚合了 ${nodeCount} 个节点的模型更新`);
    return aggregated;
  }

  /**
   * 分发全局模型到节点
   */
  async distributeGlobalModel() {
    const model = Object.fromEntries(this.aggregatedModel);
    
    const distributionResults = [];
    
    for (const [nodeId, nodeInfo] of this.nodes) {
      try {
        // 模拟向节点发送模型
        const result = await this.sendModelToNode(nodeId, model);
        distributionResults.push({ nodeId, success: true, timestamp: new Date() });
      } catch (error) {
        distributionResults.push({ nodeId, success: false, error: error.message, timestamp: new Date() });
      }
    }
    
    console.log(`向 ${distributionResults.length} 个节点分发了全局模型`);
    return distributionResults;
  }

  /**
   * 模拟向节点发送模型
   */
  async sendModelToNode(nodeId, model) {
    // 这里应该有实际的网络请求逻辑
    console.log(`向节点 ${nodeId} 发送模型更新`);
    return { success: true, nodeId };
  }

  /**
   * 执行一轮联邦学习
   */
  async federatedRound() {
    console.log('开始执行联邦学习轮次');
    
    // 聚合本地模型
    const aggregatedModel = this.aggregateModels();
    
    if (!aggregatedModel) {
      console.log('无法执行联邦学习轮次：没有可用的本地模型');
      return null;
    }
    
    // 分发全局模型
    const distributionResults = await this.distributeGlobalModel();
    
    console.log('联邦学习轮次完成');
    return {
      round: new Date().toISOString(),
      aggregatedModel,
      distributionResults
    };
  }

  /**
   * 获取联邦学习状态
   */
  getStatus() {
    return {
      federationId: this.federationId,
      nodeCount: this.nodes.size,
      localModelCount: this.localModel.size,
      lastAggregation: this.aggregatedModel.size > 0 ? new Date() : null,
      privacyBudget: this.privacyBudget
    };
  }
}

module.exports = FederatedLearning;