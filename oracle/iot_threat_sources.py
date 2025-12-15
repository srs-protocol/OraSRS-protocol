#!/usr/bin/env python3
"""
OraSRS IoT Threat Intelligence Collector

Collects threat intelligence specific to IoT devices from multiple sources:
- URLhaus: IoT malware distribution
- ThreatFox: IoT botnet indicators
- Custom trackers for Mirai, Mozi, and other IoT botnets

Usage:
    python3 iot_threat_sources.py [--output FILE] [--format json|csv]
"""

import requests
import json
import csv
import sys
import argparse
from datetime import datetime
from typing import List, Dict
import logging

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


class IoTThreatCollector:
    """收集 IoT 特定的威胁情报"""
    
    def __init__(self):
        self.sources = {
            'urlhaus': 'https://urlhaus.abuse.ch/downloads/csv_online/',
            'threatfox': 'https://threatfox.abuse.ch/export/json/recent/',
            # Mirai Tracker (示例，实际可能需要其他来源)
            'feodo': 'https://feodotracker.abuse.ch/downloads/ipblocklist.csv'
        }
        
        self.iot_malware_families = [
            'mirai', 'mozi', 'gafgyt', 'bashlite', 'tsunami',
            'hajime', 'echobot', 'hide_and_seek', 'satori',
            'muhstik', 'kaiten', 'lightaidra', 'aidra'
        ]
        
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'OraSRS-IoT-Collector/2.1.0'
        })
    
    def collect_urlhaus(self) -> List[Dict]:
        """收集 URLhaus IoT 恶意软件分发 URL"""
        logger.info("Collecting URLhaus IoT malware...")
        threats = []
        
        try:
            response = self.session.get(self.sources['urlhaus'], timeout=30)
            response.raise_for_status()
            
            lines = response.text.split('\n')
            for line in lines[9:]:  # Skip CSV header (first 9 lines are comments)
                if not line.strip() or line.startswith('#'):
                    continue
                
                try:
                    parts = [p.strip('"') for p in line.split('","')]
                    if len(parts) < 7:
                        continue
                    
                    # parts[6] contains malware family
                    malware = parts[6].lower() if len(parts) > 6 else ''
                    
                    # 检查是否是 IoT 恶意软件
                    is_iot = any(family in malware for family in self.iot_malware_families)
                    
                    if is_iot:
                        url = parts[2]
                        if '://' in url:
                            # 提取主机/IP
                            host = url.split('://')[1].split('/')[0].split(':')[0]
                            
                            threats.append({
                                'ip': host,
                                'type': 'IoT Malware C2',
                                'source': 'URLhaus',
                                'malware_family': malware,
                                'url': url,
                                'first_seen': parts[1],
                                'risk_score': 85
                            })
                except Exception as e:
                    logger.debug(f"Error parsing URLhaus line: {e}")
                    continue
            
            logger.info(f"Collected {len(threats)} threats from URLhaus")
            return threats
            
        except Exception as e:
            logger.error(f"Failed to collect from URLhaus: {e}")
            return []
    
    def collect_threatfox(self) -> List[Dict]:
        """收集 ThreatFox IoT 僵尸网络指标"""
        logger.info("Collecting ThreatFox IoT indicators...")
        threats = []
        
        try:
            response = self.session.get(self.sources['threatfox'], timeout=30)
            response.raise_for_status()
            data = response.json()
            
            for item in data.get('data', []):
                malware = item.get('malware_family', '').lower()
                
                # 检查是否是 IoT 恶意软件
                if any(family in malware for family in self.iot_malware_families):
                    ioc_type = item.get('ioc_type', '')
                    ioc_value = item.get('ioc_value', '')
                    
                    # 提取 IP 地址
                    ip = None
                    if ioc_type == 'ip:port':
                        ip = ioc_value.split(':')[0]
                    elif ioc_type == 'ip':
                        ip = ioc_value
                    elif ioc_type == 'domain':
                        # 域名也记录，但标记为域名
                        ip = ioc_value
                    
                    if ip:
                        threats.append({
                            'ip': ip,
                            'type': f'IoT Botnet C2 ({ioc_type})',
                            'source': 'ThreatFox',
                            'malware_family': malware,
                            'first_seen': item.get('first_seen', ''),
                            'confidence': item.get('confidence_level', 50),
                            'risk_score': 80
                        })
            
            logger.info(f"Collected {len(threats)} threats from ThreatFox")
            return threats
            
        except Exception as e:
            logger.error(f"Failed to collect from ThreatFox: {e}")
            return []
    
    def collect_feodo(self) -> List[Dict]:
        """收集 Feodo Tracker C2 服务器（包括某些 IoT 变种）"""
        logger.info("Collecting Feodo Tracker C2 servers...")
        threats = []
        
        try:
            response = self.session.get(self.sources['feodo'], timeout=30)
            response.raise_for_status()
            
            lines = response.text.split('\n')
            for line in lines:
                line = line.strip()
                if not line or line.startswith('#'):
                    continue
                
                parts = line.split(',')
                if len(parts) >= 1:
                    ip = parts[0].strip()
                    
                    threats.append({
                        'ip': ip,
                        'type': 'C2 Server',
                        'source': 'Feodo Tracker',
                        'malware_family': 'botnet',
                        'first_seen': datetime.utcnow().isoformat(),
                        'risk_score': 75
                    })
            
            logger.info(f"Collected {len(threats)} threats from Feodo Tracker")
            return threats
            
        except Exception as e:
            logger.error(f"Failed to collect from Feodo: {e}")
            return []
    
    def collect_all(self) -> List[Dict]:
        """收集所有 IoT 威胁情报"""
        all_threats = []
        
        # 从各个来源收集
        all_threats.extend(self.collect_urlhaus())
        all_threats.extend(self.threatfox())
        all_threats.extend(self.collect_feodo())
        
        # 去重（基于 IP）
        unique_threats = {}
        for threat in all_threats:
            ip = threat['ip']
            
            # 如果已存在，保留风险分数更高的
            if ip in unique_threats:
                if threat.get('risk_score', 0) > unique_threats[ip].get('risk_score', 0):
                    unique_threats[ip] = threat
            else:
                unique_threats[ip] = threat
        
        result = list(unique_threats.values())
        logger.info(f"Total unique IoT threats collected: {len(result)}")
        
        return result
    
    def save_json(self, threats: List[Dict], filename: str):
        """保存为 JSON 格式"""
        output = {
            'threats': threats,
            'metadata': {
                'last_update': datetime.utcnow().isoformat(),
                'count': len(threats),
                'sources': list(self.sources.keys()),
                'collector_version': '2.1.0'
            }
        }
        
        with open(filename, 'w') as f:
            json.dump(output, f, indent=2)
        
        logger.info(f"Saved {len(threats)} threats to {filename}")
    
    def save_csv(self, threats: List[Dict], filename: str):
        """保存为 CSV 格式"""
        if not threats:
            logger.warning("No threats to save")
            return
        
        fieldnames = ['ip', 'type', 'source', 'malware_family', 'risk_score', 'first_seen']
        
        with open(filename, 'w', newline='') as f:
            writer = csv.DictWriter(f, fieldnames=fieldnames, extrasaction='ignore')
            writer.writeheader()
            writer.writerows(threats)
        
        logger.info(f"Saved {len(threats)} threats to {filename}")


def main():
    parser = argparse.ArgumentParser(
        description='Collect IoT-specific threat intelligence'
    )
    parser.add_argument(
        '--output',
        default='iot-threats.json',
        help='Output filename (default: iot-threats.json)'
    )
    parser.add_argument(
        '--format',
        choices=['json', 'csv'],
        default='json',
        help='Output format (default: json)'
    )
    parser.add_argument(
        '--verbose',
        '-v',
        action='store_true',
        help='Enable verbose logging'
    )
    
    args = parser.parse_args()
    
    if args.verbose:
        logging.getLogger().setLevel(logging.DEBUG)
    
    # 收集威胁情报
    collector = IoTThreatCollector()
    threats = collector.collect_all()
    
    # 保存结果
    if args.format == 'json':
        collector.save_json(threats, args.output)
    else:
        collector.save_csv(threats, args.output)
    
    # 打印摘要
    print("\n" + "="*50)
    print("IoT Threat Intelligence Collection Summary")
    print("="*50)
    print(f"Total threats collected: {len(threats)}")
    
    # 按恶意软件家族统计
    families = {}
    for threat in threats:
        family = threat.get('malware_family', 'unknown')
        families[family] = families.get(family, 0) + 1
    
    print("\nTop malware families:")
    for family, count in sorted(families.items(), key=lambda x: x[1], reverse=True)[:10]:
        print(f"  {family}: {count}")
    
    print(f"\nOutput saved to: {args.output}")
    print("="*50)


if __name__ == '__main__':
    main()
