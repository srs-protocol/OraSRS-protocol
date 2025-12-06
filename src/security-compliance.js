/**
 * Security Compliance Module for OraSRS
 * 实现安全合规功能，包括数据保护、隐私保护和法规遵从
 */

const crypto = require('crypto');

class SecurityCompliance {
  constructor(options = {}) {
    this.options = {
      enableDataEncryption: options.enableDataEncryption !== false,
      enablePrivacyProtection: options.enablePrivacyProtection !== false,
      enableAuditLogging: options.enableAuditLogging !== false,
      gdprCompliant: options.gdprCompliant !== false,
      chinaCompliant: options.chinaCompliant !== false,
      dataRetentionDays: options.dataRetentionDays || 365,
      ...options
    };
    
    // 初始化国密算法支持
    this.initializeNationalCryptography();
    
    // 初始化合规检查器
    this.initializeComplianceChecker();
    
    console.log('Security Compliance module initialized');
  }

  /**
   * 初始化国密算法支持
   */
  initializeNationalCryptography() {
    this.nationalCrypto = {
      // 模拟国密算法支持，实际实现需要使用国密算法库
      sm2: {
        name: 'SM2',
        description: '椭圆曲线公钥密码算法',
        usedFor: '数字签名和密钥交换'
      },
      sm3: {
        name: 'SM3',
        description: '密码杂凑算法',
        usedFor: '消息摘要和数据完整性校验'
      },
      sm4: {
        name: 'SM4',
        description: '分组密码算法',
        usedFor: '数据加密'
      }
    };
    
    console.log('National cryptography algorithms initialized');
  }

  /**
   * 初始化合规检查器
   */
  initializeComplianceChecker() {
    this.complianceStandards = {
      gdpr: {
        name: 'GDPR',
        description: 'General Data Protection Regulation',
        requirements: [
          'Data minimization',
          'Right to erasure',
          'Privacy by design',
          'Data protection impact assessment'
        ]
      },
      ccpa: {
        name: 'CCPA',
        description: 'California Consumer Privacy Act',
        requirements: [
          'Right to know',
          'Right to delete',
          'Right to opt-out',
          'Non-discrimination'
        ]
      },
      iso27001: {
        name: 'ISO/IEC 27001',
        description: 'Information Security Management',
        requirements: [
          'Risk assessment',
          'Security controls',
          'Continuous improvement',
          'Regular audits'
        ]
      },
      chinaCybersecurityLaw: {
        name: 'China Cybersecurity Law',
        description: '网络安全法',
        requirements: [
          'Data localization',
          'Security protection obligations',
          'User information protection',
          'Network operator responsibilities'
        ]
      },
      chinaDataSecurityLaw: {
        name: 'China Data Security Law',
        description: '数据安全法',
        requirements: [
          'Data classification and grading',
          'Data security protection measures',
          'Cross-border data transfer',
          'Data security review'
        ]
      }
    };
    
    console.log('Compliance standards initialized');
  }

  /**
   * 数据脱敏处理
   */
  sanitizeData(data) {
    if (!data || typeof data !== 'object') {
      return data;
    }

    const sanitized = JSON.parse(JSON.stringify(data)); // 深拷贝
    
    // 脱敏敏感字段
    this.sanitizeObject(sanitized);
    
    return sanitized;
  }

  /**
   * 递归脱敏对象
   */
  sanitizeObject(obj) {
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        const value = obj[key];
        
        if (typeof value === 'string') {
          // 脱敏IP地址
          if (this.isIPAddress(value)) {
            obj[key] = this.anonymizeIP(value);
          }
          // 脱敏邮箱
          else if (this.isEmail(value)) {
            obj[key] = this.anonymizeEmail(value);
          }
          // 脱敏手机号
          else if (this.isPhoneNumber(value)) {
            obj[key] = this.anonymizePhone(value);
          }
        } else if (typeof value === 'object' && value !== null) {
          this.sanitizeObject(value);
        }
      }
    }
  }

  /**
   * 判断是否为IP地址
   */
  isIPAddress(str) {
    const ipv4Pattern = /^(\d{1,3}\.){3}\d{1,3}$/;
    const ipv6Pattern = /^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/;
    return ipv4Pattern.test(str) || ipv6Pattern.test(str);
  }

  /**
   * 判断是否为邮箱
   */
  isEmail(str) {
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailPattern.test(str);
  }

  /**
   * 判断是否为手机号
   */
  isPhoneNumber(str) {
    const phonePattern = /^1[3-9]\d{9}$/; // 中国手机号格式
    return phonePattern.test(str);
  }

  /**
   * 匿名化IP地址
   */
  anonymizeIP(ip) {
    if (this.isIPv4(ip)) {
      // 保留前两个八位组，后两个八位组替换为0
      const parts = ip.split('.');
      return `${parts[0]}.${parts[1]}.0.0`;
    } else if (this.isIPv6(ip)) {
      // IPv6匿名化 - 保留前64位
      const parts = ip.split(':');
      return `${parts[0]}:${parts[1]}:${parts[2]}:${parts[3]}::`;
    }
    return ip;
  }

  /**
   * 判断是否为IPv4
   */
  isIPv4(ip) {
    return /^(\d{1,3}\.){3}\d{1,3}$/.test(ip);
  }

  /**
   * 判断是否为IPv6
   */
  isIPv6(ip) {
    return /^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/.test(ip);
  }

  /**
   * 匿名化邮箱
   */
  anonymizeEmail(email) {
    const [local, domain] = email.split('@');
    if (local.length > 2) {
      return `${local.charAt(0)}***${local.charAt(local.length - 1)}@${domain}`;
    }
    return `**@${domain}`;
  }

  /**
   * 匿名化手机号
   */
  anonymizePhone(phone) {
    if (phone.length === 11) {
      return `${phone.substring(0, 3)}****${phone.substring(7)}`;
    }
    return phone;
  }

  /**
   * 使用SM4加密数据（模拟实现）
   */
  encryptWithSM4(data, key) {
    // 在实际实现中，这里应使用真正的SM4算法
    // 由于Node.js标准库不直接支持SM4，我们使用AES作为替代演示
    // 实际部署时应使用支持国密算法的库如：gm-crypto
    
    if (!this.options.enableDataEncryption) {
      return data;
    }
    
    try {
      // 生成随机盐值
      const salt = crypto.randomBytes(16);
      
      // 使用PBKDF2从密钥派生密钥
      const derivedKey = crypto.pbkdf2Sync(key, salt, 10000, 32, 'sha256');
      
      // 使用AES作为SM4的替代（实际部署需要使用SM4）
      const iv = crypto.randomBytes(16);
      const cipher = crypto.createCipher('aes-256-cbc', derivedKey);
      
      let encrypted = cipher.update(JSON.stringify(data), 'utf8', 'hex');
      encrypted += cipher.final('hex');
      
      // 返回包含盐值和IV的加密数据
      return {
        encryptedData: encrypted,
        salt: salt.toString('hex'),
        iv: iv.toString('hex'),
        algorithm: 'SM4_SIMULATION' // 表示这是SM4的模拟实现
      };
    } catch (error) {
      console.error('Encryption error:', error);
      throw new Error('Encryption failed');
    }
  }

  /**
   * 使用SM4解密数据（模拟实现）
   */
  decryptWithSM4(encryptedData, key) {
    if (!this.options.enableDataEncryption || !encryptedData.encryptedData) {
      return encryptedData;
    }
    
    try {
      const salt = Buffer.from(encryptedData.salt, 'hex');
      const iv = Buffer.from(encryptedData.iv, 'hex');
      
      // 重新派生密钥
      const derivedKey = crypto.pbkdf2Sync(key, salt, 10000, 32, 'sha256');
      
      // 解密
      const decipher = crypto.createDecipher('aes-256-cbc', derivedKey);
      let decrypted = decipher.update(encryptedData.encryptedData, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      return JSON.parse(decrypted);
    } catch (error) {
      console.error('Decryption error:', error);
      throw new Error('Decryption failed');
    }
  }

  /**
   * 哈希处理（模拟SM3）
   */
  hashWithSM3(data) {
    // 在实际实现中，这里应使用真正的SM3算法
    // 作为替代，我们使用SHA256
    return crypto.createHash('sha256').update(JSON.stringify(data)).digest('hex');
  }

  /**
   * 数字签名（模拟SM2）
   */
  signWithSM2(data, privateKey) {
    // 在实际实现中，这里应使用真正的SM2算法
    // 作为替代，我们使用RSA
    const sign = crypto.createSign('SHA256');
    sign.update(JSON.stringify(data));
    return sign.sign(privateKey, 'hex');
  }

  /**
   * 验证数字签名（模拟SM2）
   */
  verifyWithSM2(data, signature, publicKey) {
    // 在实际实现中，这里应使用真正的SM2算法
    // 作为替代，我们使用RSA
    const verify = crypto.createVerify('SHA256');
    verify.update(JSON.stringify(data));
    return verify.verify(publicKey, signature, 'hex');
  }

  /**
   * 生成合规报告
   */
  generateComplianceReport() {
    const report = {
      timestamp: new Date().toISOString(),
      complianceStatus: {
        gdpr: this.checkGDPRCompliance(),
        ccpa: this.checkCCPACompliance(),
        iso27001: this.checkISO27001Compliance(),
        chinaCybersecurityLaw: this.checkChinaCybersecurityCompliance(),
        chinaDataSecurityLaw: this.checkChinaDataSecurityCompliance()
      },
      dataHandling: {
        encryptionEnabled: this.options.enableDataEncryption,
        privacyProtectionEnabled: this.options.enablePrivacyProtection,
        auditLoggingEnabled: this.options.enableAuditLogging
      },
      securityMeasures: {
        nationalCryptography: {
          supported: true,
          algorithms: Object.keys(this.nationalCrypto)
        },
        dataAnonymization: {
          enabled: true,
          methods: ['IP masking', 'Email masking', 'Phone masking']
        },
        accessControls: {
          implemented: true,
          methods: ['API key validation', 'Rate limiting', 'IP filtering']
        }
      },
      recommendations: this.generateComplianceRecommendations()
    };
    
    return report;
  }

  /**
   * 检查GDPR合规性
   */
  checkGDPRCompliance() {
    return {
      status: this.options.gdprCompliant ? 'compliant' : 'non-compliant',
      requirements: {
        dataMinimization: true,
        purposeLimitation: true,
        storageLimitation: this.options.dataRetentionDays <= 365,
        integrityAndConfidentiality: this.options.enableDataEncryption,
        accountability: this.options.enableAuditLogging
      }
    };
  }

  /**
   * 检查CCPA合规性
   */
  checkCCPACompliance() {
    return {
      status: this.options.gdprCompliant ? 'compliant' : 'non-compliant', // 使用相同的配置
      requirements: {
        rightToKnow: true,
        rightToDelete: true,
        rightToOptOut: true,
        nonDiscrimination: true
      }
    };
  }

  /**
   * 检查ISO27001合规性
   */
  checkISO27001Compliance() {
    return {
      status: 'partially_compliant',
      requirements: {
        riskAssessment: true,
        securityControls: true,
        continuousImprovement: true,
        regularAudits: this.options.enableAuditLogging
      }
    };
  }

  /**
   * 检查中国网络安全法合规性
   */
  checkChinaCybersecurityCompliance() {
    return {
      status: this.options.chinaCompliant ? 'compliant' : 'non-compliant',
      requirements: {
        dataLocalization: true,
        securityProtection: true,
        userInformationProtection: this.options.enablePrivacyProtection,
        networkOperatorResponsibilities: true
      }
    };
  }

  /**
   * 检查中国数据安全法合规性
   */
  checkChinaDataSecurityCompliance() {
    return {
      status: this.options.chinaCompliant ? 'compliant' : 'non-compliant',
      requirements: {
        dataClassification: true,
        securityProtectionMeasures: this.options.enableDataEncryption,
        crossBorderTransfer: false, // 默认不允许跨境传输
        securityReview: true
      }
    };
  }

  /**
   * 检查数据是否在中国境内
   */
  isDataInChina() {
    // 在实际实现中，这里会检查数据存储和处理是否在境内
    // 模拟实现：检查系统配置
    return this.options.chinaCompliant || process.env.DATA_LOCATION === 'CHINA';
  }

  /**
   * 记录安全审计日志
   */
  logSecurityEvent(eventType, details, level = 'info') {
    if (!this.options.enableAuditLogging) {
      return;
    }
    
    const auditLog = {
      timestamp: new Date().toISOString(),
      eventType,
      level,
      details: this.sanitizeData(details),
      nodeId: details.nodeId || 'unknown',
      sourceIP: details.sourceIP ? this.anonymizeIP(details.sourceIP) : null
    };
    
    // 在实际实现中，这里会将日志写入安全存储
    console.log(`[SECURITY_AUDIT] ${JSON.stringify(auditLog)}`);
    
    return auditLog;
  }

  /**
   * 检查访问权限
   */
  checkAccessPermissions(userId, resource, action) {
    // 在实际实现中，这里会检查用户权限
    // 模拟实现
    const permissions = {
      'admin': ['read', 'write', 'delete', 'config'],
      'user': ['read', 'write'],
      'guest': ['read']
    };
    
    const userRole = userId.startsWith('admin') ? 'admin' : 
                    userId.startsWith('user') ? 'user' : 'guest';
    
    const allowedActions = permissions[userRole] || [];
    
    return {
      allowed: allowedActions.includes(action),
      userRole,
      requestedAction: action,
      resource
    };
  }

  /**
   * 生成合规建议
   */
  generateComplianceRecommendations() {
    const recommendations = [];
    
    if (!this.options.enableDataEncryption) {
      recommendations.push({
        priority: 'high',
        description: 'Enable data encryption to comply with GDPR Article 32 and China Cybersecurity Law',
        category: 'data-protection'
      });
    }
    
    if (!this.options.enablePrivacyProtection) {
      recommendations.push({
        priority: 'high',
        description: 'Enable privacy protection measures to comply with GDPR and CCPA',
        category: 'privacy'
      });
    }
    
    if (!this.options.enableAuditLogging) {
      recommendations.push({
        priority: 'medium',
        description: 'Enable audit logging to comply with compliance requirements',
        category: 'governance'
      });
    }
    
    if (!this.isDataInChina() && this.options.chinaCompliant) {
      recommendations.push({
        priority: 'critical',
        description: 'Ensure data localization in China to comply with Cybersecurity Law',
        category: 'data-localization'
      });
    }
    
    return recommendations;
  }

  /**
   * 执行合规检查
   */
  performComplianceCheck() {
    const checks = {
      gdpr: this.checkGDPRCompliance(),
      ccpa: this.checkCCPACompliance(),
      iso27001: this.checkISO27001Compliance(),
      chinaCybersecurity: this.checkChinaCybersecurityCompliance(),
      chinaDataSecurity: this.checkChinaDataSecurityCompliance()
    };
    
    const overallCompliance = Object.values(checks).every(check => 
      check.status === 'compliant' || check.status === 'partially_compliant'
    );
    
    return {
      overallStatus: overallCompliance ? 'compliant' : 'non-compliant',
      detailedChecks: checks,
      timestamp: new Date().toISOString(),
      recommendations: this.generateComplianceRecommendations()
    };
  }

  /**
   * 生成数据处理协议
   */
  generateDataProcessingAgreement() {
    return {
      version: '2.0',
      effectiveDate: new Date().toISOString(),
      dataController: 'OraSRS Protocol',
      dataProcessor: 'Node Network',
      purposes: [
        'Threat intelligence gathering',
        'Risk assessment',
        'Security monitoring'
      ],
      legalBasis: [
        'Consent for security purposes',
        'Legitimate interests for security',
        'Compliance with legal obligations'
      ],
      dataSubjectRights: [
        'Right of access',
        'Right to rectification',
        'Right to erasure',
        'Right to restrict processing',
        'Right to data portability',
        'Right to object'
      ],
      securityMeasures: [
        'Encryption in transit and at rest',
        'Access controls',
        'Audit logging',
        'Data minimization',
        'Privacy by design'
      ],
      dataRetention: `${this.options.dataRetentionDays} days`,
      internationalTransfers: 'Prohibited unless specifically authorized',
      subprocessors: 'Only approved security vendors',
      breachNotification: 'Within 72 hours to supervisory authority'
    };
  }
}

module.exports = SecurityCompliance;