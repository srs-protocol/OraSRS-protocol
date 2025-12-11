/**
 * 认证和速率限制模块
 */

class AuthRateLimit {
  constructor(options = {}) {
    this.options = {
      defaultRateLimit: options.defaultRateLimit || { windowMs: 15 * 60 * 1000, max: 100 }, // 15分钟100次
      apiKeyLength: options.apiKeyLength || 32,
      ...options
    };

    this.apiKeys = new Map(); // 存储API密钥
    this.rateLimits = new Map(); // 存储速率限制
    this.bannedIPs = new Set(); // 存储被封禁的IP

    console.log('AuthRateLimit module initialized');
  }

  /**
   * 创建API密钥
   */
  createApiKey(config = {}) {
    // 生成随机API密钥
    const apiKey = this.generateApiKey();
    
    const keyData = {
      key: apiKey,
      name: config.name || 'unnamed',
      createdAt: new Date().toISOString(),
      createdBy: config.createdBy || 'system',
      permissions: config.permissions || ['read'],
      rateLimit: config.rateLimit || this.options.defaultRateLimit,
      active: true
    };

    this.apiKeys.set(apiKey, keyData);
    
    console.log(`API key created: ${config.name || 'unnamed'}`);
    return keyData;
  }

  /**
   * 生成API密钥
   */
  generateApiKey() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    
    for (let i = 0; i < this.options.apiKeyLength; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    
    return result;
  }

  /**
   * 验证API密钥
   */
  validateApiKey(apiKey) {
    if (!this.apiKeys.has(apiKey)) {
      return { valid: false, reason: 'API key not found' };
    }

    const keyData = this.apiKeys.get(apiKey);
    
    if (!keyData.active) {
      return { valid: false, reason: 'API key is deactivated' };
    }

    return {
      valid: true,
      keyData: keyData,
      remainingRequests: this.getRemainingRequests(apiKey)
    };
  }

  /**
   * 检查速率限制
   */
  checkRateLimit(apiKey, ip = 'unknown') {
    const validation = this.validateApiKey(apiKey);
    
    if (!validation.valid) {
      return validation;
    }

    const keyData = validation.keyData;
    const clientId = `${apiKey}_${ip}`;
    
    // 初始化客户端速率限制数据
    if (!this.rateLimits.has(clientId)) {
      this.rateLimits.set(clientId, {
        count: 0,
        resetTime: Date.now() + keyData.rateLimit.windowMs
      });
    }

    const rateLimitData = this.rateLimits.get(clientId);
    
    // 检查是否需要重置窗口
    if (Date.now() >= rateLimitData.resetTime) {
      rateLimitData.count = 0;
      rateLimitData.resetTime = Date.now() + keyData.rateLimit.windowMs;
    }

    // 检查是否超过限制
    if (rateLimitData.count >= keyData.rateLimit.max) {
      return {
        valid: false,
        reason: 'Rate limit exceeded',
        resetTime: rateLimitData.resetTime
      };
    }

    // 增加计数
    rateLimitData.count++;
    
    return {
      valid: true,
      remaining: keyData.rateLimit.max - rateLimitData.count,
      resetTime: rateLimitData.resetTime
    };
  }

  /**
   * 获取剩余请求数
   */
  getRemainingRequests(apiKey) {
    // 这在验证密钥时更新速率限制，这里只是一个辅助方法
    return this.options.defaultRateLimit.max;
  }

  /**
   * 封禁IP地址
   */
  banIP(ipAddress, reason = 'Unknown', duration = 3600000) { // 默认1小时
    this.bannedIPs.add(ipAddress);
    
    // 设置定时器自动解封
    setTimeout(() => {
      this.bannedIPs.delete(ipAddress);
      console.log(`IP ${ipAddress} automatically unbaned after ban period`);
    }, duration);

    console.log(`IP ${ipAddress} banned for ${reason}`);
    return { success: true, bannedUntil: new Date(Date.now() + duration) };
  }

  /**
   * 检查IP是否被封禁
   */
  isIPBanned(ipAddress) {
    return this.bannedIPs.has(ipAddress);
  }

  /**
   * 获取API密钥列表（管理功能）
   */
  listApiKeys() {
    const keys = [];
    for (const [key, data] of this.apiKeys) {
      // 不返回完整的密钥，只返回部分信息
      keys.push({
        keyPreview: key.substring(0, 8) + '...',
        name: data.name,
        createdAt: data.createdAt,
        active: data.active,
        permissions: data.permissions
      });
    }
    return keys;
  }

  /**
   * 撤销API密钥
   */
  revokeApiKey(apiKey) {
    if (this.apiKeys.has(apiKey)) {
      const keyData = this.apiKeys.get(apiKey);
      keyData.active = false;
      console.log(`API key revoked: ${keyData.name}`);
      return { success: true };
    }
    return { success: false, reason: 'API key not found' };
  }

  /**
   * 更新API密钥权限
   */
  updateApiKeyPermissions(apiKey, newPermissions) {
    if (this.apiKeys.has(apiKey)) {
      const keyData = this.apiKeys.get(apiKey);
      keyData.permissions = newPermissions;
      console.log(`Updated permissions for API key: ${keyData.name}`);
      return { success: true, permissions: newPermissions };
    }
    return { success: false, reason: 'API key not found' };
  }

  /**
   * 获取速率限制统计
   */
  getRateLimitStats() {
    return {
      totalApiKeys: this.apiKeys.size,
      activeRateLimits: this.rateLimits.size,
      bannedIPs: this.bannedIPs.size,
      rateLimitConfig: this.options.defaultRateLimit
    };
  }

  /**
   * 清理过期的速率限制数据
   */
  cleanupExpiredRateLimits() {
    const now = Date.now();
    let cleanedCount = 0;
    
    for (const [clientId, data] of this.rateLimits) {
      if (now >= data.resetTime) {
        this.rateLimits.delete(clientId);
        cleanedCount++;
      }
    }
    
    if (cleanedCount > 0) {
      console.log(`Cleaned up ${cleanedCount} expired rate limit entries`);
    }
    
    return { cleaned: cleanedCount };
  }

  /**
   * 重置特定客户端的速率限制
   */
  resetRateLimit(apiKey, ip = 'unknown') {
    const clientId = `${apiKey}_${ip}`;
    if (this.rateLimits.has(clientId)) {
      this.rateLimits.delete(clientId);
      console.log(`Rate limit reset for client: ${clientId}`);
      return { success: true };
    }
    return { success: false, reason: 'Rate limit data not found' };
  }

  /**
   * 获取客户端速率限制详情
   */
  getRateLimitDetails(apiKey, ip = 'unknown') {
    const clientId = `${apiKey}_${ip}`;
    const rateLimitData = this.rateLimits.get(clientId);
    
    if (!rateLimitData) {
      return {
        count: 0,
        remaining: this.options.defaultRateLimit.max,
        resetTime: Date.now() + this.options.defaultRateLimit.windowMs
      };
    }
    
    return {
      count: rateLimitData.count,
      remaining: this.options.defaultRateLimit.max - rateLimitData.count,
      resetTime: rateLimitData.resetTime
    };
  }

  /**
   * 应用自定义速率限制策略
   */
  applyCustomRateLimit(apiKey, customLimit) {
    if (this.apiKeys.has(apiKey)) {
      const keyData = this.apiKeys.get(apiKey);
      keyData.rateLimit = {
        windowMs: customLimit.windowMs || keyData.rateLimit.windowMs,
        max: customLimit.max || keyData.rateLimit.max
      };
      
      console.log(`Applied custom rate limit to API key: ${keyData.name}`);
      return { success: true, rateLimit: keyData.rateLimit };
    }
    return { success: false, reason: 'API key not found' };
  }
}

export default AuthRateLimit;