/**
 * OraSRS 威胁检测模块
 * 实现三种威胁检测方法：日志分析、蜜罐、深度包检测
 */

import fs from 'fs';
import { spawn } from 'child_process';
import http from 'http';

class ThreatDetection {
  constructor(blockchainConnector) {
    this.blockchainConnector = blockchainConnector;
    this.logPatterns = {
      sshBruteForce: /Failed password for (?:invalid user |root )?(\S+) from (\d+\.\d+\.\d+\.\d+) port/,
      nginx404Scan: /(\d+\.\d+\.\d+\.\d+) - - \[.+\] "GET \S+ HTTP\/\d\.\d" 404/,
      portScan: /Connection from (\d+\.\d+\.\d+\.\d+) port \d+ on \d+\.\d+\.\d+\.\d+/
    };
    
    this.bruteForceThreshold = 5; // 1分钟内的失败次数阈值
    this.timeWindow = 60000; // 1分钟时间窗口
    this.attackLog = {}; // 记录攻击IP和时间戳
    
    // 蜜罐端口配置
    this.honeypotPorts = [23, 3306, 1433, 5432]; // telnet, mysql, mssql, postgres
    this.honeypotConnections = new Set();
    
    // 检测到的威胁
    this.threats = [];
  }

  // 1. 基于日志的分析 (Fail2Ban原理)
  startLogMonitoring() {
    console.log('启动日志监控...');
    
    // 监控SSH认证日志
    if (fs.existsSync('/var/log/auth.log')) {
      this.monitorLogFile('/var/log/auth.log');
    } else {
      console.log('警告: /var/log/auth.log 不存在，尝试 /var/log/secure');
      if (fs.existsSync('/var/log/secure')) {
        this.monitorLogFile('/var/log/secure');
      }
    }
    
    // 监控Web服务器日志
    if (fs.existsSync('/var/log/nginx/access.log')) {
      this.monitorLogFile('/var/log/nginx/access.log');
    } else if (fs.existsSync('/var/log/apache2/access.log')) {
      this.monitorLogFile('/var/log/apache2/access.log');
    }
  }

  monitorLogFile(filePath) {
    console.log(`监控日志文件: ${filePath}`);
    
    // 读取文件末尾内容
    const tailProcess = spawn('tail', ['-F', filePath]);
    
    tailProcess.stdout.on('data', (data) => {
      const lines = data.toString().split('\n');
      for (const line of lines) {
        if (line.trim()) {
          this.analyzeLogLine(line);
        }
      }
    });
    
    tailProcess.stderr.on('data', (data) => {
      console.error(`日志监控错误: ${data}`);
    });
    
    tailProcess.on('close', (code) => {
      console.log(`日志监控进程结束: ${code}`);
    });
  }

  analyzeLogLine(logLine) {
    // 检查SSH暴力破解
    const sshMatch = logLine.match(this.logPatterns.sshBruteForce);
    if (sshMatch) {
      const username = sshMatch[1];
      const ip = sshMatch[2];
      this.handleBruteForceAttempt(ip, 'SSH_BRUTE_FORCE', username);
    }
    
    // 检查Web扫描
    const nginxMatch = logLine.match(this.logPatterns.nginx404Scan);
    if (nginxMatch) {
      const ip = nginxMatch[1];
      this.handleWebScan(ip);
    }
    
    // 检查端口扫描
    const portScanMatch = logLine.match(this.logPatterns.portScan);
    if (portScanMatch) {
      const ip = portScanMatch[1];
      this.handlePortScan(ip);
    }
  }

  handleBruteForceAttempt(ip, attackType, username) {
    // 记录攻击时间
    if (!this.attackLog[ip]) {
      this.attackLog[ip] = [];
    }
    
    const now = Date.now();
    this.attackLog[ip].push({
      timestamp: now,
      type: attackType,
      username: username
    });
    
    // 过滤超过时间窗口的记录
    this.attackLog[ip] = this.attackLog[ip].filter(record => 
      now - record.timestamp < this.timeWindow
    );
    
    // 检查是否超过阈值
    if (this.attackLog[ip].length >= this.bruteForceThreshold) {
      console.log(`检测到暴力破解攻击: ${ip} (${this.attackLog[ip].length} 次在 ${this.timeWindow/1000} 秒内)`);
      
      // 报告威胁
      this.reportThreat({
        ip: ip,
        threatType: 'BRUTE_FORCE',
        threatLevel: 'High',
        context: `SSH暴力破解攻击，用户: ${username}`,
        evidence: logLine,
        timestamp: new Date().toISOString()
      });
      
      // 清除该IP的记录，避免重复报告
      delete this.attackLog[ip];
    }
  }

  handleWebScan(ip) {
    // 简单的404扫描检测
    const now = Date.now();
    if (!this.attackLog[ip]) {
      this.attackLog[ip] = [];
    }
    
    this.attackLog[ip].push({
      timestamp: now,
      type: 'WEB_SCAN',
      path: '404 Scan'
    });
    
    // 过滤时间窗口
    this.attackLog[ip] = this.attackLog[ip].filter(record => 
      now - record.timestamp < this.timeWindow
    );
    
    // 如果短时间内大量404，则标记为扫描
    const recentScans = this.attackLog[ip].filter(record => 
      record.type === 'WEB_SCAN' && now - record.timestamp < this.timeWindow
    );
    
    if (recentScans.length >= 10) { // 10次404请求在1分钟内
      console.log(`检测到Web扫描: ${ip} (${recentScans.length} 次404)`);
      
      this.reportThreat({
        ip: ip,
        threatType: 'WEB_SCAN',
        threatLevel: 'Medium',
        context: '大量的404请求，可能是Web扫描或爬虫',
        evidence: 'Multiple 404 requests',
        timestamp: new Date().toISOString()
      });
      
      // 只保留非扫描类型的记录
      this.attackLog[ip] = this.attackLog[ip].filter(record => record.type !== 'WEB_SCAN');
    }
  }

  handlePortScan(ip) {
    console.log(`检测到端口扫描: ${ip}`);
    
    this.reportThreat({
      ip: ip,
      threatType: 'PORT_SCAN',
      threatLevel: 'Medium',
      context: '连接到蜜罐端口，可能是端口扫描',
      evidence: 'Connection to honeypot port',
      timestamp: new Date().toISOString()
    });
  }

  // 2. 蜜罐技术
  startHoneypot() {
    console.log('启动蜜罐服务...');
    
    this.honeypotPorts.forEach(port => {
      this.createHoneypotServer(port);
    });
  }

  createHoneypotServer(port) {
    const server = http.createServer((req, res) => {
      // 蜜罐服务器不返回任何有用信息，只是记录连接
      res.writeHead(404, {'Content-Type': 'text/plain'});
      res.end('');
    });
    
    server.on('connection', (socket) => {
      const remoteAddress = socket.remoteAddress;
      console.log(`蜜罐连接检测: ${remoteAddress}:${socket.remotePort} -> :${port}`);
      
      // 记录蜜罐连接
      this.honeypotConnections.add(remoteAddress);
      
      // 立即报告威胁
      this.reportThreat({
        ip: remoteAddress,
        threatType: 'HONEYPOT_HIT',
        threatLevel: 'High',
        context: `连接到蜜罐端口 ${port}`,
        evidence: `Honeypot port ${port} hit`,
        timestamp: new Date().toISOString()
      });
    });
    
    server.listen(port, () => {
      console.log(`蜜罐服务器启动在端口 ${port}`);
    });
    
    server.on('error', (err) => {
      console.log(`蜜罐端口 ${port} 启动失败:`, err.message);
    });
  }

  // 3. 流量深度包检测 (DPI/NIDS) - 模拟实现
  startDPI() {
    console.log('启动深度包检测...');
    
    // 模拟检测常见攻击模式
    this.startNetworkTrafficMonitoring();
  }

  startNetworkTrafficMonitoring() {
    // 这里我们模拟检测网络流量
    // 在实际实现中，这将使用更底层的网络库如pcap来捕获网络包
    
    // 模拟检测SQL注入
    setInterval(() => {
      this.simulateNetworkTrafficAnalysis();
    }, 30000); // 每30秒模拟一次
  }

  simulateNetworkTrafficAnalysis() {
    // 模拟检测到的威胁
    const simulatedThreats = [
      {
        ip: '10.0.0.100',
        threatType: 'SQL_INJECTION',
        threatLevel: 'Critical',
        context: '检测到SQL注入攻击模式',
        evidence: 'SQL Injection pattern detected in network traffic',
        timestamp: new Date().toISOString()
      },
      {
        ip: '192.168.1.200',
        threatType: 'XSS_ATTACK',
        threatLevel: 'High',
        context: '检测到XSS攻击模式',
        evidence: 'XSS pattern detected in network traffic',
        timestamp: new Date().toISOString()
      }
    ];
    
    // 模拟随机检测
    if (Math.random() > 0.7) {
      const randomThreat = simulatedThreats[Math.floor(Math.random() * simulatedThreats.length)];
      if (Math.random() > 0.5) {
        console.log(`DPI检测到威胁: ${randomThreat.ip} - ${randomThreat.threatType}`);
        this.reportThreat(randomThreat);
      }
    }
  }

  async reportThreat(threatData) {
    // 将威胁数据添加到本地威胁列表
    this.threats.push(threatData);
    console.log(`威胁已记录: ${threatData.ip} - ${threatData.threatType}`);
    
    // 如果有区块链连接器，尝试提交到区块链
    if (this.blockchainConnector) {
      try {
        console.log(`尝试将威胁提交到区块链: ${threatData.ip}`);
        // 注意：这里需要根据实际的区块链连接器接口进行调整
        // await this.blockchainConnector.submitThreatReport(threatData);
      } catch (error) {
        console.error('提交威胁到区块链失败:', error.message);
      }
    }
  }

  // 获取检测到的威胁列表
  getThreats() {
    return this.threats;
  }

  // 获取威胁统计
  getThreatStats() {
    const stats = {
      total: this.threats.length,
      byType: {},
      byLevel: {}
    };
    
    for (const threat of this.threats) {
      // 按类型统计
      stats.byType[threat.threatType] = (stats.byType[threat.threatType] || 0) + 1;
      
      // 按级别统计
      stats.byLevel[threat.threatLevel] = (stats.byLevel[threat.threatLevel] || 0) + 1;
    }
    
    return stats;
  }
}

export default ThreatDetection;
