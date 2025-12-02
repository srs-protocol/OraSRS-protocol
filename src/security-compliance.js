/**
 * OraSRS 数据安全与合规模块
 * 实现国密算法、数据加密和合规性功能
 */

const crypto = require('crypto');

class SecurityCompliance {
  constructor(options = {}) {
    // 是否启用国密算法
    this.useSM2 = options.useSM2 || false;
    this.useSM3 = options.useSM3 || false;
    this.useSM4 = options.useSM4 || true; // 默认启用SM4加密
    
    // 数据不出境标志
    this.dataLocation = options.dataLocation || 'CN'; // 数据存储位置
    
    // IP地址哈希盐值
    this.ipHashSalt = options.ipHashSalt || crypto.randomBytes(16).toString('hex');
  }

  /**
   * 使用SM4加密数据
   */
  encryptWithSM4(data, key) {
    // 由于Node.js标准库不直接支持SM4，这里模拟实现
    // 在实际部署中，应使用支持国密算法的库如：gm-crypto, node-gm 等
    
    if (!this.useSM4) {
      // 如果不使用SM4，则使用标准AES加密
      return this.encryptWithAES(data, key);
    }
    
    // 模拟SM4加密（在实际实现中应使用真实的SM4算法）
    console.log('使用SM4加密数据');
    
    // 使用AES作为模拟（在实际部署中替换为真实SM4）
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-cbc', this.padKey(key), iv);
    
    let encrypted = cipher.update(JSON.stringify(data), 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    return {
      encryptedData: encrypted,
      iv: iv.toString('hex'),
      algorithm: 'SM4' // 标记为SM4，实际为模拟
    };
  }

  /**
   * 使用AES加密数据（模拟SM4）
   */
  encryptWithAES(data, key) {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-cbc', this.padKey(key), iv);
    
    let encrypted = cipher.update(JSON.stringify(data), 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    return {
      encryptedData: encrypted,
      iv: iv.toString('hex'),
      algorithm: 'AES-256-CBC'
    };
  }

  /**
   * 解密数据
   */
  decryptData(encryptedPackage, key) {
    const { encryptedData, iv, algorithm } = encryptedPackage;
    const decipher = crypto.createDecipheriv(
      'aes-256-cbc', 
      this.padKey(key), 
      Buffer.from(iv, 'hex')
    );
    
    let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return JSON.parse(decrypted);
  }

  /**
   * 使用SM3哈希数据
   */
  hashWithSM3(data) {
    if (this.useSM3) {
      console.log('使用SM3哈希数据');
      // 模拟SM3（在实际部署中应使用真实的SM3算法）
      return crypto.createHash('sha256').update(data).digest('hex');
    } else {
      // 使用SHA256作为替代
      return crypto.createHash('sha256').update(data).digest('hex');
    }
  }

  /**
   * IP地址哈希（用于隐私保护）
   */
  hashIP(ipAddress) {
    // 使用SHA3-256 + Salt 哈希IP地址
    const saltedIP = ipAddress + this.ipHashSalt;
    return crypto.createHash('sha3-256').update(saltedIP).digest('hex');
  }

  /**
   * 数据脱敏处理
   */
  sanitizeData(data) {
    const sanitized = { ...data };
    
    // 脱敏IP地址
    if (sanitized.ip) {
      sanitized.ip = this.hashIP(sanitized.ip);
    }
    
    // 脱敏其他敏感信息
    if (sanitized.email && sanitized.email.includes('@')) {
      const [localPart, domain] = sanitized.email.split('@');
      sanitized.email = localPart.substring(0, 2) + '***@' + domain;
    }
    
    if (sanitized.phone) {
      sanitized.phone = sanitized.phone.substring(0, 3) + '****' + sanitized.phone.substring(7);
    }
    
    return sanitized;
  }

  /**
   * 检查数据是否在中国境内
   */
  isDataInChina(dataLocation) {
    const chinaLocations = ['CN', 'China', '中国', 'Mainland China'];
    return chinaLocations.includes(dataLocation || this.dataLocation);
  }

  /**
   * 生成合规报告
   */
  generateComplianceReport() {
    return {
      timestamp: new Date().toISOString(),
      dataLocation: this.dataLocation,
      dataInChina: this.isDataInChina(),
      encryptionEnabled: this.useSM4,
      smAlgorithms: {
        sm2: this.useSM2,
        sm3: this.useSM3,
        sm4: this.useSM4
      },
      ipHashingEnabled: true,
      dataSanitizationEnabled: true
    };
  }

  /**
   * 密钥对齐（用于加密）
   */
  padKey(key) {
    // 将密钥填充或截断到32字节（AES-256需要）
    let keyStr = typeof key === 'string' ? key : JSON.stringify(key);
    if (keyStr.length > 32) {
      return Buffer.from(keyStr.substring(0, 32));
    } else {
      return Buffer.from(keyStr.padEnd(32, '0'));
    }
  }

  /**
   * 验证区块链备案信息
   */
  validateBlockchainFiling(filingNumber) {
    // 模拟验证区块链备案号
    // 在实际实现中，需要对接国家网信办备案系统API
    if (!filingNumber) {
      return false;
    }
    
    // 简单格式验证
    const filingRegex = /^[A-Z0-9]+$/;
    return filingRegex.test(filingNumber) && filingNumber.length >= 8;
  }

  /**
   * 验证企业营业执照
   */
  validateBusinessLicense(licenseNumber) {
    // 模拟验证企业营业执照
    // 在实际实现中，需要对接工商部门的验证系统
    if (!licenseNumber) {
      return false;
    }
    
    // 简单格式验证
    const licenseRegex = /^([A-Z0-9]{18}|[A-Z0-9]{15})$/; // 统一社会信用代码格式
    return licenseRegex.test(licenseNumber);
  }

  /**
   * 创建数字证书（模拟CFCA证书）
   */
  createDigitalCertificate(subjectInfo, validityPeriod = 365) {
    const cert = {
      serialNumber: crypto.randomBytes(8).toString('hex'),
      subject: subjectInfo,
      issuer: 'CFCA',
      validity: {
        notBefore: new Date().toISOString(),
        notAfter: new Date(Date.now() + validityPeriod * 24 * 60 * 60 * 1000).toISOString()
      },
      publicKey: crypto.randomBytes(32).toString('hex'),
      signature: crypto.randomBytes(64).toString('hex'),
      createdAt: new Date().toISOString()
    };
    
    return cert;
  }

  /**
   * 验证数字证书（模拟）
   */
  validateDigitalCertificate(certificate) {
    if (!certificate || !certificate.signature) {
      return false;
    }
    
    // 检查证书是否过期
    const now = new Date();
    const notAfter = new Date(certificate.validity.notAfter);
    
    return now < notAfter;
  }
}

module.exports = SecurityCompliance;