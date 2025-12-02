/**
 * OraSRS 共识与质押机制模块
 * 实现增强型共识与质押机制（根层 + 分区层）
 */

const crypto = require('crypto');

class ConsensusMechanism {
  constructor(options = {}) {
    // 共识参数配置
    this.minStakeAmount = options.minStakeAmount || 10000; // 最小质押门槛: ≥ 10,000 ORA
    this.maxConsensusNodes = options.maxConsensusNodes || 21; // 最大共识节点数（根层）: 21
    this.stakeLockPeriod = options.stakeLockPeriod || 7 * 24 * 60 * 60 * 1000; // 质押锁定期: 7天
    this.slashPenaltyRate = options.slashPenaltyRate || 1.0; // 作恶行为罚没比例: 100%
    this.offlinePenaltyRate = options.offlinePenaltyRate || 0.05; // 离线罚没比例: 5%/天
    
    // 节点存储
    this.nodes = new Map(); // 存储节点信息
    this.consensusNodes = new Set(); // 存储共识节点ID
    this.reputationRegistry = new Map(); // 声誉注册表
    
    // 初始化关键服务白名单
    this.initializeCriticalServiceWhitelist();
  }

  /**
   * 初始化关键服务白名单
   */
  initializeCriticalServiceWhitelist() {
    this.criticalServiceWhitelist = new Set([
      '.gov',
      '.mil',
      '.edu',
      'who.int',
      'swift.com',
      'federalreserve.gov',
      '192.168.1.1',
      '8.8.8.8',
      '1.1.1.1'
    ]);
  }

  /**
   * 节点质押
   */
  stake(nodeId, amount, identityInfo) {
    // 验证质押金额
    if (amount < this.minStakeAmount) {
      throw new Error(`质押金额不足，最小质押门槛为 ${this.minStakeAmount} ORA`);
    }

    // 验证身份信息（企业实名认证 + 区块链备案）
    if (!this.validateIdentity(identityInfo)) {
      throw new Error('身份验证失败，节点需完成企业实名认证和区块链备案');
    }

    // 检查节点是否已存在
    if (this.nodes.has(nodeId)) {
      // 如果已存在，增加质押金额
      const node = this.nodes.get(nodeId);
      node.stakeAmount += amount;
      node.stakeStart = new Date();
      
      // 如果节点声誉足够高，可以参与共识
      if (node.reputation >= 80 && this.consensusNodes.size < this.maxConsensusNodes) {
        this.consensusNodes.add(nodeId);
      }
    } else {
      // 创建新节点
      const newNode = {
        id: nodeId,
        stakeAmount: amount,
        stakeStart: new Date(),
        identityInfo: identityInfo,
        status: 'active', // active, slashed, offline
        reputation: 100, // 初始声誉分数
        uptime: 0.99, // 初始在线率
        correctValidations: 0, // 正确验证次数
        totalValidations: 0, // 总验证次数
        lastSeen: new Date(),
        challengeResponseTime: 0, // 平均挑战响应时间
        threatIntelCount: 0, // 提交威胁情报数量
        joinDate: new Date()
      };
      
      this.nodes.set(nodeId, newNode);
      
      // 初始化声誉
      this.reputationRegistry.set(nodeId, 100);
      
      // 如果满足条件，添加到共识节点
      if (this.consensusNodes.size < this.maxConsensusNodes) {
        this.consensusNodes.add(nodeId);
      }
    }

    console.log(`节点 ${nodeId} 质押 ${amount} ORA 成功`);
    return { success: true, nodeId, stakeAmount: this.nodes.get(nodeId).stakeAmount };
  }

  /**
   * 验证节点身份
   */
  validateIdentity(identityInfo) {
    // 检查是否包含必要的身份信息
    if (!identityInfo) {
      return false;
    }
    
    // 检查企业营业执照
    if (!identityInfo.businessLicense) {
      return false;
    }
    
    // 检查区块链服务备案号
    if (!identityInfo.blockchainFilingNumber) {
      return false;
    }
    
    // 检查是否通过OraSRS节点能力测试
    if (!identityInfo.passedNodeTest) {
      return false;
    }
    
    // 这里可以进一步验证营业执照和备案号的有效性
    // 在实际实现中，需要对接国家网信办备案系统API
    
    return true;
  }

  /**
   * 计算声誉分数
   */
  calculateReputation(nodeId) {
    const node = this.nodes.get(nodeId);
    if (!node) {
      return 0;
    }

    const base = 100;
    
    // 在线率（权重 30%）
    const uptimeScore = Math.min(1.0, node.uptime / 0.95) * 30;
    
    // 验证正确率（权重 40%）
    const accuracyScore = node.totalValidations > 0 
      ? (node.correctValidations / node.totalValidations) * 40 
      : 0;
    
    // 挑战响应速度（权重 20%）
    const latencyScore = Math.max(0, 20 - (node.challengeResponseTime / 10));
    
    // 社区贡献（权重 10%）
    const contributionScore = node.threatIntelCount * 0.1;
    
    const reputation = base + uptimeScore + accuracyScore + latencyScore + contributionScore;
    
    // 更新声誉注册表
    this.reputationRegistry.set(nodeId, reputation);
    
    // 更新节点声誉
    node.reputation = reputation;
    
    return reputation;
  }

  /**
   * 更新节点声誉
   */
  updateNodeReputation(nodeId, performanceData) {
    const node = this.nodes.get(nodeId);
    if (!node) {
      throw new Error(`节点 ${nodeId} 不存在`);
    }

    // 更新性能数据
    if (performanceData.uptime !== undefined) {
      node.uptime = performanceData.uptime;
    }
    
    if (performanceData.correct !== undefined) {
      node.correctValidations += performanceData.correct ? 1 : 0;
      node.totalValidations += 1;
    }
    
    if (performanceData.challengeResponseTime !== undefined) {
      // 更新平均挑战响应时间
      node.challengeResponseTime = 
        (node.challengeResponseTime + performanceData.challengeResponseTime) / 2;
    }
    
    if (performanceData.submittedThreatIntel) {
      node.threatIntelCount += 1;
    }

    // 计算新的声誉分数
    const newReputation = this.calculateReputation(nodeId);

    // 根据声誉分数调整节点状态
    this.applyReputationRules(nodeId, newReputation);

    return newReputation;
  }

  /**
   * 应用声誉规则
   */
  applyReputationRules(nodeId, reputation) {
    const node = this.nodes.get(nodeId);
    if (!node) return;

    if (reputation < 80) {
      // 禁止参与共识，仅可作边缘缓存节点
      this.consensusNodes.delete(nodeId);
      console.log(`节点 ${nodeId} 因声誉分数 < 80，已从共识节点中移除`);
    } else if (reputation > 120) {
      // 降低质押门槛 20%，提高收益分成（这里只记录状态）
      node.rewardsBonus = 0.2; // 20% 收益奖励
      console.log(`节点 ${nodeId} 因声誉分数 > 120，获得 20% 收益奖励`);
    }

    if (reputation < 60) {
      // 记录低声誉状态
      if (!node.lowReputationDays) {
        node.lowReputationDays = 1;
      } else {
        node.lowReputationDays += 1;
      }

      // 连续7天声誉 < 60，触发节点剔除流程
      if (node.lowReputationDays >= 7) {
        this.initiateNodeRemoval(nodeId);
      }
    } else {
      // 重置连续低声誉天数
      node.lowReputationDays = 0;
    }
  }

  /**
   * 启动节点移除流程
   */
  initiateNodeRemoval(nodeId) {
    const node = this.nodes.get(nodeId);
    if (!node) return;

    console.log(`节点 ${nodeId} 连续7天声誉 < 60，启动剔除流程`);
    
    // 从共识节点中移除
    this.consensusNodes.delete(nodeId);
    
    // 标记为待移除状态
    node.status = 'pending_removal';
  }

  /**
   * 处理节点下线
   */
  handleNodeOffline(nodeId) {
    const node = this.nodes.get(nodeId);
    if (!node) return;

    const now = new Date();
    const daysOffline = (now - node.lastSeen) / (24 * 60 * 60 * 1000);

    if (daysOffline > 1) { // 离线超过24小时
      // 计算罚没金额
      const penaltyDays = Math.floor(daysOffline);
      const penaltyAmount = node.stakeAmount * this.offlinePenaltyRate * penaltyDays;
      
      // 扣除质押金
      node.stakeAmount = Math.max(0, node.stakeAmount - penaltyAmount);
      
      console.log(`节点 ${nodeId} 离线 ${penaltyDays} 天，罚没 ${penaltyAmount} ORA`);
      
      // 如果质押金归零，移除节点
      if (node.stakeAmount <= 0) {
        this.removeNode(nodeId);
      }
    }

    node.status = 'offline';
  }

  /**
   * 处理节点作恶行为
   */
  handleMaliciousBehavior(nodeId) {
    const node = this.nodes.get(nodeId);
    if (!node) return;

    // 100% 罚没质押金
    const penaltyAmount = node.stakeAmount * this.slashPenaltyRate;
    node.stakeAmount = 0;
    
    console.log(`节点 ${nodeId} 作恶，罚没全部质押金 ${penaltyAmount} ORA`);
    
    // 移除节点
    this.removeNode(nodeId);
  }

  /**
   * 移除节点
   */
  removeNode(nodeId) {
    this.nodes.delete(nodeId);
    this.consensusNodes.delete(nodeId);
    this.reputationRegistry.delete(nodeId);
    
    console.log(`节点 ${nodeId} 已被移除`);
  }

  /**
   * 获取节点状态
   */
  getNodeStatus(nodeId) {
    const node = this.nodes.get(nodeId);
    if (!node) {
      return null;
    }

    return {
      id: node.id,
      stakeAmount: node.stakeAmount,
      status: node.status,
      reputation: node.reputation,
      uptime: node.uptime,
      correctValidations: node.correctValidations,
      totalValidations: node.totalValidations,
      threatIntelCount: node.threatIntelCount,
      isConsensusNode: this.consensusNodes.has(nodeId)
    };
  }

  /**
   * 获取共识节点列表
   */
  getConsensusNodes() {
    const nodes = [];
    for (const nodeId of this.consensusNodes) {
      const node = this.getNodeStatus(nodeId);
      if (node) {
        nodes.push(node);
      }
    }
    return nodes;
  }

  /**
   * 获取所有节点状态
   */
  getAllNodesStatus() {
    const nodes = [];
    for (const [nodeId, node] of this.nodes) {
      nodes.push(this.getNodeStatus(nodeId));
    }
    return nodes;
  }

  /**
   * 执行BFT共识投票
   */
  performBFTConsensus(data, callback) {
    // 获取当前共识节点
    const consensusNodes = this.getConsensusNodes();
    
    // 检查共识节点数量是否满足BFT要求 (n > 3f, f为恶意节点数量)
    // 对于21个节点，最多允许 floor((21-1)/3) = 6 个恶意节点
    if (consensusNodes.length < 4) {
      throw new Error('共识节点数量不足，无法执行BFT共识');
    }

    // 模拟共识过程（在实际实现中，这里应该是Tendermint或其他BFT算法）
    const totalNodes = consensusNodes.length;
    const requiredVotes = Math.floor((totalNodes * 2) / 3) + 1; // 2/3 + 1 多数

    // 模拟投票过程
    let yesVotes = 0;
    let noVotes = 0;

    for (const node of consensusNodes) {
      // 模拟节点投票（实际中这应该基于节点对数据的验证）
      // 考虑节点声誉，声誉高的节点投票权重可能更高
      const vote = this.getNodeVote(node, data);
      if (vote) {
        yesVotes++;
      } else {
        noVotes++;
      }
    }

    const result = {
      data: data,
      totalVotes: totalNodes,
      yesVotes: yesVotes,
      noVotes: noVotes,
      consensusAchieved: yesVotes >= requiredVotes,
      requiredVotes: requiredVotes
    };

    if (callback && typeof callback === 'function') {
      callback(result);
    }

    return result;
  }

  /**
   * 获取节点投票（模拟）
   */
  getNodeVote(node, data) {
    // 基于节点声誉和历史表现的投票决策
    // 在实际实现中，这里应该包含对数据的实际验证
    if (node.reputation < 80) {
      // 声誉低的节点投票权降低或不参与投票
      return Math.random() > 0.5; // 模拟投票
    }
    
    // 随机模拟投票（实际中基于数据验证结果）
    return Math.random() > 0.3; // 倾向于投票同意
  }

  /**
   * 缓存挑战机制
   */
  async processCacheChallenge(cacheNodeId, dataHash) {
    // 检查是否有至少3个独立节点质疑缓存数据
    const质疑nodes = this.getNodesThatChallenged(cacheNodeId, dataHash);
    
    if (质疑nodes.length >= 3) {
      // 向根层提交验证请求
      const verificationResult = await this.verifyDataAtRootLevel(cacheNodeId, dataHash);
      
      if (!verificationResult.valid) {
        // 挑战成功 - 罚没缓存节点保证金
        const node = this.nodes.get(cacheNodeId);
        if (node) {
          const penalty = node.stakeAmount * 0.5; // 罚没50%保证金
          node.stakeAmount -= penalty;
          
          console.log(`缓存挑战成功，节点 ${cacheNodeId} 被罚没 ${penalty} ORA`);
        }
        
        // 奖励挑战者
        const reward = penalty * 0.8; // 挑战者获得80%罚没金额
        for (const challengerId of 质疑nodes.slice(0, 3)) { // 最多前三名挑战者
          const challenger = this.nodes.get(challengerId);
          if (challenger) {
            challenger.stakeAmount += reward / 3; // 平分奖励
          }
        }
        
        console.log(`挑战者获得奖励，总计 ${reward} ORA`);
      }
      
      return {
        challengeSuccessful: !verificationResult.valid,
        verificationResult: verificationResult,
        penaltyAmount: verificationResult.valid ? 0 : penalty,
        rewardAmount: verificationResult.valid ? 0 : reward
      };
    }
    
    return { challengeSuccessful: false, message: '质疑节点数不足' };
  }

  /**
   * 获取质疑特定数据的节点列表（模拟）
   */
  getNodesThatChallenged(cacheNodeId, dataHash) {
    // 这里应该有实际的逻辑来跟踪哪些节点质疑了特定的缓存数据
    // 模拟返回3个随机节点
    const allNodeIds = Array.from(this.nodes.keys());
    if (allNodeIds.length < 3) return allNodeIds;
    
    // 随机选择3个节点作为质疑者
    return allNodeIds
      .sort(() => 0.5 - Math.random())
      .slice(0, 3);
  }

  /**
   * 在根层验证数据（模拟）
   */
  async verifyDataAtRootLevel(nodeId, dataHash) {
    // 实际实现中，这里需要复杂的验证过程
    // 返回验证结果
    return {
      valid: Math.random() > 0.3, // 模拟70%的验证通过率
      node: nodeId,
      dataHash: dataHash,
      timestamp: new Date()
    };
  }

  /**
   * 检查是否为关键公共服务
   */
  isCriticalPublicService(target) {
    if (this.criticalServiceWhitelist.has(target)) {
      return true;
    }

    for (const whitelistItem of this.criticalServiceWhitelist) {
      if (whitelistItem.startsWith('.') && target.endsWith(whitelistItem)) {
        return true;
      }
    }

    return false;
  }
}

module.exports = ConsensusMechanism;