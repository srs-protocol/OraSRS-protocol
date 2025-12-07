/**
 * OraSRS Browser Extension - Background Script
 * 背景腳本處理擴展的主要邏輯
 */

// 當擴展安裝時
chrome.runtime.onInstalled.addListener(() => {
  console.log('OraSRS Security Extension installed');
  
  // 設置初始配置
  chrome.storage.sync.set({
    enabled: true,
    updateInterval: 300000, // 5分鐘
    blockLevel: 'high' // 只阻止高風險威脅
  });
});

// 設置定期更新威脅數據
chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === 'updateThreatData') {
    await updateThreatDataFromBlockchain();
  }
});

// 創建定期更新警報
chrome.alarms.create('updateThreatData', {
  periodInMinutes: 5
});

// 處理來自內容腳本的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Received message from content script:', request);
  
  if (request.type === 'THREAT_BLOCKED') {
    // 在這裡記錄被阻止的威脅
    console.log('Threat blocked:', request.data);
    
    // 可以將此信息存儲到擴展的存儲中，供彈出窗口顯示
    chrome.storage.local.get(['blockedThreats'], (result) => {
      let blockedThreats = result.blockedThreats || [];
      blockedThreats.push({
        ...request.data,
        timestamp: Date.now()
      });
      
      // 只保留最近的100個記錄
      if (blockedThreats.length > 100) {
        blockedThreats = blockedThreats.slice(-100);
      }
      
      chrome.storage.local.set({ blockedThreats });
    });
    
    // 更新瀏覽器操作圖標的計數
    updateBadgeCount();
  }
  
  if (request.type === 'GET_THREAT_STATUS') {
    // 返回當前威脅狀態
    chrome.storage.local.get(['blockedThreats'], (result) => {
      const blockedThreats = result.blockedThreats || [];
      sendResponse({
        blockedCount: blockedThreats.length,
        lastUpdate: getLastUpdateTime()
      });
    });
    return true; // 表示將來會異步調用 sendResponse
  }
  
  if (request.type === 'GET_SECURITY_ASSESSMENT') {
    // 返回當前頁面的安全評估
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      chrome.scripting.executeScript({
        target: { tabId: tabs[0].id },
        func: () => {
          if (window.orasrsPlugin) {
            return window.orasrsPlugin.getPageSecurityAssessment();
          }
          return null;
        }
      }).then((results) => {
        if (results && results[0] && results[0].result) {
          sendResponse(results[0].result);
        } else {
          sendResponse(null);
        }
      });
    });
    return true; // 表示將來會異步調用 sendResponse
  }
});

// 更新瀏覽器操作計數標籤
async function updateBadgeCount() {
  const result = await chrome.storage.local.get(['blockedThreats']);
  const blockedThreats = result.blockedThreats || [];
  const count = blockedThreats.length;
  
  chrome.action.setBadgeText({
    text: count > 0 ? count.toString() : ''
  });
  
  chrome.action.setBadgeBackgroundColor({
    color: count > 0 ? '#FF0000' : '#000000'
  });
}

// 從區塊鏈獲取威脅數據
async function updateThreatDataFromBlockchain() {
  try {
    console.log('Updating threat data from OraSRS blockchain...');
    
    const response = await fetch('https://api.orasrs.net/orasrs/v2/threat-list');
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (data.threat_list && Array.isArray(data.threat_list)) {
      // 存儲新的威脅數據
      const threatData = {
        threats: data.threat_list,
        timestamp: Date.now(),
        blockchainVerification: data.blockchain_verification || {}
      };
      
      await chrome.storage.local.set({ threatData });
      console.log(`Updated threat data with ${data.threat_list.length} threats`);
      
      // 更新上次更新時間
      await chrome.storage.local.set({ lastUpdate: Date.now() });
    }
    
  } catch (error) {
    console.error('Error updating threat data:', error);
    
    // 即使出錯也要設置時間，避免重複嘗試
    await chrome.storage.local.set({ lastUpdate: Date.now() });
  }
}

// 獲取上次更新時間
function getLastUpdateTime() {
  return new Promise((resolve) => {
    chrome.storage.local.get(['lastUpdate'], (result) => {
      resolve(result.lastUpdate || 0);
    });
  });
}

// 立即更新一次威脅數據
updateThreatDataFromBlockchain();