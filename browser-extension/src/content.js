/**
 * OraSRS Browser Extension - 轻量级威胁情报插件
 * 连接到 OraSRS 協議鏈 (api.orasrs.net)
 * 基於威脅情報的網頁安全防護插件
 */

class OraSRSSecurityPlugin {
  constructor(options = {}) {
    this.options = {
      apiEndpoint: options.apiEndpoint || 'https://api.orasrs.net',
      contractAddress: options.contractAddress || '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512',
      updateInterval: options.updateInterval || 300000, // 5分鐘更新一次
      cacheTTL: options.cacheTTL || 86400, // 24小時TTL
      ...options
    };

    // 威脅緩存
    this.threatCache = {
      ips: new Set(),
      domains: new Set(),
      urls: new Set(),
      lastUpdate: 0,
      updateInProgress: false
    };

    // 初始化
    this.init();
  }

  /**
   * 初始化插件
   */
  async init() {
    console.log('OraSRS Security Plugin Initializing...');
    
    // 加載本地緩存的威脅數據
    await this.loadLocalCache();
    
    // 開始定期更新
    this.startPeriodicUpdate();
    
    // 監聽網頁活動
    this.setupWebMonitoring();
    
    console.log('OraSRS Security Plugin Initialized');
  }

  /**
   * 加載本地緩存的威脅數據
   */
  async loadLocalCache() {
    try {
      const cachedData = localStorage.getItem('orasrs-threat-cache');
      if (cachedData) {
        const cache = JSON.parse(cachedData);
        if (cache.timestamp && (Date.now() - cache.timestamp) < this.options.cacheTTL * 1000) {
          this.threatCache.ips = new Set(cache.ips || []);
          this.threatCache.domains = new Set(cache.domains || []);
          this.threatCache.urls = new Set(cache.urls || []);
          this.threatCache.lastUpdate = cache.timestamp;
          console.log('Loaded threat cache from local storage');
        } else {
          console.log('Cached data expired, will fetch new data');
        }
      }
    } catch (error) {
      console.error('Error loading local cache:', error);
    }
  }

  /**
   * 保存威脅數據到本地緩存
   */
  saveToCache() {
    try {
      const cacheData = {
        ips: Array.from(this.threatCache.ips),
        domains: Array.from(this.threatCache.domains),
        urls: Array.from(this.threatCache.urls),
        timestamp: Date.now()
      };
      localStorage.setItem('orasrs-threat-cache', JSON.stringify(cacheData));
      console.log('Threat data saved to local cache');
    } catch (error) {
      console.error('Error saving to cache:', error);
    }
  }

  /**
   * 從 OraSRS 協議鏈獲取威脅情報
   */
  async fetchThreatIntelligence() {
    if (this.threatCache.updateInProgress) {
      console.log('Update already in progress, skipping...');
      return;
    }

    this.threatCache.updateInProgress = true;
    
    try {
      console.log('Fetching threat intelligence from OraSRS protocol chain...');
      
      // 這裡我們模擬從 OraSRS 協議鏈獲取數據
      // 在實際實現中，這將連接到 api.orasrs.net 的 API
      const response = await fetch(`${this.options.apiEndpoint}/orasrs/v2/threat-list`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      // 更新威脅緩存
      if (data.threat_list && Array.isArray(data.threat_list)) {
        data.threat_list.forEach(threat => {
          if (threat.ip) {
            this.threatCache.ips.add(threat.ip);
          }
          // 這裡可以添加對域名和其他類型的處理
        });
        
        this.threatCache.lastUpdate = Date.now();
        this.saveToCache();
        
        console.log(`Updated threat cache with ${data.threat_list.length} threats`);
      }
      
    } catch (error) {
      console.error('Error fetching threat intelligence:', error);
    } finally {
      this.threatCache.updateInProgress = false;
    }
  }

  /**
   * 開始定期更新威脅數據
   */
  startPeriodicUpdate() {
    // 立即更新一次
    this.fetchThreatIntelligence();
    
    // 設置定期更新
    setInterval(() => {
      this.fetchThreatIntelligence();
    }, this.options.updateInterval);
  }

  /**
   * 檢查 IP 是否為威脅
   */
  isThreatIP(ip) {
    return this.threatCache.ips.has(ip);
  }

  /**
   * 檢查域是否為威脅
   */
  isThreatDomain(domain) {
    // 檢查完全匹配
    if (this.threatCache.domains.has(domain)) {
      return true;
    }
    
    // 檢查子域匹配
    const domainParts = domain.split('.');
    for (let i = 0; i < domainParts.length - 1; i++) {
      const subDomain = domainParts.slice(i).join('.');
      if (this.threatCache.domains.has(subDomain)) {
        return true;
      }
    }
    
    return false;
  }

  /**
   * 檢查 URL 是否為威脅
   */
  isThreatURL(url) {
    try {
      const urlObj = new URL(url);
      return this.isThreatDomain(urlObj.hostname) || this.threatCache.urls.has(url);
    } catch (error) {
      console.error('Error parsing URL:', error);
      return false;
    }
  }

  /**
   * 設置網頁監控
   */
  setupWebMonitoring() {
    // 監控新的網絡請求
    this.setupNetworkMonitoring();
    
    // 監控 DOM 變化
    this.setupDOMMonitoring();
    
    // 監控表單提交
    this.setupFormMonitoring();
  }

  /**
   * 設置網絡請求監控
   */
  setupNetworkMonitoring() {
    // 拦截 fetch 請求
    const originalFetch = window.fetch;
    const plugin = this;
    
    window.fetch = function(...args) {
      const url = args[0];
      
      if (plugin.isThreatURL(url)) {
        console.warn(`Blocked request to threat URL: ${url}`);
        
        // 發送塊事件到頁面
        plugin.sendBlockEvent({
          type: 'network',
          url: url,
          reason: 'Threat intelligence block'
        });
        
        // 返回一個拒絕的 Promise
        return Promise.reject(new Error(`Blocked: ${url} is in threat intelligence list`));
      }
      
      return originalFetch.apply(this, args);
    };

    // 拦截 XMLHttpRequest
    const originalXHR = window.XMLHttpRequest;
    const self = this;
    
    window.XMLHttpRequest = function() {
      const xhr = new originalXHR();
      const originalOpen = xhr.open;
      const originalSend = xhr.send;
      
      xhr.open = function(method, url) {
        xhr._url = url;
        return originalOpen.apply(this, arguments);
      };
      
      xhr.send = function(body) {
        if (self.isThreatURL(xhr._url)) {
          console.warn(`Blocked XHR request to threat URL: ${xhr._url}`);
          
          // 發送塊事件
          self.sendBlockEvent({
            type: 'xhr',
            url: xhr._url,
            method: xhr._method || 'GET',
            reason: 'Threat intelligence block'
          });
          
          // 不發送請求
          return;
        }
        
        return originalSend.apply(this, arguments);
      };
      
      return xhr;
    };
  }

  /**
   * 設置 DOM 監控
   */
  setupDOMMonitoring() {
    const plugin = this;
    
    // 監控新添加的 iframe、script 等標籤
    const observer = new MutationObserver(function(mutations) {
      mutations.forEach(function(mutation) {
        mutation.addedNodes.forEach(function(node) {
          if (node.nodeType === 1) { // Element node
            // 檢查 script 標籤
            if (node.tagName === 'SCRIPT' && node.src) {
              if (plugin.isThreatURL(node.src)) {
                console.warn(`Blocked script from threat URL: ${node.src}`);
                node.remove();
                
                plugin.sendBlockEvent({
                  type: 'script',
                  url: node.src,
                  reason: 'Threat intelligence block'
                });
              }
            }
            
            // 檢查 iframe 標籤
            if (node.tagName === 'IFRAME' && node.src) {
              if (plugin.isThreatURL(node.src)) {
                console.warn(`Blocked iframe from threat URL: ${node.src}`);
                node.remove();
                
                plugin.sendBlockEvent({
                  type: 'iframe',
                  url: node.src,
                  reason: 'Threat intelligence block'
                });
              }
            }
            
            // 遞代檢查子元素
            const threatElements = node.querySelectorAll('script[src], iframe[src]');
            threatElements.forEach(function(el) {
              if (plugin.isThreatURL(el.src)) {
                console.warn(`Blocked element from threat URL: ${el.src}`);
                el.remove();
                
                plugin.sendBlockEvent({
                  type: 'element',
                  url: el.src,
                  tagName: el.tagName,
                  reason: 'Threat intelligence block'
                });
              }
            });
          }
        });
      });
    });

    observer.observe(document, {
      childList: true,
      subtree: true
    });
  }

  /**
   * 設置表單監控
   */
  setupFormMonitoring() {
    const plugin = this;
    
    // 監控表單提交
    document.addEventListener('submit', function(event) {
      const form = event.target;
      if (form.tagName === 'FORM' && form.action) {
        if (plugin.isThreatURL(form.action)) {
          event.preventDefault();
          
          console.warn(`Blocked form submission to threat URL: ${form.action}`);
          
          plugin.sendBlockEvent({
            type: 'form',
            url: form.action,
            reason: 'Threat intelligence block'
          });
        }
      }
    });
  }

  /**
   * 發送塊事件
   */
  sendBlockEvent(eventData) {
    // 發送自定義事件到頁面
    const blockEvent = new CustomEvent('orasrs:blocked', {
      detail: eventData
    });
    
    window.dispatchEvent(blockEvent);
    
    // 也可以發送到後台腳本（如果在擴展中運行）
    if (typeof chrome !== 'undefined' && chrome.runtime) {
      chrome.runtime.sendMessage({
        type: 'THREAT_BLOCKED',
        data: eventData
      });
    }
  }

  /**
   * 獲取當前頁面的安全評估
   */
  async getPageSecurityAssessment() {
    const assessment = {
      url: window.location.href,
      domain: window.location.hostname,
      threatLevel: 'low', // 默認為低風險
      threatsFound: [],
      timestamp: Date.now()
    };

    // 檢查當前頁面域
    if (this.isThreatDomain(window.location.hostname)) {
      assessment.threatLevel = 'high';
      assessment.threatsFound.push({
        type: 'domain',
        value: window.location.hostname,
        severity: 'critical'
      });
    }

    // 檢查頁面中的威脅元素
    const scripts = document.querySelectorAll('script[src]');
    const iframes = document.querySelectorAll('iframe[src]');
    const links = document.querySelectorAll('a[href]');

    scripts.forEach(script => {
      if (script.src && this.isThreatURL(script.src)) {
        assessment.threatLevel = 'high';
        assessment.threatsFound.push({
          type: 'script',
          value: script.src,
          severity: 'high'
        });
      }
    });

    iframes.forEach(iframe => {
      if (iframe.src && this.isThreatURL(iframe.src)) {
        assessment.threatLevel = 'high';
        assessment.threatsFound.push({
          type: 'iframe',
          value: iframe.src,
          severity: 'high'
        });
      }
    });

    links.forEach(link => {
      if (link.href && this.isThreatURL(link.href)) {
        assessment.threatLevel = 'medium';
        assessment.threatsFound.push({
          type: 'link',
          value: link.href,
          severity: 'medium'
        });
      }
    });

    return assessment;
  }

  /**
   * 手動更新威脅數據
   */
  async manualUpdate() {
    await this.fetchThreatIntelligence();
  }
}

// 初始化插件
let orasrsPlugin = null;

// 等待 DOM 加載完成後初始化
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', function() {
    orasrsPlugin = new OraSRSSecurityPlugin();
  });
} else {
  orasrsPlugin = new OraSRSSecurityPlugin();
}

// 將插件實例暴露到全局作用域，以便其他腳本可以訪問
window.OraSRSSecurityPlugin = OraSRSSecurityPlugin;
window.orasrsPlugin = orasrsPlugin;

console.log('OraSRS Browser Extension loaded');