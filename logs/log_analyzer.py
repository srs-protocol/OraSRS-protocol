#!/usr/bin/env python3
"""
OraSRS 日志统计分析工具
分析日志文件并生成详细的统计信息，包括均值、方差、分位数、Precision/Recall等指标
"""

import json
import numpy as np
from scipy import stats
import os
from pathlib import Path
import pandas as pd
from datetime import datetime
import statistics

def analyze_performance_logs(log_dir):
    """分析性能测试日志"""
    log_files = list(Path(log_dir).glob("*performance*test*.json"))
    
    performance_data = {
        'avg_time_per_ip': [],
        'total_time': [],
        'requests_per_second': [],
        'avg_risk_score': []
    }
    
    for log_file in log_files:
        with open(log_file, 'r') as f:
            data = json.load(f)
            
        if 'test_summary' in data:
            summary = data['test_summary']
            
            # 收集性能指标
            if 'avg_time_per_ip_ms' in summary:
                try:
                    performance_data['avg_time_per_ip'].append(float(summary['avg_time_per_ip_ms']))
                except ValueError:
                    pass
            
            if 'total_time_ms' in summary:
                performance_data['total_time'].append(float(summary['total_time_ms']))
                
            if 'requests_per_second' in summary:
                try:
                    performance_data['requests_per_second'].append(float(summary['requests_per_second']))
                except ValueError:
                    pass
                    
            if 'avg_risk_score' in summary:
                try:
                    performance_data['avg_risk_score'].append(float(summary['avg_risk_score']))
                except ValueError:
                    pass
    
    # 计算性能统计指标
    perf_stats = {}
    for key, values in performance_data.items():
        if values:
            perf_stats[key] = {
                'mean': round(np.mean(values), 6),
                'std': round(np.std(values), 6),
                'variance': round(np.var(values), 6),
                'median': round(np.median(values), 6),
                'q25': round(np.percentile(values, 25), 6),
                'q75': round(np.percentile(values, 75), 6),
                'q95': round(np.percentile(values, 95), 6),
                'q99': round(np.percentile(values, 99), 6),
                'min': round(np.min(values), 6),
                'max': round(np.max(values), 6),
                'count': len(values),
                'sem': round(stats.sem(values), 6)  # 标准误差
            }
    
    return perf_stats

def analyze_precision_recall_logs(log_dir):
    """分析精确率/召回率测试日志"""
    log_files = list(Path(log_dir).glob("*precision*recall*test*.json"))
    
    pr_data = {
        'precision': [],
        'recall': [],
        'f1_score': [],
        'accuracy': [],
        'specificity': [],
        'false_positive_rate': [],
        'false_negative_rate': []
    }
    
    for log_file in log_files:
        with open(log_file, 'r') as f:
            data = json.load(f)
            
        if 'precisionRecallTest' in data:
            test_data = data['precisionRecallTest']
            
            # 收集精确率/召回率指标
            if 'precision' in test_data:
                pr_data['precision'].append(test_data['precision'])
            if 'recall' in test_data:
                pr_data['recall'].append(test_data['recall'])
            if 'f1Score' in test_data:
                pr_data['f1_score'].append(test_data['f1Score'])
            if 'accuracy' in test_data:
                pr_data['accuracy'].append(test_data['accuracy'])
            if 'specificity' in test_data:
                pr_data['specificity'].append(test_data['specificity'])
            if 'falsePositiveRate' in test_data:
                pr_data['false_positive_rate'].append(test_data['falsePositiveRate'])
            if 'falseNegativeRate' in test_data:
                pr_data['false_negative_rate'].append(test_data['falseNegativeRate'])
    
    # 计算精确率/召回率统计指标
    pr_stats = {}
    for key, values in pr_data.items():
        if values:
            pr_stats[key] = {
                'mean': round(np.mean(values), 6),
                'std': round(np.std(values), 6),
                'variance': round(np.var(values), 6),
                'median': round(np.median(values), 6),
                'q25': round(np.percentile(values, 25), 6),
                'q75': round(np.percentile(values, 75), 6),
                'q95': round(np.percentile(values, 95), 6),
                'q99': round(np.percentile(values, 99), 6),
                'min': round(np.min(values), 6),
                'max': round(np.max(values), 6),
                'count': len(values),
                'sem': round(stats.sem(values), 6)
            }
    
    return pr_stats

def analyze_contract_logs(log_dir):
    """分析合约测试日志"""
    log_files = list(Path(log_dir).glob("*contract*.json"))
    
    contract_data = {
        'successful_queries': [],
        'failed_queries': [],
        'success_rate': [],
        'total_time_ms': [],
        'avg_time_per_query_ms': []
    }
    
    for log_file in log_files:
        with open(log_file, 'r') as f:
            data = json.load(f)
            
        if 'test_summary' in data:
            summary = data['test_summary']
            
            # 收集合约测试指标
            if 'successful_queries' in summary:
                contract_data['successful_queries'].append(summary['successful_queries'])
            if 'failed_queries' in summary:
                contract_data['failed_queries'].append(summary['failed_queries'])
            if 'success_rate' in summary:
                try:
                    success_rate = float(summary['success_rate'].replace('%', ''))
                    contract_data['success_rate'].append(success_rate)
                except ValueError:
                    pass
            if 'total_time_ms' in summary:
                contract_data['total_time_ms'].append(summary['total_time_ms'])
            if 'avg_time_per_query_ms' in summary:
                try:
                    avg_time = float(summary['avg_time_per_query_ms'])
                    contract_data['avg_time_per_query_ms'].append(avg_time)
                except ValueError:
                    pass
    
    # 计算合约测试统计指标
    contract_stats = {}
    for key, values in contract_data.items():
        if values and len(values) > 0:
            contract_stats[key] = {
                'mean': round(np.mean(values), 6) if all(isinstance(x, (int, float)) for x in values) else np.mean([float(x) for x in values]),
                'std': round(np.std(values), 6) if all(isinstance(x, (int, float)) for x in values) else np.std([float(x) for x in values]),
                'variance': round(np.var(values), 6) if all(isinstance(x, (int, float)) for x in values) else np.var([float(x) for x in values]),
                'median': round(np.median(values), 6) if all(isinstance(x, (int, float)) for x in values) else np.median([float(x) for x in values]),
                'q25': round(np.percentile(values, 25), 6) if all(isinstance(x, (int, float)) for x in values) else round(np.percentile([float(x) for x in values], 25), 6),
                'q75': round(np.percentile(values, 75), 6) if all(isinstance(x, (int, float)) for x in values) else round(np.percentile([float(x) for x in values], 75), 6),
                'q95': round(np.percentile(values, 95), 6) if all(isinstance(x, (int, float)) for x in values) else round(np.percentile([float(x) for x in values], 95), 6),
                'q99': round(np.percentile(values, 99), 6) if all(isinstance(x, (int, float)) for x in values) else round(np.percentile([float(x) for x in values], 99), 6),
                'min': round(np.min(values), 6) if all(isinstance(x, (int, float)) for x in values) else round(np.min([float(x) for x in values]), 6),
                'max': round(np.max(values), 6) if all(isinstance(x, (int, float)) for x in values) else round(np.max([float(x) for x in values]), 6),
                'count': len(values),
                'sem': round(stats.sem(values), 6) if all(isinstance(x, (int, float)) for x in values) else round(stats.sem([float(x) for x in values]), 6)
            }
    
    return contract_stats

def analyze_sybil_resistance_logs(log_dir):
    """分析女巫攻击抵抗力测试日志"""
    log_files = list(Path(log_dir).glob("*sybil*test*.json"))
    
    sybil_data = {
        'sybil_suppression_rate': [],
        'sybil_detection_rate': [],
        'overall_resistance_score': [],
        'final_honest_reputation': [],
        'final_sybil_reputation': []
    }
    
    for log_file in log_files:
        with open(log_file, 'r') as f:
            data = json.load(f)
            
        if 'sybilResistanceTest' in data:
            test_data = data['sybilResistanceTest']
            
            # 收集女巫攻击抵抗力指标
            if 'sybilSuppressionRate' in test_data:
                sybil_data['sybil_suppression_rate'].append(test_data['sybilSuppressionRate'])
            if 'sybilDetectionRate' in test_data:
                sybil_data['sybil_detection_rate'].append(test_data['sybilDetectionRate'])
            if 'overallResistanceScore' in test_data:
                sybil_data['overall_resistance_score'].append(test_data['overallResistanceScore'])
            if 'finalHonestReputation' in test_data:
                sybil_data['final_honest_reputation'].append(test_data['finalHonestReputation'])
            if 'finalSybilReputation' in test_data:
                sybil_data['final_sybil_reputation'].append(test_data['finalSybilReputation'])
    
    # 计算女巫攻击抵抗力统计指标
    sybil_stats = {}
    for key, values in sybil_data.items():
        if values:
            sybil_stats[key] = {
                'mean': round(np.mean(values), 6),
                'std': round(np.std(values), 6),
                'variance': round(np.var(values), 6),
                'median': round(np.median(values), 6),
                'q25': round(np.percentile(values, 25), 6),
                'q75': round(np.percentile(values, 75), 6),
                'q95': round(np.percentile(values, 95), 6),
                'q99': round(np.percentile(values, 99), 6),
                'min': round(np.min(values), 6),
                'max': round(np.max(values), 6),
                'count': len(values),
                'sem': round(stats.sem(values), 6)
            }
    
    return sybil_stats

def generate_latex_report(stats_data, output_file):
    """生成LaTeX格式的统计分析报告"""
    with open(output_file, 'w', encoding='utf-8') as f:
        f.write("\\section{实验统计分析结果}\n\n")
        
        # 性能测试统计结果
        if 'performance' in stats_data and stats_data['performance']:
            f.write("\\subsection{性能测试统计分析}\n\n")
            f.write("\\subsubsection{平均处理时间 (ms/IP)}\n")
            perf_time = stats_data['performance'].get('avg_time_per_ip', {})
            if perf_time:
                f.write(f"\\begin{{itemize}}\n")
                f.write(f"  \\item 样本数量: {perf_time['count']}\n")
                f.write(f"  \\item 均值: {perf_time['mean']:.6f}\n")
                f.write(f"  \\item 标准差: {perf_time['std']:.6f}\n")
                f.write(f"  \\item 方差: {perf_time['variance']:.6f}\n")
                f.write(f"  \\item 中位数: {perf_time['median']:.6f}\n")
                f.write(f"  \\item 25\\%分位数: {perf_time['q25']:.6f}\n")
                f.write(f"  \\item 75\\%分位数: {perf_time['q75']:.6f}\n")
                f.write(f"  \\item 95\\%分位数: {perf_time['q95']:.6f}\n")
                f.write(f"  \\item 99\\%分位数: {perf_time['q99']:.6f}\n")
                f.write(f"  \\item 最小值: {perf_time['min']:.6f}\n")
                f.write(f"  \\item 最大值: {perf_time['max']:.6f}\n")
                f.write(f"\\end{{itemize}}\n\n")
            
            f.write("\\subsubsection{吞吐量 (RPS)}\n")
            perf_rps = stats_data['performance'].get('requests_per_second', {})
            if perf_rps:
                f.write(f"\\begin{{itemize}}\n")
                f.write(f"  \\item 样本数量: {perf_rps['count']}\n")
                f.write(f"  \\item 均值: {perf_rps['mean']:.2f}\n")
                f.write(f"  \\item 标准差: {perf_rps['std']:.2f}\n")
                f.write(f"  \\item 方差: {perf_rps['variance']:.2f}\n")
                f.write(f"  \\item 中位数: {perf_rps['median']:.2f}\n")
                f.write(f"  \\item 95\\%分位数: {perf_rps['q95']:.2f}\n")
                f.write(f"  \\item 最小值: {perf_rps['min']:.2f}\n")
                f.write(f"  \\item 最大值: {perf_rps['max']:.2f}\n")
                f.write(f"\\end{{itemize}}\n\n")
        
        # 精确率/召回率统计结果
        if 'precision_recall' in stats_data and stats_data['precision_recall']:
            f.write("\\subsection{精确率/召回率统计分析}\n\n")
            
            pr_metrics = ['precision', 'recall', 'f1_score', 'accuracy']
            for metric in pr_metrics:
                metric_data = stats_data['precision_recall'].get(metric, {})
                if metric_data:
                    f.write(f"\\subsubsection{{{metric.replace('_', ' ').title()}}}\n")
                    f.write(f"\\begin{{itemize}}\n")
                    f.write(f"  \\item 样本数量: {metric_data['count']}\n")
                    f.write(f"  \\item 均值: {metric_data['mean']:.6f}\n")
                    f.write(f"  \\item 标准差: {metric_data['std']:.6f}\n")
                    f.write(f"  \\item 方差: {metric_data['variance']:.6f}\n")
                    f.write(f"  \\item 中位数: {metric_data['median']:.6f}\n")
                    f.write(f"  \\item 95\\%分位数: {metric_data['q95']:.6f}\n")
                    f.write(f"  \\item 最小值: {metric_data['min']:.6f}\n")
                    f.write(f"  \\item 最大值: {metric_data['max']:.6f}\n")
                    f.write(f"\\end{{itemize}}\n\n")
        
        # 合约测试统计结果
        if 'contract' in stats_data and stats_data['contract']:
            f.write("\\subsection{合约测试统计分析}\n\n")
            
            contract_metrics = ['success_rate', 'avg_time_per_query_ms']
            for metric in contract_metrics:
                metric_data = stats_data['contract'].get(metric, {})
                if metric_data:
                    f.write(f"\\subsubsection{{{metric.replace('_', ' ').title()}}}\n")
                    f.write(f"\\begin{{itemize}}\n")
                    f.write(f"  \\item 样本数量: {metric_data['count']}\n")
                    f.write(f"  \\item 均值: {metric_data['mean']:.6f}\n")
                    f.write(f"  \\item 标准差: {metric_data['std']:.6f}\n")
                    f.write(f"  \\item 方差: {metric_data['variance']:.6f}\n")
                    f.write(f"  \\item 中位数: {metric_data['median']:.6f}\n")
                    f.write(f"  \\item 95\\%分位数: {metric_data['q95']:.6f}\n")
                    f.write(f"  \\item 最小值: {metric_data['min']:.6f}\n")
                    f.write(f"  \\item 最大值: {metric_data['max']:.6f}\n")
                    f.write(f"\\end{{itemize}}\n\n")
        
        # 女巫攻击抵抗力统计结果
        if 'sybil_resistance' in stats_data and stats_data['sybil_resistance']:
            f.write("\\subsection{女巫攻击抵抗力统计分析}\n\n")
            
            sybil_metrics = ['sybil_suppression_rate', 'overall_resistance_score']
            for metric in sybil_metrics:
                metric_data = stats_data['sybil_resistance'].get(metric, {})
                if metric_data:
                    f.write(f"\\subsubsection{{{metric.replace('_', ' ').title()}}}\n")
                    f.write(f"\\begin{{itemize}}\n")
                    f.write(f"  \\item 样本数量: {metric_data['count']}\n")
                    f.write(f"  \\item 均值: {metric_data['mean']:.6f}\n")
                    f.write(f"  \\item 标准差: {metric_data['std']:.6f}\n")
                    f.write(f"  \\item 方差: {metric_data['variance']:.6f}\n")
                    f.write(f"  \\item 中位数: {metric_data['median']:.6f}\n")
                    f.write(f"  \\item 95\\%分位数: {metric_data['q95']:.6f}\n")
                    f.write(f"  \\item 最小值: {metric_data['min']:.6f}\n")
                    f.write(f"  \\item 最大值: {metric_data['max']:.6f}\n")
                    f.write(f"\\end{{itemize}}\n\n")

def main():
    """主函数"""
    log_dir = Path("/home/Great/SRS-Protocol/logs")
    
    print("开始分析日志文件...")
    
    # 分析不同类型的日志
    performance_stats = analyze_performance_logs(log_dir)
    pr_stats = analyze_precision_recall_logs(log_dir)
    contract_stats = analyze_contract_logs(log_dir)
    sybil_stats = analyze_sybil_resistance_logs(log_dir)
    
    # 组合所有统计结果
    stats_data = {
        'performance': performance_stats,
        'precision_recall': pr_stats,
        'contract': contract_stats,
        'sybil_resistance': sybil_stats
    }
    
    # 生成LaTeX格式报告
    output_file = "/home/Great/SRS-Protocol/LaTeX/log-statistical-analysis.tex"
    generate_latex_report(stats_data, output_file)
    
    # 生成摘要报告
    print("\n=== 日志统计分析摘要 ===")
    if performance_stats:
        print(f"性能测试分析完成，共 {len([k for k, v in performance_stats.items() if v])} 个指标")
        avg_time_data = performance_stats.get('avg_time_per_ip', {})
        if avg_time_data:
            print(f"  - 平均处理时间: {avg_time_data['mean']:.6f} ms/IP (std: {avg_time_data['std']:.6f})")
    
    if pr_stats:
        print(f"精确率/召回率测试分析完成，共 {len([k for k, v in pr_stats.items() if v])} 个指标")
        precision_data = pr_stats.get('precision', {})
        if precision_data:
            print(f"  - 平均精确率: {precision_data['mean']:.6f} (std: {precision_data['std']:.6f})")
        recall_data = pr_stats.get('recall', {})
        if recall_data:
            print(f"  - 平均召回率: {recall_data['mean']:.6f} (std: {recall_data['std']:.6f})")
    
    if contract_stats:
        print(f"合约测试分析完成，共 {len([k for k, v in contract_stats.items() if v])} 个指标")
        success_rate_data = contract_stats.get('success_rate', {})
        if success_rate_data:
            print(f"  - 平均成功率: {success_rate_data['mean']:.2f}% (std: {success_rate_data['std']:.2f}%)")
    
    if sybil_stats:
        print(f"女巫攻击抵抗力测试分析完成，共 {len([k for k, v in sybil_stats.items() if v])} 个指标")
        suppression_data = sybil_stats.get('sybil_suppression_rate', {})
        if suppression_data:
            print(f"  - 平均女巫抑制率: {suppression_data['mean']:.6f} (std: {suppression_data['std']:.6f})")
    
    print(f"\nLaTeX格式的完整统计报告已生成: {output_file}")
    
    return stats_data

if __name__ == "__main__":
    main()
