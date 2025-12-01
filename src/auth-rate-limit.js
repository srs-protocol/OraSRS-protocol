/**
 * OraSRS 速率限制和认证模块
 * 提供API密钥管理和防滥用机制
 */

const crypto = require('crypto');
const { RateLimiterMemory } = require('rate-limiter-flexible');

class AuthRateLimit {
  constructor(options = {}) {
    this.apiKeys = new Map(); // 存储API密钥
    this.rateLimiters = new Map(); // 存储不同类型的限速器
    this.defaultRateLimit = options.defaultRateLimit || {
      points: 100, // 每个时间段的请求数
      duration: 60 // 时间段（秒）
    };
    
    // 创建默认限速器
    this.createRateLimiter('default', this.defaultRateLimit);
  }

  /**
   * 创建API密钥
   */
  createApiKey(metadata = {}) {
    const apiKey = 'orasrs_' + crypto.randomBytes(32).toString('hex');
    
    const keyData = {
      key: apiKey,
      createdAt: new Date(),
      lastUsed: null,
      usageCount: 0,
      metadata: metadata,
      active: true,
      rateLimit: metadata.rateLimit || this.defaultRateLimit
    };
    
    this.apiKeys.set(apiKey, keyData);
    
    // 为新API密钥创建特定的限速器
    this.createRateLimiter(apiKey, keyData.rateLimit);
    
    console.log(`创建新API密钥: ${apiKey.substring(0, 10)}...`);
    return keyData;
  }

  /**
   * 创建限速器
   */
  createRateLimiter(id, rateLimitConfig) {
    const rateLimiter = new RateLimiterMemory({
      points: rateLimitConfig.points || 100,
      duration: rateLimitConfig.duration || 60
    });
    
    this.rateLimiters.set(id, rateLimiter);
    return rateLimiter;
  }

  /**
   * 验证API密钥
   */
  validateApiKey(apiKey) {
    if (!apiKey) {
      return { valid: false, error: 'Missing API key' };
    }
    
    const keyData = this.apiKeys.get(apiKey);
    
    if (!keyData) {
      return { valid: false, error: 'Invalid API key' };
    }
    
    if (!keyData.active) {
      return { valid: false, error: 'API key is deactivated' };
    }
    
    // 更新使用统计
    keyData.lastUsed = new Date();
    keyData.usageCount += 1;
    
    return { valid: true, keyData };
  }

  /**
   * 检查速率限制
   */
  async checkRateLimit(apiKey, endpoint = 'default') {
    const validation = this.validateApiKey(apiKey);
    
    if (!validation.valid) {
      return { allowed: false, error: validation.error };
    }
    
    // 使用特定于API密钥的限速器，或者使用默认限速器
    const rateLimiterId = this.rateLimiters.has(apiKey) ? apiKey : 'default';
    const rateLimiter = this.rateLimiters.get(rateLimiterId);
    
    try {
      await rateLimiter.consume(apiKey);
      return { allowed: true, remaining: rateLimiter.points - 1 };
    } catch (rejRes) {
      return { 
        allowed: false, 
        error: 'Rate limit exceeded', 
        retryAfter: rejRes.msBeforeNext / 1000 
      };
    }
  }

  /**
   * 手动限制请求
   */
  async consumeRateLimit(apiKey, points = 1) {
    const rateLimiter = this.rateLimiters.get('default');
    
    if (!rateLimiter) {
      return { allowed: true };
    }
    
    try {
      const result = await rateLimiter.consume(apiKey, points);
      return { 
        allowed: true, 
        remaining: result.remainingPoints,
        resetTime: new Date(Date.now() + result.msBeforeNext)
      };
    } catch (rejRes) {
      return { 
        allowed: false, 
        error: 'Rate limit exceeded', 
        retryAfter: rejRes.msBeforeNext / 1000 
      };
    }
  }

  /**
   * 激活/停用API密钥
   */
  setApiKeyStatus(apiKey, active) {
    const keyData = this.apiKeys.get(apiKey);
    
    if (!keyData) {
      return false;
    }
    
    keyData.active = active;
    return true;
  }

  /**
   * 获取API密钥统计信息
   */
  getApiKeyStats(apiKey) {
    return this.apiKeys.get(apiKey) || null;
  }

  /**
   * 获取所有API密钥（管理用途）
   */
  getAllApiKeys() {
    return Array.from(this.apiKeys.values()).map(key => ({
      key: key.key.substring(0, 10) + '...', // 只返回部分密钥
      createdAt: key.createdAt,
      lastUsed: key.lastUsed,
      usageCount: key.usageCount,
      active: key.active,
      metadata: key.metadata
    }));
  }

  /**
   * 删除API密钥
   */
  removeApiKey(apiKey) {
    const result = this.apiKeys.delete(apiKey);
    if (result) {
      this.rateLimiters.delete(apiKey);
      console.log(`删除API密钥: ${apiKey.substring(0, 10)}...`);
    }
    return result;
  }

  /**
   * 防止暴力破解的高级验证
   */
  async advancedValidation(apiKey, clientInfo = {}) {
    const validation = this.validateApiKey(apiKey);
    
    if (!validation.valid) {
      // 记录失败的尝试（可选）
      console.log(`API密钥验证失败: ${apiKey ? apiKey.substring(0, 10) : 'NULL'} from ${clientInfo.ip || 'unknown'}`);
      return validation;
    }
    
    // 检查来自同一IP的失败尝试（需要额外的存储来跟踪）
    // 这里是一个简化版本
    const rateLimitCheck = await this.checkRateLimit(apiKey);
    
    if (!rateLimitCheck.allowed) {
      return { valid: false, error: rateLimitCheck.error };
    }
    
    return { valid: true, keyData: validation.keyData };
  }
}

module.exports = AuthRateLimit;