/**
 * OraSRS 边缘缓存层模块
 * 实现小额质押（≥100 ORA）、可验证缓存证明、接受任意挑战
 */

import crypto from 'crypto';

class EdgeCacheLayer {
  constructor(options = {}) {
    this.cache = new Map(); // 缓存存储
    this.minStakeAmount = options.minStakeAmount || 100; // 小额质押门槛
    this.cacheTTL = options.cacheTTL || 5 * 60 * 1000; // 缓存有效期：5分钟
    this.challengeThreshold = options.challengeThreshold || 3; // 挑战阈值：3个独立节点
    this.challengeRewardRate = options.challengeRewardRate || 0.8; // 挑战奖励率：80%
    this.slashPenaltyRate = options.slashPenaltyRate || 0.5; // 缓存节点罚没率：50%
    
    this.cacheNodes = new Map(); // 缓存节点信息
    this.challenges = new Map(); // 挑战记录
    this.challengeTimeout = options.challengeTimeout || 10 * 60 * 1000; // 挑战超时：10分钟
  }

  /**
   * 缓存节点质押
   */
  stake(nodeId, amount, nodeInfo) {
    if (amount < this.minStakeAmount) {
      throw new Error(`缓存节点质押金额不足，最小质押门槛为 ${this.minStakeAmount} ORA`);
    }

    const node = {
      id: nodeId,
      stakeAmount: amount,
      nodeInfo: nodeInfo,
      lastSeen: new Date(),
      status: 'active',
      cacheHits: 0,
      challenges: 0,
      challengesWon: 0,
      challengesLost: 0
    };

    this.cacheNodes.set(nodeId, node);
    
    console.log(`缓存节点 ${nodeId} 质押 ${amount} ORA 成功`);
    return { success: true, nodeId, stakeAmount: amount };
  }

  /**
   * 获取缓存
   */
  getCache(key) {
    const cacheEntry = this.cache.get(key);
    if (!cacheEntry) {
      return null;
    }

    // 检查缓存是否过期
    if (new Date() - cacheEntry.timestamp > this.cacheTTL) {
      // 缓存过期，删除
      this.cache.delete(key);
      return null;
    }

    // 增加缓存命中计数
    const node = this.cacheNodes.get(cacheEntry.cachedBy);
    if (node) {
      node.cacheHits += 1;
    }

    return cacheEntry.data;
  }

  /**
   * 设置缓存
   */
  setCache(key, data, cachedBy) {
    const node = this.cacheNodes.get(cachedBy);
    if (!node) {
      throw new Error(`缓存节点 ${cachedBy} 未注册或质押不足`);
    }

    // 创建缓存条目，包含默克尔证明和时间戳
    const cacheEntry = {
      data: data,
      cachedBy: cachedBy,
      timestamp: new Date(),
      merkleProof: this.generateMerkleProof(data, key),
      version: 1
    };

    this.cache.set(key, cacheEntry);
    return { success: true, key, cachedBy };
  }

  /**
   * 生成默克尔证明
   */
  generateMerkleProof(data, key) {
    // 简化的默克尔证明生成
    const dataStr = JSON.stringify(data) + key;
    const hash = crypto.createHash('sha256').update(dataStr).digest('hex');
    
    return {
      rootHash: hash,
      dataHash: crypto.createHash('sha256').update(JSON.stringify(data)).digest('hex'),
      keyHash: crypto.createHash('sha256').update(key).digest('hex'),
      timestamp: new Date().toISOString()
    };
  }

  /**
   * 验证默克尔证明
   */
  verifyMerkleProof(proof, data, key) {
    const expectedDataHash = crypto.createHash('sha256').update(JSON.stringify(data)).digest('hex');
    const expectedKeyHash = crypto.createHash('sha256').update(key).digest('hex');
    
    return proof.dataHash === expectedDataHash && proof.keyHash === expectedKeyHash;
  }

  /**
   * 提交挑战
   */
  submitChallenge(challengeId, cacheKey, challengerId, reason) {
    const cacheEntry = this.cache.get(cacheKey);
    if (!cacheEntry) {
      throw new Error(`缓存键 ${cacheKey} 不存在`);
    }

    const challenge = {
      id: challengeId,
      cacheKey: cacheKey,
      cachedBy: cacheEntry.cachedBy,
      challenger: challengerId,
      reason: reason,
      timestamp: new Date(),
      status: 'pending',
      challenges: [challengerId], // 记录质疑的节点
      resolved: false,
      resolvedAt: null
    };

    this.challenges.set(challengeId, challenge);
    
    // 检查是否达到挑战阈值
    this.checkChallengeThreshold(challengeId);
    
    console.log(`挑战 ${challengeId} 已提交，目标缓存: ${cacheKey}`);
    return { success: true, challengeId };
  }

  /**
   * 添加额外挑战者
   */
  addChallengeSupport(challengeId, challengerId) {
    const challenge = this.challenges.get(challengeId);
    if (!challenge) {
      throw new Error(`挑战 ${challengeId} 不存在`);
    }

    if (!challenge.challenges.includes(challengerId)) {
      challenge.challenges.push(challengerId);
      this.checkChallengeThreshold(challengeId);
    }

    return { success: true, challengeId, totalChallengers: challenge.challenges.length };
  }

  /**
   * 检查挑战阈值
   */
  checkChallengeThreshold(challengeId) {
    const challenge = this.challenges.get(challengeId);
    if (!challenge) return;

    if (challenge.challenges.length >= this.challengeThreshold && !challenge.resolved) {
      // 达到挑战阈值，启动验证流程
      this.processChallenge(challengeId);
    }
  }

  /**
   * 处理挑战
   */
  async processChallenge(challengeId) {
    const challenge = this.challenges.get(challengeId);
    if (!challenge || challenge.resolved) return;

    // 向根层提交验证请求（模拟）
    const verificationResult = await this.verifyAtRootLevel(challenge);

    // 根据验证结果执行相应操作
    if (!verificationResult.valid) {
      // 挑战成功 - 罚没缓存节点保证金，奖励挑战者
      this.handleSuccessfulChallenge(challenge, verificationResult);
    } else {
      // 挑战失败 - 记录失败并可选择惩罚挑战者
      this.handleFailedChallenge(challenge, verificationResult);
    }

    challenge.resolved = true;
    challenge.resolvedAt = new Date();
    challenge.verificationResult = verificationResult;
  }

  /**
   * 在根层验证（模拟）
   */
  async verifyAtRootLevel(challenge) {
    // 在实际实现中，这里会向根层共识网络发送验证请求
    // 模拟验证结果
    return new Promise(resolve => {
      setTimeout(() => {
        // 为了演示目的，随机决定验证结果
        // 在实际实现中，这将是一个确定性的验证过程
        resolve({
          valid: Math.random() > 0.4, // 模拟60%的验证通过率
          challengeId: challenge.id,
          cacheKey: challenge.cacheKey,
          verifiedAt: new Date(),
          verifier: "root-network"
        });
      }, 1000); // 模拟网络延迟
    });
  }

  /**
   * 处理成功的挑战
   */
  handleSuccessfulChallenge(challenge, verificationResult) {
    const cacheNode = this.cacheNodes.get(challenge.cachedBy);
    if (!cacheNode) return;

    // 计算罚没金额（50%保证金）
    const penaltyAmount = cacheNode.stakeAmount * this.slashPenaltyRate;
    cacheNode.stakeAmount -= penaltyAmount;

    // 计算挑战者奖励（80%罚没金额）
    const rewardAmount = penaltyAmount * this.challengeRewardRate;
    const rewardPerChallenger = rewardAmount / challenge.challenges.length;

    // 分发奖励给挑战者
    for (const challengerId of challenge.challenges) {
      const challengerNode = this.cacheNodes.get(challengerId);
      if (challengerNode) {
        challengerNode.stakeAmount += rewardPerChallenger;
      }
    }

    // 更新节点统计信息
    cacheNode.challengesLost += 1;
    for (const challengerId of challenge.challenges) {
      const challengerNode = this.cacheNodes.get(challengerId);
      if (challengerNode) {
        challengerNode.challengesWon += 1;
      }
    }

    console.log(`挑战成功: 缓存节点 ${challenge.cachedBy} 被罚没 ${penaltyAmount} ORA`);
    console.log(`挑战者获得奖励: 每个挑战者 ${rewardPerChallenger} ORA (总计 ${rewardAmount})`);
  }

  /**
   * 处理失败的挑战
   */
  handleFailedChallenge(challenge, verificationResult) {
    const cacheNode = this.cacheNodes.get(challenge.cachedBy);
    if (cacheNode) {
      cacheNode.challengesWon += 1;
    }

    for (const challengerId of challenge.challenges) {
      const challengerNode = this.cacheNodes.get(challengerId);
      if (challengerNode) {
        challengerNode.challengesLost += 1;
      }
    }

    console.log(`挑战失败: 缓存数据验证通过`);
  }

  /**
   * 获取节点统计信息
   */
  getNodeStats(nodeId) {
    const node = this.cacheNodes.get(nodeId);
    if (!node) {
      return null;
    }

    return {
      id: node.id,
      stakeAmount: node.stakeAmount,
      status: node.status,
      cacheHits: node.cacheHits,
      totalChallenges: node.challenges,
      challengesWon: node.challengesWon,
      challengesLost: node.challengesLost,
      challengeSuccessRate: node.challenges > 0 ? node.challengesWon / node.challenges : 0
    };
  }

  /**
   * 获取所有活跃缓存
   */
  getAllCache() {
    const activeCache = [];
    for (const [key, entry] of this.cache) {
      if (new Date() - entry.timestamp <= this.cacheTTL) {
        activeCache.push({
          key: key,
          data: entry.data,
          cachedBy: entry.cachedBy,
          timestamp: entry.timestamp,
          expiresAt: new Date(entry.timestamp.getTime() + this.cacheTTL)
        });
      }
    }
    return activeCache;
  }

  /**
   * 获取所有挑战
   */
  getAllChallenges() {
    return Array.from(this.challenges.values());
  }

  /**
   * 清理过期缓存
   */
  cleanupExpiredCache() {
    const now = new Date();
    let cleaned = 0;

    for (const [key, entry] of this.cache) {
      if (now - entry.timestamp > this.cacheTTL) {
        this.cache.delete(key);
        cleaned++;
      }
    }

    console.log(`清理了 ${cleaned} 个过期缓存条目`);
    return cleaned;
  }

  /**
   * 清理过期挑战
   */
  cleanupExpiredChallenges() {
    const now = new Date();
    let cleaned = 0;

    for (const [challengeId, challenge] of this.challenges) {
      if (!challenge.resolved && now - challenge.timestamp > this.challengeTimeout) {
        // 挑战超时，按默认方式处理
        challenge.resolved = true;
        challenge.resolvedAt = new Date();
        challenge.status = 'timeout';
        challenge.verificationResult = { valid: true, reason: 'challenge_timeout' };
        
        cleaned++;
      }
    }

    console.log(`处理了 ${cleaned} 个超时挑战`);
    return cleaned;
  }

  /**
   * 定期维护任务
   */
  runMaintenance() {
    this.cleanupExpiredCache();
    this.cleanupExpiredChallenges();
  }
}

export default EdgeCacheLayer;