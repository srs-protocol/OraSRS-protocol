/**
 * OraSRS Browser Extension - Popup Script
 * 彈出窗口的交互邏輯
 */

document.addEventListener('DOMContentLoaded', function() {
  // 加載擴展狀態
  loadExtensionStatus();
  
  // 加載最近的威脅記錄
  loadRecentThreats();
  
  // 設置按鈕事件
  document.getElementById('manual-update').addEventListener('click', manualUpdate);
  document.getElementById('view-report').addEventListener('click', viewDetailedReport);
  
  // 設置阻止級別選擇
  loadBlockLevel();
  document.getElementById('block-level').addEventListener('change', saveBlockLevel);
  
  // 獲取當前頁面的安全評估
  getCurrentPageAssessment();
});

// 加載擴展狀態
async function loadExtensionStatus() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    // 獲取擴展狀態
    chrome.storage.sync.get(['enabled'], (result) => {
      const enabled = result.enabled !== false; // 默認為啟用
      document.getElementById('extension-status').textContent = enabled ? '啟用' : '禁用';
    });
    
    // 獲取威脅狀態
    chrome.runtime.sendMessage({ type: 'GET_THREAT_STATUS' }, (response) => {
      if (response) {
        document.getElementById('blocked-count').textContent = response.blockedCount || 0;
        
        // 格式化最後更新時間
        const lastUpdate = response.lastUpdate || 0;
        const timeAgo = formatTimeAgo(lastUpdate);
        document.getElementById('last-update').textContent = timeAgo;
      }
    });
    
    // 顯示當前頁面URL
    if (tab && tab.url) {
      const displayUrl = tab.url.length > 30 ? tab.url.substring(0, 30) + '...' : tab.url;
      document.getElementById('current-page').textContent = displayUrl;
    }
  } catch (error) {
    console.error('Error loading extension status:', error);
  }
}

// 加載最近的威脅記錄
async function loadRecentThreats() {
  try {
    const result = await chrome.storage.local.get(['blockedThreats']);
    const blockedThreats = result.blockedThreats || [];
    
    const threatsContainer = document.getElementById('recent-threats');
    threatsContainer.innerHTML = '';
    
    if (blockedThreats.length === 0) {
      threatsContainer.innerHTML = '<div class="no-threats">暫無威脅記錄</div>';
      return;
    }
    
    // 顯示最近的5個威脅記錄
    const recentThreats = blockedThreats.slice(-5).reverse();
    
    recentThreats.forEach(threat => {
      const threatElement = document.createElement('div');
      threatElement.className = 'threat-item';
      
      const threatUrl = threat.url && threat.url.length > 30 ? 
        threat.url.substring(0, 30) + '...' : threat.url || 'Unknown';
      
      threatElement.innerHTML = `
        <div class="threat-url">${threatUrl}</div>
        <div class="threat-type">${threat.type || 'Unknown'} - ${formatTimeAgo(threat.timestamp)}</div>
      `;
      
      threatsContainer.appendChild(threatElement);
    });
  } catch (error) {
    console.error('Error loading recent threats:', error);
  }
}

// 手動更新威脅數據
async function manualUpdate() {
  const button = document.getElementById('manual-update');
  const originalText = button.textContent;
  button.textContent = '更新中...';
  button.disabled = true;
  
  try {
    // 在當前頁面執行威脅數據更新
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    chrome.tabs.sendMessage(tab.id, { type: 'MANUAL_UPDATE' }, (response) => {
      if (chrome.runtime.lastError) {
        console.log('Content script may not be available on this page');
      }
    });
    
    // 等待一段時間後重新加載狀態
    setTimeout(() => {
      loadExtensionStatus();
      loadRecentThreats();
    }, 2000);
  } catch (error) {
    console.error('Error during manual update:', error);
  } finally {
    button.textContent = originalText;
    button.disabled = false;
  }
}

// 查看詳細報告
function viewDetailedReport() {
  // 在新標籤頁中打開詳細報告頁面
  chrome.tabs.create({
    url: chrome.runtime.getURL('report.html')
  });
}

// 加載阻止級別
async function loadBlockLevel() {
  try {
    const result = await chrome.storage.sync.get(['blockLevel']);
    const blockLevel = result.blockLevel || 'high';
    document.getElementById('block-level').value = blockLevel;
  } catch (error) {
    console.error('Error loading block level:', error);
  }
}

// 保存阻止級別
async function saveBlockLevel() {
  try {
    const blockLevel = document.getElementById('block-level').value;
    await chrome.storage.sync.set({ blockLevel });
    
    // 通知內容腳本更新設置
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    chrome.tabs.sendMessage(tab.id, { 
      type: 'SETTINGS_CHANGED', 
      blockLevel: blockLevel 
    });
  } catch (error) {
    console.error('Error saving block level:', error);
  }
}

// 獲取當前頁面的安全評估
async function getCurrentPageAssessment() {
  try {
    chrome.runtime.sendMessage({ type: 'GET_SECURITY_ASSESSMENT' }, (response) => {
      if (response && response.threatLevel) {
        const threatLevelElement = document.querySelector('#current-page');
        threatLevelElement.textContent += ` [風險: ${response.threatLevel}]`;
      }
    });
  } catch (error) {
    console.error('Error getting page assessment:', error);
  }
}

// 格式化時間顯示
function formatTimeAgo(timestamp) {
  if (!timestamp) return '未知';
  
  const now = Date.now();
  const diff = now - timestamp;
  const minutes = Math.floor(diff / 60000);
  
  if (minutes < 1) return '剛剛';
  if (minutes < 60) return `${minutes}分鐘前`;
  
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}小時前`;
  
  const days = Math.floor(hours / 24);
  return `${days}天前`;
}

// 定期更新狀態
setInterval(() => {
  loadExtensionStatus();
}, 30000); // 每30秒更新一次狀態