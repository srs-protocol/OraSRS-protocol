/**
 * Performance and Monitoring Module for OraSRS
 * 实现性能监控、指标收集和系统优化功能
 */

import fs from 'fs';
import path from 'path';

class MetricsCollector {
  constructor(options = {}) {
    this.options = {
      collectionInterval: options.collectionInterval || 30000, // 30秒收集一次
      maxMetricsHistory: options.maxMetricsHistory || 1000, // 最大历史记录数
      enableProfiling: options.enableProfiling !== false,
      ...options
    };
    
    // 初始化指标存储
    this.metrics = {
      requests: {
        total: 0,
        byMethod: {},
        byEndpoint: {},
        byStatusCode: {}
      },
      responseTime: {
        total: 0,
        count: 0,
        avg: 0,
        min: Infinity,
        max: 0,
        p95: 0,
        p99: 0
      },
      errors: {
        total: 0,
        byType: {}
      },
      activeConnections: 0,
      memoryUsage: {
        rss: 0,
        heapTotal: 0,
        heapUsed: 0,
        external: 0,
        arrayBuffers: 0
      },
      cpuUsage: {
        usage: 0,
        system: 0,
        user: 0
      },
      cache: {
        hitCount: 0,
        missCount: 0,
        hitRate: 0,
        size: 0
      },
      threatIntelligence: {
        reportsProcessed: 0,
        verificationsCompleted: 0,
        avgVerificationTime: 0
      },
      startTime: Date.now(),
      lastCollection: Date.now(),
      responseTimeHistory: []
    };
    
    // 初始化性能分析器
    this.profiler = null;
    if (this.options.enableProfiling) {
      this.initializeProfiler();
    }
    
    // 启动指标收集
    this.startMetricsCollection();
    
    console.log('Metrics Collector initialized');
  }

  /**
   * 初始化性能分析器
   */
  initializeProfiler() {
    try {
      // 在实际实现中，这里可能使用像clinic.js或0x这样的性能分析工具
      console.log('Performance profiler initialized');
    } catch (error) {
      console.warn('Failed to initialize performance profiler:', error.message);
    }
  }

  /**
   * 记录请求
   */
  recordRequest(method, endpoint, statusCode, responseTime) {
    // 更新请求计数
    this.metrics.requests.total++;
    
    // 按方法统计
    this.metrics.requests.byMethod[method] = 
      (this.metrics.requests.byMethod[method] || 0) + 1;
    
    // 按端点统计
    this.metrics.requests.byEndpoint[endpoint] = 
      (this.metrics.requests.byEndpoint[endpoint] || 0) + 1;
    
    // 按状态码统计
    this.metrics.requests.byStatusCode[statusCode] = 
      (this.metrics.requests.byStatusCode[statusCode] || 0) + 1;
    
    // 更新响应时间统计
    this.updateResponseTimeStats(responseTime);
    
    // 记录响应时间到历史记录
    this.metrics.responseTimeHistory.push({
      timestamp: Date.now(),
      responseTime,
      endpoint
    });
    
    // 限制历史记录大小
    if (this.metrics.responseTimeHistory.length > this.options.maxMetricsHistory) {
      this.metrics.responseTimeHistory = 
        this.metrics.responseTimeHistory.slice(-this.options.maxMetricsHistory);
    }
  }

  /**
   * 更新响应时间统计
   */
  updateResponseTimeStats(responseTime) {
    this.metrics.responseTime.total += responseTime;
    this.metrics.responseTime.count++;
    
    // 更新最小值和最大值
    this.metrics.responseTime.min = Math.min(this.metrics.responseTime.min, responseTime);
    this.metrics.responseTime.max = Math.max(this.metrics.responseTime.max, responseTime);
    
    // 重新计算平均值
    this.metrics.responseTime.avg = 
      this.metrics.responseTime.total / this.metrics.responseTime.count;
  }

  /**
   * 记录错误
   */
  recordError(errorType) {
    this.metrics.errors.total++;
    this.metrics.errors.byType[errorType] = 
      (this.metrics.errors.byType[errorType] || 0) + 1;
  }

  /**
   * 记录缓存命中
   */
  recordCacheHit() {
    this.metrics.cache.hitCount++;
    this.updateCacheHitRate();
  }

  /**
   * 记录缓存未命中
   */
  recordCacheMiss() {
    this.metrics.cache.missCount++;
    this.updateCacheHitRate();
  }

  /**
   * 更新缓存命中率
   */
  updateCacheHitRate() {
    const total = this.metrics.cache.hitCount + this.metrics.cache.missCount;
    this.metrics.cache.hitRate = total > 0 ? 
      (this.metrics.cache.hitCount / total * 100).toFixed(2) + '%' : '0%';
  }

  /**
   * 更新缓存大小
   */
  updateCacheSize(size) {
    this.metrics.cache.size = size;
  }

  /**
   * 记录威胁情报指标
   */
  recordThreatIntelligence(report) {
    this.metrics.threatIntelligence.reportsProcessed++;
  }

  /**
   * 记录验证完成
   */
  recordVerificationCompleted(verificationTime) {
    this.metrics.threatIntelligence.verificationsCompleted++;
    this.metrics.threatIntelligence.avgVerificationTime = 
      ((this.metrics.threatIntelligence.avgVerificationTime * (this.metrics.threatIntelligence.verificationsCompleted - 1)) + verificationTime) / 
      this.metrics.threatIntelligence.verificationsCompleted;
  }

  /**
   * 更新内存使用情况
   */
  updateMemoryUsage() {
    const usage = process.memoryUsage();
    this.metrics.memoryUsage = {
      rss: usage.rss,
      heapTotal: usage.heapTotal,
      heapUsed: usage.heapUsed,
      external: usage.external,
      arrayBuffers: usage.arrayBuffers ? usage.arrayBuffers : 0
    };
  }

  /**
   * 更新CPU使用情况
   */
  updateCPUUsage() {
    const cpuUsage = process.cpuUsage();
    const now = Date.now();
    
    // 由于无法直接获取系统CPU时间，我们只记录进程CPU时间
    this.metrics.cpuUsage = {
      usage: cpuUsage,
      system: 0, // 系统CPU使用时间（无法直接获取）
      user: cpuUsage.user + cpuUsage.system // 用户+系统CPU时间
    };
  }

  /**
   * 获取指标快照
   */
  getMetricsSnapshot() {
    // 更新内存和CPU使用情况
    this.updateMemoryUsage();
    this.updateCPUUsage();
    
    // 计算P95和P99响应时间
    this.calculatePercentiles();
    
    return {
      ...this.metrics,
      uptime: Date.now() - this.metrics.startTime,
      lastUpdated: Date.now()
    };
  }

  /**
   * 计算响应时间百分位数
   */
  calculatePercentiles() {
    if (this.metrics.responseTimeHistory.length === 0) {
      return;
    }
    
    // 按响应时间排序
    const sortedTimes = [...this.metrics.responseTimeHistory]
      .map(item => item.responseTime)
      .sort((a, b) => a - b);
    
    const n = sortedTimes.length;
    
    // 计算P95 (95th percentile)
    const p95Index = Math.floor(n * 0.95);
    this.metrics.responseTime.p95 = sortedTimes[p95Index] || 0;
    
    // 计算P99 (99th percentile)
    const p99Index = Math.floor(n * 0.99);
    this.metrics.responseTime.p99 = sortedTimes[p99Index] || 0;
  }

  /**
   * 重置指标
   */
  resetMetrics() {
    this.metrics = {
      requests: {
        total: 0,
        byMethod: {},
        byEndpoint: {},
        byStatusCode: {}
      },
      responseTime: {
        total: 0,
        count: 0,
        avg: 0,
        min: Infinity,
        max: 0,
        p95: 0,
        p99: 0
      },
      errors: {
        total: 0,
        byType: {}
      },
      activeConnections: 0,
      memoryUsage: {
        rss: 0,
        heapTotal: 0,
        heapUsed: 0,
        external: 0,
        arrayBuffers: 0
      },
      cpuUsage: {
        usage: 0,
        system: 0,
        user: 0
      },
      cache: {
        hitCount: 0,
        missCount: 0,
        hitRate: '0%',
        size: 0
      },
      threatIntelligence: {
        reportsProcessed: 0,
        verificationsCompleted: 0,
        avgVerificationTime: 0
      },
      startTime: Date.now(),
      lastCollection: Date.now(),
      responseTimeHistory: []
    };
  }

  /**
   * 启动指标收集
   */
  startMetricsCollection() {
    // 定期收集系统级指标
    setInterval(() => {
      this.updateMemoryUsage();
      this.updateCPUUsage();
      this.metrics.lastCollection = Date.now();
    }, this.options.collectionInterval);
  }

  /**
   * 生成性能报告
   */
  generatePerformanceReport() {
    const snapshot = this.getMetricsSnapshot();
    
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        uptime: this.formatDuration(snapshot.uptime),
        totalRequests: snapshot.requests.total,
        totalErrors: snapshot.errors.total,
        avgResponseTime: snapshot.responseTime.avg.toFixed(2) + 'ms',
        p95ResponseTime: snapshot.responseTime.p95 + 'ms',
        p99ResponseTime: snapshot.responseTime.p99 + 'ms',
        cacheHitRate: snapshot.cache.hitRate,
        memoryUsage: this.formatBytes(snapshot.memoryUsage.heapUsed),
        errorRate: snapshot.requests.total > 0 ? 
          (snapshot.errors.total / snapshot.requests.total * 100).toFixed(2) + '%' : '0%'
      },
      detailedMetrics: {
        requests: snapshot.requests,
        responseTime: snapshot.responseTime,
        errors: snapshot.errors,
        memory: snapshot.memoryUsage,
        cache: snapshot.cache,
        threatIntelligence: snapshot.threatIntelligence
      },
      recommendations: this.generatePerformanceRecommendations(snapshot)
    };
    
    return report;
  }

  /**
   * 格式化持续时间
   */
  formatDuration(ms) {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (days > 0) return `${days}d ${hours % 24}h`;
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
  }

  /**
   * 格式化字节数
   */
  formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * 生成性能建议
   */
  generatePerformanceRecommendations(snapshot) {
    const recommendations = [];
    
    // 响应时间建议
    if (snapshot.responseTime.avg > 1000) {
      recommendations.push({
        priority: 'high',
        category: 'response_time',
        description: 'Average response time is high (>1000ms). Consider optimizing database queries or adding caching layers.',
        impact: 'user_experience'
      });
    }
    
    // 错误率建议
    const errorRate = snapshot.requests.total > 0 ? 
      snapshot.errors.total / snapshot.requests.total : 0;
    if (errorRate > 0.05) { // >5%错误率
      recommendations.push({
        priority: 'high',
        category: 'error_rate',
        description: 'High error rate detected (>5%). Investigate application logs for root cause.',
        impact: 'reliability'
      });
    }
    
    // 缓存命中率建议
    const hitRate = parseFloat(snapshot.cache.hitRate);
    if (hitRate < 70) { // <70%命中率
      recommendations.push({
        priority: 'medium',
        category: 'cache_efficiency',
        description: 'Low cache hit rate detected (<70%). Consider optimizing cache strategies.',
        impact: 'performance'
      });
    }
    
    // 内存使用建议
    if (snapshot.memoryUsage.heapUsed > 500 * 1024 * 1024) { // >500MB
      recommendations.push({
        priority: 'medium',
        category: 'memory_usage',
        description: 'High memory usage detected. Consider optimizing memory-intensive operations.',
        impact: 'stability'
      });
    }
    
    return recommendations;
  }

  /**
   * 获取性能趋势
   */
  getPerformanceTrends() {
    if (this.metrics.responseTimeHistory.length < 2) {
      return { available: false, message: 'Insufficient data for trend analysis' };
    }
    
    // 计算最近的响应时间趋势
    const recentData = this.metrics.responseTimeHistory.slice(-50); // 最近50个样本
    const times = recentData.map(item => item.responseTime);
    
    // 计算趋势（简单的线性回归）
    if (times.length < 2) {
      return { available: false, message: 'Insufficient data for trend analysis' };
    }
    
    let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;
    for (let i = 0; i < times.length; i++) {
      sumX += i;
      sumY += times[i];
      sumXY += i * times[i];
      sumXX += i * i;
    }
    
    const n = times.length;
    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    
    return {
      available: true,
      trend: slope > 0 ? 'increasing' : slope < 0 ? 'decreasing' : 'stable',
      slope: slope.toFixed(4),
      dataPoints: times.length
    };
  }
}

/**
 * 结构化日志记录器
 */
class StructuredLogger {
  constructor(options = {}) {
    this.options = {
      logFile: options.logFile || './logs/orasrs-service.log',
      level: options.level || 'info',
      maxFileSize: options.maxFileSize || 10 * 1024 * 1024, // 10MB
      maxFiles: options.maxFiles || 10,
      ...options
    };
    
    this.levels = {
      error: 0,
      warn: 1,
      info: 2,
      debug: 3
    };
    
    this.currentLogLevel = this.levels[this.options.level] || this.levels.info;
    
    // 确保日志目录存在
    this.ensureLogDirectory();
    
    console.log('Structured Logger initialized');
  }

  /**
   * 确保日志目录存在
   */
  ensureLogDirectory() {
    const logDir = path.dirname(this.options.logFile);
    
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
  }

  /**
   * 记录错误日志
   */
  error(message, data = {}) {
    if (this.currentLogLevel >= this.levels.error) {
      this.writeLog('error', message, data);
    }
  }

  /**
   * 记录警告日志
   */
  warn(message, data = {}) {
    if (this.currentLogLevel >= this.levels.warn) {
      this.writeLog('warn', message, data);
    }
  }

  /**
   * 记录信息日志
   */
  info(message, data = {}) {
    if (this.currentLogLevel >= this.levels.info) {
      this.writeLog('info', message, data);
    }
  }

  /**
   * 记录调试日志
   */
  debug(message, data = {}) {
    if (this.currentLogLevel >= this.levels.debug) {
      this.writeLog('debug', message, data);
    }
  }

  /**
   * 写入日志
   */
  writeLog(level, message, data) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      ...data
    };
    
    const logLine = JSON.stringify(logEntry) + '\n';
    
    // 同时输出到控制台和文件
    console.log(logLine.trim());
    
    // 写入文件
    try {
      fs.appendFileSync(this.options.logFile, logLine);
    } catch (error) {
      console.error('Failed to write log to file:', error);
    }
  }

  /**
   * 更改日志级别
   */
  setLogLevel(level) {
    this.currentLogLevel = this.levels[level] || this.levels.info;
    this.options.level = level;
  }

  /**
   * 获取日志级别
   */
  getLogLevel() {
    return this.options.level;
  }
}

/**
 * 格式化Prometheus指标
 */
function formatPrometheusMetrics(metrics) {
  let prometheusMetrics = '';
  
  // 基本指标
  prometheusMetrics += `# HELP orasrs_requests_total Total number of requests\n`;
  prometheusMetrics += `# TYPE orasrs_requests_total counter\n`;
  prometheusMetrics += `orasrs_requests_total ${metrics.requests.total}\n\n`;
  
  prometheusMetrics += `# HELP orasrs_request_duration_seconds Request duration in seconds\n`;
  prometheusMetrics += `# TYPE orasrs_request_duration_seconds gauge\n`;
  prometheusMetrics += `orasrs_request_duration_seconds{quantile="0.5"} ${metrics.responseTime.avg / 1000}\n`;
  prometheusMetrics += `orasrs_request_duration_seconds{quantile="0.95"} ${metrics.responseTime.p95 / 1000}\n`;
  prometheusMetrics += `orasrs_request_duration_seconds{quantile="0.99"} ${metrics.responseTime.p99 / 1000}\n\n`;
  
  prometheusMetrics += `# HELP orasrs_errors_total Total number of errors\n`;
  prometheusMetrics += `# TYPE orasrs_errors_total counter\n`;
  prometheusMetrics += `orasrs_errors_total ${metrics.errors.total}\n\n`;
  
  prometheusMetrics += `# HELP orasrs_cache_hit_rate Cache hit rate percentage\n`;
  prometheusMetrics += `# TYPE orasrs_cache_hit_rate gauge\n`;
  prometheusMetrics += `orasrs_cache_hit_rate ${parseFloat(metrics.cache.hitRate)}\n\n`;
  
  prometheusMetrics += `# HELP orasrs_memory_usage_bytes Memory usage in bytes\n`;
  prometheusMetrics += `# TYPE orasrs_memory_usage_bytes gauge\n`;
  prometheusMetrics += `orasrs_memory_usage_bytes{type="heap_used"} ${metrics.memoryUsage.heapUsed}\n`;
  prometheusMetrics += `orasrs_memory_usage_bytes{type="heap_total"} ${metrics.memoryUsage.heapTotal}\n`;
  prometheusMetrics += `orasrs_memory_usage_bytes{type="rss"} ${metrics.memoryUsage.rss}\n\n`;
  
  // 按方法统计的请求数
  for (const [method, count] of Object.entries(metrics.requests.byMethod)) {
    prometheusMetrics += `orasrs_requests_by_method_total{method="${method}"} ${count}\n`;
  }
  
  prometheusMetrics += `\n`;
  
  // 按状态码统计的请求数
  for (const [statusCode, count] of Object.entries(metrics.requests.byStatusCode)) {
    prometheusMetrics += `orasrs_requests_by_status_total{status="${statusCode}"} ${count}\n`;
  }
  
  prometheusMetrics += `\n`;
  
  // 按错误类型统计的错误数
  for (const [errorType, count] of Object.entries(metrics.errors.byType)) {
    prometheusMetrics += `orasrs_errors_by_type_total{type="${errorType}"} ${count}\n`;
  }
  
  return prometheusMetrics;
}

export {
  MetricsCollector,
  StructuredLogger,
  formatPrometheusMetrics
};