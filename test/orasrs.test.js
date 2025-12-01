/**
 * OraSRS 基本功能单元测试
 */

const assert = require('assert');
const SRSEngine = require('./srs-engine');
const { MetricsCollector, StructuredLogger } = require('./src/monitoring');
const FederatedLearning = require('./src/federated-learning');
const AuthRateLimit = require('./src/auth-rate-limit');

describe('OraSRS Engine Tests', () => {
  let srsEngine;

  beforeEach(() => {
    srsEngine = new SRSEngine();
  });

  test('should create risk assessment for valid IP', async () => {
    const result = await srsEngine.getRiskAssessment('1.2.3.4');
    
    expect(result).toHaveProperty('query');
    expect(result).toHaveProperty('response');
    expect(result.query.ip).toBe('1.2.3.4');
    expect(result.response).toHaveProperty('risk_score');
    expect(typeof result.response.risk_score).toBe('number');
  });

  test('should bypass critical services', async () => {
    const result = await srsEngine.getRiskAssessment('8.8.8.8'); // Google DNS
    
    expect(result.response.risk_score).toBe(0);
    expect(result.response.bypass).toBe(true);
  });

  test('should handle appeal requests', async () => {
    const appealResult = await srsEngine.processAppeal('192.168.1.100', 'legitimate_traffic');
    
    expect(appealResult).toHaveProperty('appeal_id');
    expect(appealResult).toHaveProperty('status');
    expect(appealResult.status).toBe('received');
  });

  test('should generate explanation for IP', () => {
    const explanation = srsEngine.getExplanation('1.2.3.4');
    
    expect(explanation).toHaveProperty('ip');
    expect(explanation.ip).toBe('1.2.3.4');
  });
});

describe('Monitoring Tests', () => {
  test('should create metrics collector', () => {
    const metrics = new MetricsCollector();
    
    expect(metrics).toBeDefined();
    expect(metrics.getMetricsSnapshot).toBeDefined();
  });

  test('should record request metrics', () => {
    const metrics = new MetricsCollector();
    
    metrics.recordRequest('GET', '/test', 200, 100);
    
    const snapshot = metrics.getMetricsSnapshot();
    expect(snapshot.requests.total).toBe(1);
    expect(snapshot.requests.byMethod.GET).toBe(1);
    expect(snapshot.requests.byStatusCode['200']).toBe(1);
  });

  test('should create structured logger', () => {
    const logger = new StructuredLogger({ level: 'info' });
    
    expect(logger).toBeDefined();
    expect(logger.info).toBeDefined();
    expect(logger.error).toBeDefined();
  });
});

describe('Federated Learning Tests', () => {
  test('should create federated learning instance', () => {
    const fl = new FederatedLearning();
    
    expect(fl).toBeDefined();
    expect(fl.registerNode).toBeDefined();
    expect(fl.collectLocalUpdates).toBeDefined();
  });

  test('should register node', () => {
    const fl = new FederatedLearning();
    
    fl.registerNode('test-node', { location: 'us-east' });
    
    expect(fl.nodes.has('test-node')).toBe(true);
  });
});

describe('Auth & Rate Limit Tests', () => {
  test('should create auth rate limiter', () => {
    const auth = new AuthRateLimit();
    
    expect(auth).toBeDefined();
    expect(auth.createApiKey).toBeDefined();
    expect(auth.validateApiKey).toBeDefined();
  });

  test('should create and validate API key', () => {
    const auth = new AuthRateLimit();
    const apiKeyData = auth.createApiKey({ name: 'test-key' });
    
    expect(apiKeyData).toBeDefined();
    expect(apiKeyData.key).toBeDefined();
    
    const validation = auth.validateApiKey(apiKeyData.key);
    expect(validation.valid).toBe(true);
  });
});

// 兼容 Node.js 的 assert 和 Jest 的 expect
function expect(actual) {
  return {
    toBe: (expected) => assert.strictEqual(actual, expected),
    toHaveProperty: (prop) => assert.ok(prop in actual),
    toBeDefined: () => assert.ok(actual !== undefined),
    toBeTruthy: () => assert.ok(!!actual),
    toBeGreaterThan: (num) => assert.ok(actual > num),
    toBeGreaterThanOrEqual: (num) => assert.ok(actual >= num),
    toBeLessThanOrEqual: (num) => assert.ok(actual <= num),
    toBeInstanceOf: (constructor) => assert.ok(actual instanceof constructor)
  };
}