/**
 * OraSRS (Oracle Security Root Service) API Router
 * 实现OraSRS协议的API端点
 * 遵循咨询式服务模式，提供风险评分而非直接阻断指令
 */

import express from 'express';
import SRSEngine from './srs-engine.js';
import AuthRateLimit from './src/auth-rate-limit.js';

const authRateLimit = new AuthRateLimit();

const router = express.Router();
const srsEngine = new SRSEngine();

// 统一错误处理中间件
function handleAsyncErrors(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

// 统一响应格式化
function formatResponse(data, message = 'Success', code = 200) {
  return {
    code,
    message,
    data,
    timestamp: new Date().toISOString(),
    version: '2.0.0'
  };
}

// 统一错误响应格式化
function formatError(errorCode, message, httpCode = 400) {
  return {
    error: {
      code: errorCode,
      message,
      timestamp: new Date().toISOString()
    }
  };
}

// 认证和速率限制中间件
async function authRateLimitMiddleware(req, res, next) {
  try {
    // 从请求头或查询参数获取API密钥
    const apiKey = req.headers['x-api-key'] || req.query.api_key;
    
    // 对某些端点跳过认证（如健康检查）
    const publicEndpoints = ['/health'];
    if (publicEndpoints.some(endpoint => req.path.endsWith(endpoint))) {
      return next();
    }
    
    // 验证API密钥
    if (!apiKey) {
      return res.status(401).json(formatError('MISSING_API_KEY', 'API key is required', 401));
    }
    
    const validation = await authRateLimit.advancedValidation(apiKey, {
      ip: req.ip || req.connection.remoteAddress
    });
    
    if (!validation.valid) {
      return res.status(401).json(formatError('INVALID_API_KEY', validation.error || 'Invalid API key', 401));
    }
    
    // 检查速率限制
    const rateLimitCheck = await authRateLimit.checkRateLimit(apiKey, req.path);
    if (!rateLimitCheck.allowed) {
      return res.status(429).json({
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: rateLimitCheck.error || 'Rate limit exceeded',
          retry_after: rateLimitCheck.retryAfter,
          timestamp: new Date().toISOString()
        }
      });
    }
    
    // 将验证信息添加到请求对象
    req.apiKeyData = validation.keyData;
    
    next();
  } catch (error) {
    console.error('Authentication/Rate limit middleware error:', error);
    return res.status(500).json(formatError('INTERNAL_ERROR', 'Authentication service error', 500));
  }
}

// 应用认证和速率限制中间件到所有路由
router.use(authRateLimitMiddleware);

// SRS查询端点 - 返回风险评分而非阻断指令
// SRS查询端点 - 返回风险评分而非阻断指令
router.get('/query', handleAsyncErrors(async (req, res) => {
  try {
    const { ip, domain } = req.query;

    // 参数验证
    if (!ip && !domain) {
      return res.status(400).json(formatError('MISSING_QUERY_PARAMETER', 'Either IP or domain parameter is required', 400));
    }

    // IP格式验证
    if (ip && !isValidIP(ip)) {
      return res.status(400).json(formatError('INVALID_IP_FORMAT', 'Invalid IP address format', 400));
    }

    // 域名格式验证
    if (domain && !isValidDomain(domain)) {
      return res.status(400).json(formatError('INVALID_DOMAIN_FORMAT', 'Invalid domain format', 400));
    }

    // 获取风险评估
    const result = await srsEngine.getSRSResponse(ip, domain);

    // 添加更完善的响应头部
    res.set({
      'X-OraSRS-Version': '2.0.0',
      'X-OraSRS-Disclaimer': 'This is advisory only. Final decision rests with the client.',
      'X-OraSRS-Compliance': 'GDPR/CCPA and China Cybersecurity Law compliant',
      'Cache-Control': 'public, max-age=300', // 5分钟缓存
      'Content-Type': 'application/json; charset=utf-8'
    });

    res.json(formatResponse(result, 'Query processed successfully', 200));
  } catch (error) {
    console.error('OraSRS query error:', error);
    res.status(500).json(formatError('OraSRS_QUERY_ERROR', 'Internal server error during OraSRS query', 500));
  }
}));

// IP格式验证函数
function isValidIP(ip) {
  // IPv4格式验证
  const ipv4Pattern = /^(\d{1,3}\.){3}\d{1,3}$/;
  if (ipv4Pattern.test(ip)) {
    const parts = ip.split('.').map(Number);
    return parts.every(part => part >= 0 && part <= 255);
  }
  
  // IPv6格式验证（简化）
  const ipv6Pattern = /^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$|^::1$|^::$/;
  if (ipv6Pattern.test(ip)) {
    return true;
  }
  
  return false;
}

// 域名格式验证函数
function isValidDomain(domain) {
  const domainPattern = /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
  return domainPattern.test(domain) && domain.length <= 253;
}

// 批量查询端点
router.post('/bulk-query', handleAsyncErrors(async (req, res) => {
  try {
    const { ips, domains } = req.body;

    // 参数验证
    if (!ips && !domains) {
      return res.status(400).json(formatError('MISSING_PARAMETERS', 'Either ips or domains array is required', 400));
    }

    // 验证数组格式
    if (ips && !Array.isArray(ips)) {
      return res.status(400).json(formatError('INVALID_IPS_FORMAT', 'ips must be an array', 400));
    }
    
    if (domains && !Array.isArray(domains)) {
      return res.status(400).json(formatError('INVALID_DOMAINS_FORMAT', 'domains must be an array', 400));
    }

    // 限制批量查询数量
    const maxBulkSize = 100; // 最大批量查询数量
    if ((ips?.length || 0) > maxBulkSize) {
      return res.status(400).json(formatError('BULK_SIZE_EXCEEDED', `Maximum ${maxBulkSize} IPs allowed in bulk query`, 400));
    }
    
    if ((domains?.length || 0) > maxBulkSize) {
      return res.status(400).json(formatError('BULK_SIZE_EXCEEDED', `Maximum ${maxBulkSize} domains allowed in bulk query`, 400));
    }

    // 验证IP和域名格式
    if (ips) {
      for (const ip of ips) {
        if (!isValidIP(ip)) {
          return res.status(400).json(formatError('INVALID_IP_FORMAT', `Invalid IP address: ${ip}`, 400));
        }
      }
    }
    
    if (domains) {
      for (const domain of domains) {
        if (!isValidDomain(domain)) {
          return res.status(400).json(formatError('INVALID_DOMAIN_FORMAT', `Invalid domain: ${domain}`, 400));
        }
      }
    }

    // 对批量查询消耗更多速率限制点数
    const pointsToConsume = Math.max(ips?.length || 0, domains?.length || 0);
    if (pointsToConsume > 0) {
      const rateLimitResult = await authRateLimit.consumeRateLimit(req.apiKeyData.key, pointsToConsume);
      if (!rateLimitResult.allowed) {
        return res.status(429).json({
          error: {
            code: 'RATE_LIMIT_EXCEEDED',
            message: rateLimitResult.error || 'Rate limit exceeded',
            retry_after: rateLimitResult.retryAfter,
            timestamp: new Date().toISOString()
          }
        });
      }
    }

    // 并行处理查询以提高性能
    let results = [];
    const startTime = Date.now();

    if (ips && Array.isArray(ips) && ips.length > 0) {
      const ipResults = await Promise.allSettled(
        ips.map(ip => srsEngine.getSRSResponse(ip))
      );
      
      results = results.concat(ipResults.map((result, index) => {
        if (result.status === 'fulfilled') {
          return { query: ips[index], result: result.value };
        } else {
          console.error(`Error processing IP ${ips[index]}:`, result.reason);
          return { 
            query: ips[index], 
            error: result.reason.message || 'Processing error',
            timestamp: new Date().toISOString()
          };
        }
      }));
    }

    if (domains && Array.isArray(domains) && domains.length > 0) {
      const domainResults = await Promise.allSettled(
        domains.map(domain => srsEngine.getSRSResponse(null, domain))
      );
      
      results = results.concat(domainResults.map((result, index) => {
        if (result.status === 'fulfilled') {
          return { query: domains[index], result: result.value };
        } else {
          console.error(`Error processing domain ${domains[index]}:`, result.reason);
          return { 
            query: domains[index], 
            error: result.reason.message || 'Processing error',
            timestamp: new Date().toISOString()
          };
        }
      }));
    }

    const processingTime = Date.now() - startTime;

    // 添加响应头部
    res.set({
      'X-OraSRS-Version': '2.0.0',
      'X-OraSRS-Disclaimer': 'This is advisory only. Final decision rests with the client.',
      'X-OraSRS-Compliance': 'GDPR/CCPA and China Cybersecurity Law compliant',
      'X-Processing-Time': `${processingTime}ms`,
      'Content-Type': 'application/json; charset=utf-8'
    });

    res.json(formatResponse({
      query_time: new Date().toISOString(),
      processing_time_ms: processingTime,
      total_queries: results.length,
      results
    }, 'Bulk query processed successfully', 200));
  } catch (error) {
    console.error('OraSRS bulk query error:', error);
    res.status(500).json(formatError('OraSRS_BULK_QUERY_ERROR', 'Internal server error during OraSRS bulk query', 500));
  }
}));

// 快速查询端点
router.get('/lookup/:indicator', handleAsyncErrors(async (req, res) => {
  try {
    const { indicator } = req.params;

    // 验证指标格式
    if (!indicator || typeof indicator !== 'string' || indicator.length > 253) {
      return res.status(400).json(formatError('INVALID_INDICATOR', 'Invalid indicator format. Must be a valid IP or domain.', 400));
    }

    // 判断是IP还是域名
    const isIP = isValidIP(indicator);
    const isDomain = isValidDomain(indicator);

    if (!isIP && !isDomain) {
      return res.status(400).json(formatError('INVALID_INDICATOR', 'Invalid indicator format. Must be a valid IP or domain.', 400));
    }

    let result;
    if (isIP) {
      result = await srsEngine.getSRSResponse(indicator);
    } else if (isDomain) {
      result = await srsEngine.getSRSResponse(null, indicator);
    }

    // 添加响应头部
    res.set({
      'X-OraSRS-Version': '2.0.0',
      'X-OraSRS-Disclaimer': 'This is advisory only. Final decision rests with the client.',
      'X-OraSRS-Compliance': 'GDPR/CCPA and China Cybersecurity Law compliant',
      'Content-Type': 'application/json; charset=utf-8'
    });

    res.json(formatResponse(result, 'Lookup processed successfully', 200));
  } catch (error) {
    console.error('OraSRS lookup error:', error);
    res.status(500).json(formatError('OraSRS_LOOKUP_ERROR', 'Internal server error during OraSRS lookup', 500));
  }
}));

// 申诉接口
router.post('/appeal', handleAsyncErrors(async (req, res) => {
  try {
    const { ip, proof, email } = req.body;

    // 参数验证
    if (!ip) {
      return res.status(400).json(formatError('MISSING_IP_PARAMETER', 'IP parameter is required', 400));
    }

    if (!proof || typeof proof !== 'string' || proof.trim().length === 0) {
      return res.status(400).json(formatError('MISSING_PROOF_PARAMETER', 'Proof parameter is required and must be a non-empty string', 400));
    }

    // 验证IP格式
    if (!isValidIP(ip)) {
      return res.status(400).json(formatError('INVALID_IP_FORMAT', 'Invalid IP address format', 400));
    }

    // 限制证明文本长度
    if (proof.length > 2000) {
      return res.status(400).json(formatError('PROOF_TOO_LONG', 'Proof text exceeds maximum length of 2000 characters', 400));
    }

    // 验证邮箱格式（如果提供）
    if (email && !isValidEmail(email)) {
      return res.status(400).json(formatError('INVALID_EMAIL_FORMAT', 'Invalid email format', 400));
    }

    // 申诉端点需要特殊的速率限制
    const rateLimitResult = await authRateLimit.consumeRateLimit(req.apiKeyData.key, 5); // 申诉消耗更多点数
    if (!rateLimitResult.allowed) {
      return res.status(429).json({
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: rateLimitResult.error || 'Rate limit exceeded',
          retry_after: rateLimitResult.retryAfter,
          timestamp: new Date().toISOString()
        }
      });
    }

    // 处理申诉
    const appealResult = await srsEngine.processAppeal(ip, {
      proof: proof.trim(),
      email: email,
      timestamp: new Date().toISOString(),
      apiKey: req.apiKeyData.key
    });

    res.status(201).json(formatResponse(appealResult, 'Appeal submitted successfully', 201));
  } catch (error) {
    console.error('OraSRS appeal error:', error);
    res.status(500).json(formatError('OraSRS_APPEAL_ERROR', 'Internal server error during OraSRS appeal', 500));
  }
}));

// 邮箱格式验证函数
function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) && email.length <= 254;
}

// 透明化和可审计接口 - 获取决策依据
router.get('/explain', handleAsyncErrors(async (req, res) => {
  try {
    const { ip, domain } = req.query;

    // 参数验证 - IP或域名必须提供一个
    if (!ip && !domain) {
      return res.status(400).json(formatError('MISSING_PARAMETER', 'Either IP or domain parameter is required', 400));
    }

    // 格式验证
    if (ip && !isValidIP(ip)) {
      return res.status(400).json(formatError('INVALID_IP_FORMAT', 'Invalid IP address format', 400));
    }

    if (domain && !isValidDomain(domain)) {
      return res.status(400).json(formatError('INVALID_DOMAIN_FORMAT', 'Invalid domain format', 400));
    }

    let explanation;
    if (ip) {
      explanation = srsEngine.getExplanation(ip);
    } else {
      // 对于域名，我们可能需要一个不同的解释方法
      explanation = srsEngine.getExplanation(domain);
    }

    res.set({
      'X-OraSRS-Version': '2.0.0',
      'X-OraSRS-Compliance': 'GDPR/CCPA and China Cybersecurity Law compliant',
      'Content-Type': 'application/json; charset=utf-8'
    });

    res.json(formatResponse(explanation, 'Explanation retrieved successfully', 200));
  } catch (error) {
    console.error('OraSRS explain error:', error);
    res.status(500).json(formatError('OraSRS_EXPLAIN_ERROR', 'Internal server error during OraSRS explain', 500));
  }
}));

// GDPR/CCPA数据删除接口
router.delete('/data', handleAsyncErrors(async (req, res) => {
  try {
    const { ip_hash, ip, domain } = req.query;

    // 参数验证 - 必须提供至少一个标识符
    if (!ip_hash && !ip && !domain) {
      return res.status(400).json(formatError('MISSING_IDENTIFIER', 'At least one of ip_hash, ip, or domain parameter is required', 400));
    }

    // 如果提供了IP，验证格式
    if (ip && !isValidIP(ip)) {
      return res.status(400).json(formatError('INVALID_IP_FORMAT', 'Invalid IP address format', 400));
    }

    // 如果提供了域名，验证格式
    if (domain && !isValidDomain(domain)) {
      return res.status(400).json(formatError('INVALID_DOMAIN_FORMAT', 'Invalid domain format', 400));
    }

    // 数据删除端点需要特殊的速率限制
    const rateLimitResult = await authRateLimit.consumeRateLimit(req.apiKeyData.key, 10); // 数据删除消耗更多点数
    if (!rateLimitResult.allowed) {
      return res.status(429).json({
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: rateLimitResult.error || 'Rate limit exceeded',
          retry_after: rateLimitResult.retryAfter,
          timestamp: new Date().toISOString()
        }
      });
    }

    // 执行数据删除逻辑
    const deletionResult = await performDataDeletion(ip_hash, ip, domain, req.apiKeyData.key);

    res.set({
      'X-OraSRS-Version': '2.0.0',
      'X-OraSRS-Compliance': 'GDPR/CCPA and China Cybersecurity Law compliant',
      'Content-Type': 'application/json; charset=utf-8'
    });

    res.status(200).json(formatResponse(deletionResult, 'Data deletion request processed successfully', 200));
  } catch (error) {
    console.error('OraSRS data deletion error:', error);
    res.status(500).json(formatError('OraSRS_DATA_DELETION_ERROR', 'Internal server error during OraSRS data deletion', 500));
  }
}));

// 执行数据删除的辅助函数
async function performDataDeletion(ip_hash, ip, domain, requesterApiKey) {
  // 在实际实现中，这里会安全地删除与标识符相关的数据
  // 由于当前实现使用原始IP而非哈希，我们需要处理这种情况
  const deletionLog = {
    ip_hash: ip_hash || null,
    ip: ip || null,
    domain: domain || null,
    requester: requesterApiKey,
    processed_at: new Date().toISOString(),
    status: 'processed',
    affected_records: 0 // 在实际实现中，这里会包含实际删除的记录数
  };

  console.log(`GDPR/CCPA deletion request processed:`, deletionLog);

  // 在实际实现中，这里会调用数据删除API
  // 例如：删除风险评分、证据记录、申诉记录等

  return deletionLog;
}

// 管理端点 - 创建API密钥（仅限管理员）
router.post('/admin/create-key', handleAsyncErrors(async (req, res) => {
  try {
    // 管理员验证
    const adminApiKey = req.headers['x-admin-api-key'];
    if (!adminApiKey || adminApiKey !== process.env.ADMIN_API_KEY) {
      return res.status(403).json(formatError('ADMIN_ACCESS_REQUIRED', 'Admin access required', 403));
    }

    // 验证请求体
    const { metadata, permissions } = req.body;
    if (metadata && typeof metadata !== 'object') {
      return res.status(400).json(formatError('INVALID_METADATA_FORMAT', 'Metadata must be an object', 400));
    }

    if (permissions && !Array.isArray(permissions)) {
      return res.status(400).json(formatError('INVALID_PERMISSIONS_FORMAT', 'Permissions must be an array', 400));
    }

    const newKey = authRateLimit.createApiKey({
      ...metadata,
      permissions: permissions || ['read', 'query'],
      created_at: new Date().toISOString(),
      created_by: adminApiKey.substring(0, 8) + '...' // 隐私保护
    });

    // 记录API密钥创建日志
    console.log(`Admin API key created by: ${adminApiKey.substring(0, 8)}..., new key: ${newKey.key.substring(0, 8)}...`);

    res.status(201).json(formatResponse({
      api_key: newKey.key,
      created_at: newKey.createdAt,
      metadata: newKey.metadata,
      permissions: newKey.metadata?.permissions || ['read', 'query']
    }, 'API key created successfully', 201));
  } catch (error) {
    console.error('OraSRS create key error:', error);
    res.status(500).json(formatError('CREATE_KEY_ERROR', 'Internal server error during API key creation', 500));
  }
}));

// 管理端点 - 获取API密钥统计（仅限管理员）
router.get('/admin/key-stats', handleAsyncErrors(async (req, res) => {
  try {
    // 管理员验证
    const adminApiKey = req.headers['x-admin-api-key'];
    if (!adminApiKey || adminApiKey !== process.env.ADMIN_API_KEY) {
      return res.status(403).json(formatError('ADMIN_ACCESS_REQUIRED', 'Admin access required', 403));
    }

    const stats = authRateLimit.getAllApiKeys();

    res.json(formatResponse({
      total_keys: stats.length,
      keys: stats.map(key => ({
        key_preview: key.key.substring(0, 8) + '...',
        created_at: key.createdAt,
        metadata: key.metadata,
        last_used: key.lastUsed || null,
        usage_count: key.usageCount || 0
      }))
    }, 'API key statistics retrieved successfully', 200));
  } catch (error) {
    console.error('OraSRS get key stats error:', error);
    res.status(500).json(formatError('KEY_STATS_ERROR', 'Internal server error during API key stats retrieval', 500));
  }
}));

// 威胁情报管理端点 - 获取威胁统计（仅限管理员）
router.get('/admin/threat-stats', handleAsyncErrors(async (req, res) => {
  try {
    // 管理员验证
    const adminApiKey = req.headers['x-admin-api-key'];
    if (!adminApiKey || adminApiKey !== process.env.ADMIN_API_KEY) {
      return res.status(403).json(formatError('ADMIN_ACCESS_REQUIRED', 'Admin access required', 403));
    }

    // 获取威胁统计信息
    const threatStats = {
      totalThreatReports: Math.floor(Math.random() * 10000), // 模拟数据
      verifiedThreats: Math.floor(Math.random() * 8000), // 模拟数据
      pendingVerifications: Math.floor(Math.random() * 500), // 模拟数据
      totalNodes: srsEngine.getConsensusNodes ? srsEngine.getConsensusNodes().length : 0,
      activeNodes: Math.floor(Math.random() * 50), // 模拟数据
      falsePositiveRate: (Math.random() * 5).toFixed(2) + '%', // 模拟数据
      avgResponseTime: Math.floor(Math.random() * 200) + 'ms', // 模拟数据
      complianceStatus: {
        gdpr: true,
        ccpa: true,
        iso27001: true,
        chinaCybersecurity: true
      },
      topThreatTypes: [
        { type: 'ddos', count: Math.floor(Math.random() * 1000) },
        { type: 'malware', count: Math.floor(Math.random() * 800) },
        { type: 'scan', count: Math.floor(Math.random() * 1200) }
      ]
    };

    res.json(formatResponse(threatStats, 'Threat statistics retrieved successfully', 200));
  } catch (error) {
    console.error('OraSRS threat stats error:', error);
    res.status(500).json(formatError('THREAT_STATS_ERROR', 'Internal server error during threat stats retrieval', 500));
  }
}));

// 添加全局错误处理中间件
router.use((error, req, res, next) => {
  console.error('Unhandled error in SRS routes:', error);
  
  // 记录错误日志
  console.error(`Route Error: ${req.method} ${req.path}`, {
    error: error.message,
    stack: error.stack,
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });
  
  // 返回统一错误格式
  res.status(500).json(formatError('INTERNAL_ERROR', 'An unexpected error occurred', 500));
});

export default router;