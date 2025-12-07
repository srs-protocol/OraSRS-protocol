//! OraSRS 核心SDK - 通用安全插件
//! 实现链上订阅 -> 本地同步 -> 内核阻断 的最小闭环
//! 
//! 该SDK编译为动态链接库，可被C/C++/Python/Go/Node.js等语言调用

use std::ffi::{CStr, CString};
use std::os::raw::c_char;
use std::sync::{Arc, Mutex};
use std::collections::HashMap;
use std::time::{SystemTime, UNIX_EPOCH, Duration};

// 导入外部依赖
use roaring::RoaringBitmap;
use bloomfish::{BloomFilter, OptimalBloomFilter};
use serde::{Deserialize, Serialize};

// 用于存储威胁信息的结构
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ThreatInfo {
    pub threat_type: String,  // "IP", "DOMAIN", "URL"
    pub threat_value: String, // 具体的IP地址或域名
    pub threat_level: u8,     // 威胁等级 1-5
    pub timestamp: u64,       // 发现时间戳
    pub expiration: u64,      // 过期时间戳
    pub source: String,       // 威胁来源
    pub evidence: String,     // 证据摘要
}

// 全局威胁缓存（使用Roaring Bitmap优化存储）
static mut THREAT_CACHE: Option<Arc<Mutex<ThreatCache>>> = None;

// 威胁缓存结构
pub struct ThreatCache {
    // IP黑名单（使用Roaring Bitmap优化存储）
    ip_blacklist: RoaringBitmap,
    
    // 域名威胁映射（带TTL）
    domain_threats: HashMap<String, (ThreatInfo, u64)>,
    
    // 更新时间
    last_update: u64,
    
    // 合约地址
    contract_addr: String,
    
    // RPC链接
    rpc_endpoint: String,
    
    // TTL配置（默认24小时）
    ttl_seconds: u64,
}

impl ThreatCache {
    pub fn new(rpc_endpoint: String, contract_addr: String) -> Self {
        ThreatCache {
            ip_blacklist: RoaringBitmap::new(),
            domain_threats: HashMap::new(),
            last_update: 0,
            contract_addr,
            rpc_endpoint,
            ttl_seconds: 24 * 3600, // 24小时
        }
    }

    // 检查IP是否在黑名单中
    pub fn is_ip_blocked(&self, ip_str: &str) -> bool {
        if let Ok(ip_num) = self.ip_str_to_u32(ip_str) {
            self.ip_blacklist.contains(ip_num)
        } else {
            false
        }
    }

    // 检查域名是否为威胁
    pub fn is_domain_threat(&self, domain: &str) -> bool {
        if let Some((_, expiration)) = self.domain_threats.get(domain) {
            let now = SystemTime::now()
                .duration_since(UNIX_EPOCH)
                .unwrap()
                .as_secs();
            
            // 检查是否过期
            now < *expiration
        } else {
            false
        }
    }

    // 将IP字符串转换为u32
    fn ip_str_to_u32(&self, ip_str: &str) -> Result<u32, std::net::AddrParseError> {
        let ip = ip_str.parse::<std::net::Ipv4Addr>()?;
        let octets = ip.octets();
        Ok(((octets[0] as u32) << 24) | 
           ((octets[1] as u32) << 16) | 
           ((octets[2] as u32) << 8) | 
           (octets[3] as u32))
    }

    // 添加IP到黑名单
    pub fn add_ip_to_blacklist(&mut self, ip_str: &str) {
        if let Ok(ip_num) = self.ip_str_to_u32(ip_str) {
            self.ip_blacklist.insert(ip_num);
        }
    }

    // 添加域名威胁
    pub fn add_domain_threat(&mut self, threat: ThreatInfo) {
        let expiration = threat.timestamp + self.ttl_seconds;
        self.domain_threats.insert(threat.threat_value.clone(), (threat, expiration));
    }

    // 清理过期的威胁信息
    pub fn cleanup_expired(&mut self) {
        let now = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_secs();
        
        self.domain_threats.retain(|_, (_, expiration)| {
            *expiration > now
        });
    }
}

// ========================
// C ABI 接口 - 供外部调用
// ========================

/// 初始化OraSRS插件
/// 
/// # Parameters
/// * `rpc_url` - 区块链RPC端点
/// * `contract_addr` - 合约地址
/// 
/// # Returns
/// * `bool` - 初始化是否成功
#[no_mangle]
pub extern "C" fn orasrs_init(rpc_url: *const c_char, contract_addr: *const c_char) -> bool {
    unsafe {
        if THREAT_CACHE.is_some() {
            return true; // 已初始化
        }

        let rpc_str = if !rpc_url.is_null() {
            CStr::from_ptr(rpc_url).to_str().unwrap_or("http://localhost:8545")
        } else {
            "http://localhost:8545"
        };

        let contract_str = if !contract_addr.is_null() {
            CStr::from_ptr(contract_addr).to_str().unwrap_or("")
        } else {
            ""
        };

        let cache = ThreatCache::new(rpc_str.to_string(), contract_str.to_string());
        THREAT_CACHE = Some(Arc::new(Mutex::new(cache())));
        
        // 启动后台更新线程
        std::thread::spawn(|| {
            update_loop();
        });

        true
    }
}

/// 检查IP是否为恶意IP
/// 
/// # Parameters
/// * `ip_str` - IP地址字符串
/// 
/// # Returns
/// * `bool` - true表示IP为恶意，false表示安全
#[no_mangle]
pub extern "C" fn orasrs_check_ip(ip_str: *const c_char) -> bool {
    unsafe {
        if let Some(cache) = &THREAT_CACHE {
            if let Ok(cache_lock) = cache.lock() {
                if let Ok(ip) = CStr::from_ptr(ip_str).to_str() {
                    return cache_lock.is_ip_blocked(ip);
                }
            }
        }
        false
    }
}

/// 检查域名是否为威胁
/// 
/// # Parameters
/// * `domain` - 域名字符串
/// 
/// # Returns
/// * `bool` - true表示域名为威胁，false表示安全
#[no_mangle]
pub extern "C" fn orasrs_check_domain(domain: *const c_char) -> bool {
    unsafe {
        if let Some(cache) = &THREAT_CACHE {
            if let Ok(cache_lock) = cache.lock() {
                if let Ok(domain_str) = CStr::from_ptr(domain).to_str() {
                    return cache_lock.is_domain_threat(domain_str);
                }
            }
        }
        false
    }
}

/// 启用内核级阻断（仅在支持的系统上）
#[no_mangle]
pub extern "C" fn orasrs_kernel_block_enable() {
    // 这接系统防火墙API进行阻断
    // Linux: iptables
    // Windows: WFP (Windows Filtering Platform)
    // macOS: pfctl
    enable_kernel_blocking();
}

/// 禁用内核级阻断
#[no_mangle]
pub extern "C" fn orasrs_kernel_block_disable() {
    disable_kernel_blocking();
}

/// 手动触发威胁列表更新
#[no_mangle]
pub extern "C" fn orasrs_update_threats() -> bool {
    unsafe {
        if let Some(cache) = &THREAT_CACHE {
            if let Ok(mut cache_lock) = cache.lock() {
                cache_lock.cleanup_expired();
                // 从链上获取最新威胁数据
                return fetch_latest_threats(&mut *cache_lock);
            }
        }
        false
    }
}

/// 获取插件状态信息
#[no_mangle]
pub extern "C" fn orasrs_get_status(status_str: *mut c_char, max_len: usize) -> bool {
    unsafe {
        if let Some(cache) = &THREAT_CACHE {
            if let Ok(cache_lock) = cache.lock() {
                let status = format!(
                    "OraSRS Core SDK v0.1.0\nIPs Blocked: {}\nDomains Threats: {}\nLast Update: {}\nTTL: {}s",
                    cache_lock.ip_blacklist.len(),
                    cache_lock.domain_threats.len(),
                    cache_lock.last_update,
                    cache_lock.ttl_seconds
                );
                
                if let Ok(c_status) = CString::new(status) {
                    let src_bytes = c_status.as_bytes_with_nul();
                    let copy_len = std::cmp::min(max_len - 1, src_bytes.len());
                    
                    std::ptr::copy_nonoverlapping(
                        src_bytes.as_ptr(),
                        status_str as *mut u8,
                        copy_len,
                    );
                    
                    // 确保字符串结束
                    let dest = (status_str as *mut u8).add(copy_len);
                    *dest = 0;
                    
                    return true;
                }
            }
        }
        false
    }
}

// ========================
// 内部实现函数
// ========================

// 更新循环 - 定期从链上获取新威胁
fn update_loop() {
    loop {
        std::thread::sleep(std::time::Duration::from_secs(300)); // 每5分钟检查一次
        
        unsafe {
            if let Some(cache) = &THREAT_CACHE {
                if let Ok(mut cache_lock) = cache.lock() {
                    // 清理过期威胁
                    cache_lock.cleanup_expired();
                    
                    // 获取新威胁
                    fetch_latest_threats(&mut *cache_lock);
                }
            }
        }
    }
}

// 从链上获取最新威胁数据
fn fetch_latest_threats(cache: &mut ThreatCache) -> bool {
    // 这里实现从区块链合约获取最新威胁的逻辑
    // 1. 连接RPC端点
    // 2. 查询合约的最新事件
    // 3. 解析并添加到缓存中
    
    // 模拟操作
    cache.last_update = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap()
        .as_secs();
    
    true
}

// 启用内核级阻断
fn enable_kernel_blocking() {
    // 根据不同系统调用相应的防火墙API
    #[cfg(target_os = "linux")]
    {
        // Linux: 使用iptables或nftables
        use std::process::Command;
        // 示例: Command::new("iptables").args(&["-A", "INPUT", "-s", "IP", "-j", "DROP"]).output();
    }
    
    #[cfg(target_os = "windows")]
    {
        // Windows: 使用WFP API
        // 需要使用windows-sys crate调用WFP
    }
    
    #[cfg(target_os = "macos")]
    {
        // macOS: 使用pfctl
        // 示例: Command::new("pfctl").args(&["-f", "/path/to/rules"]).output();
    }
}

// 禁用内核级阻断
fn disable_kernel_blocking() {
    // 与enable_kernel_blocking对应的操作
}

// ========================
// 单元测试
// ========================

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_ip_conversion() {
        let cache = ThreatCache::new("http://localhost:8545".to_string(), "".to_string());
        assert_eq!(cache.ip_str_to_u32("192.168.1.1").unwrap(), 0xC0A80101);
        assert_eq!(cache.ip_str_to_u32("8.8.8.8").unwrap(), 0x08080808);
    }

    #[test]
    fn test_threat_cache() {
        let mut cache = ThreatCache::new("http://localhost:8545".to_string(), "".to_string());
        
        cache.add_ip_to_blacklist("192.168.1.100");
        assert!(cache.is_ip_blocked("192.168.1.100"));
        assert!(!cache.is_ip_blocked("192.168.1.101"));
        
        let threat = ThreatInfo {
            threat_type: "IP".to_string(),
            threat_value: "example.com".to_string(),
            threat_level: 3,
            timestamp: 1000,
            expiration: 2000,
            source: "test".to_string(),
            evidence: "test".to_string(),
        };
        
        cache.add_domain_threat(threat);
        assert!(cache.is_domain_threat("example.com"));
    }
}
