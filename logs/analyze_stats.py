#!/usr/bin/env python3
"""
OraSRS 日志统计分析工具
基于现有日志文件自动计算统计指标
"""

import json
import numpy as np
import pandas as pd
from scipy import stats
import os
from pathlib import Path

def analyze_performance_logs(log_dir):
    """分析性能测试日志"""
    log_files = list(Path(log_dir).glob("performance-test-*.json"))
    
    # 收集性能指标
    processing_times = []
    throughputs = []
    
    for log_file in log_files:
        with open(log_file, 'r') as f:
            try:
                data = json.load(f)
                if 'test_summary' in data:
                    summary = data['test_summary']
                    
                    if 'avg_time_per_ip_ms' in summary:
                        try:
                            avg_time = float(summary['avg_time_per_ip_ms'])
                            processing_times.append(avg_time)
                        except ValueError:
                            continue
                    elif 'avg_time_per_query_ms' in summary:
                        try:
                            avg_time = float(summary['avg_time_per_query_ms'])
                            processing_times.append(avg_time)
                        except ValueError:
                            continue
                            
                    if 'requests_per_second' in summary:
                        try:
                            rps = float(summary['requests_per_second'])
                            throughputs.append(rps)
                        except ValueError:
                            continue
            except json.JSONDecodeError:
                continue
    
    # 计算性能统计指标
    perf_stats = {}
    if processing_times:
        perf_stats['processing_time'] = {
            'mean': np.mean(processing_times),
            'std': np.std(processing_times),
            'variance': np.var(processing_times),
            'p95': np.percentile(processing_times, 95),
            'p99': np.percentile(processing_times, 99),
            'min': np.min(processing_times),
            'max': np.max(processing_times),
            'median': np.median(processing_times),
            'count': len(processing_times)
        }
    
    if throughputs:
        perf_stats['throughput'] = {
            'mean': np.mean(throughputs),
            'std': np.std(throughputs),
            'variance': np.var(throughputs),
            'p95': np.percentile(throughputs, 95),
            'p99': np.percentile(throughputs, 99),
            'min': np.min(throughputs),
            'max': np.max(throughputs),
            'median': np.median(throughputs),
            'count': len(throughputs)
        }
    
    return perf_stats

def analyze_precision_recall_logs(log_dir):
    """分析精确率/召回率日志"""
    log_files = list(Path(log_dir).glob("*precision*sybil*.json"))
    
    precision_values = []
    recall_values = []
    f1_values = []
    
    for log_file in log_files:
        with open(log_file, 'r') as f:
            try:
                data = json.load(f)
                
                if 'precisionRecallTest' in data:
                    test_data = data['precisionRecallTest']
                    
                    if 'precision' in test_data:
                        precision_values.append(test_data['precision'])
                    if 'recall' in test_data:
                        recall_values.append(test_data['recall'])
                    if 'f1Score' in test_data:
                        f1_values.append(test_data['f1Score'])
            except json.JSONDecodeError:
                continue
    
    # 计算准确性统计指标
    accuracy_stats = {}
    
    if precision_values:
        accuracy_stats['precision'] = {
            'mean': np.mean(precision_values),
            'std': np.std(precision_values),
            'variance': np.var(precision_values),
            'p95': np.percentile(precision_values, 95),
            'min': np.min(precision_values),
            'max': np.max(precision_values),
            'count': len(precision_values)
        }
    
    if recall_values:
        accuracy_stats['recall'] = {
            'mean': np.mean(recall_values),
            'std': np.std(recall_values),
            'variance': np.var(recall_values),
            'p95': np.percentile(recall_values, 95),
            'min': np.min(recall_values),
            'max': np.max(recall_values),
            'count': len(recall_values)
        }
    
    if f1_values:
        accuracy_stats['f1'] = {
            'mean': np.mean(f1_values),
            'std': np.std(f1_values),
            'variance': np.var(f1_values),
            'p95': np.percentile(f1_values, 95),
            'min': np.min(f1_values),
            'max': np.max(f1_values),
            'count': len(f1_values)
        }
    
    return accuracy_stats

def analyze_security_logs(log_dir):
    """分析安全性日志（抗女巫攻击等）"""
    log_files = list(Path(log_dir).glob("*sybil*.json"))
    
    # 收集安全指标
    sybil_suppression_rates = []
    attack_success_rates = []
    attack_costs = []
    
    for log_file in log_files:
        with open(log_file, 'r') as f:
            try:
                data = json.load(f)
                
                # 分析女巫攻击抵抗力
                if 'sybilResistanceTest' in data:
                    sybil_data = data['sybilResistanceTest']
                    
                    if 'sybilSuppressionRate' in sybil_data:
                        sybil_suppression_rates.append(sybil_data['sybilSuppressionRate'])
                    
                # 分析精度召回测试中的攻击相关数据
                if 'precisionRecallTest' in data:
                    pr_data = data['precisionRecallTest']
                    
                    # 计算误报率作为攻击成本指标
                    if all(k in pr_data for k in ['falsePositiveRate']):
                        # 攻击成功率 = 1 - 防御成功率
                        attack_success_rates.append(pr_data['falsePositiveRate'])
                
                # 从模拟数据中提取攻击成本
                if 'summary' in data and 'sybilSuppressionRate' in data['summary']:
                    attack_success_rates.append(1 - data['summary']['sybilSuppressionRate'])
                    
            except json.JSONDecodeError:
                continue
    
    # 计算安全统计指标
    security_stats = {}
    
    if sybil_suppression_rates:
        security_stats['sybil_suppression'] = {
            'mean': np.mean(sybil_suppression_rates),
            'std': np.std(sybil_suppression_rates),
            'variance': np.var(sybil_suppression_rates),
            'p95': np.percentile(sybil_suppression_rates, 95),
            'min': np.min(sybil_suppression_rates),
            'max': np.max(sybil_suppression_rates),
            'count': len(sybil_suppression_rates)
        }
    
    if attack_success_rates:
        security_stats['attack_success'] = {
            'mean': np.mean(attack_success_rates),
            'std': np.std(attack_success_rates),
            'variance': np.var(attack_success_rates),
            'p95': np.percentile(attack_success_rates, 95),
            'min': np.min(attack_success_rates),
            'max': np.max(attack_success_rates),
            'count': len(attack_success_rates)
        }
    
    # 假设攻击成本与成功率成反比
    if attack_success_rates:
        attack_costs = [1.0 / max(rate, 0.001) for rate in attack_success_rates]  # 避免除零
        security_stats['attack_cost'] = {
            'mean': np.mean(attack_costs),
            'std': np.std(attack_costs),
            'variance': np.var(attack_costs),
            'p95': np.percentile(attack_costs, 95),
            'min': np.min(attack_costs),
            'max': np.max(attack_costs),
            'count': len(attack_costs)
        }
    
    return security_stats

def generate_summary_report(perf_stats, accuracy_stats, security_stats):
    """生成统计摘要报告"""
    report = {}
    
    # 性能指标
    report['performance'] = {}
    if 'processing_time' in perf_stats:
        pt = perf_stats['processing_time']
        report['performance']['processing_time'] = {
            'mean_ms': round(pt['mean'], 4),
            'std_ms': round(pt['std'], 4),
            'p95_ms': round(pt['p95'], 4),
            'p99_ms': round(pt['p99'], 4),
            'min_ms': round(pt['min'], 4),
            'max_ms': round(pt['max'], 4),
            'samples': pt['count']
        }
    
    if 'throughput' in perf_stats:
        tp = perf_stats['throughput']
        report['performance']['throughput'] = {
            'mean_qps': round(tp['mean'], 2),
            'std_qps': round(tp['std'], 2),
            'p95_qps': round(tp['p95'], 2),
            'p99_qps': round(tp['p99'], 2),
            'min_qps': round(tp['min'], 2),
            'max_qps': round(tp['max'], 2),
            'samples': tp['count']
        }
    
    # 准确性指标
    report['accuracy'] = {}
    for metric in ['precision', 'recall', 'f1']:
        if metric in accuracy_stats:
            acc = accuracy_stats[metric]
            report['accuracy'][metric] = {
                'mean': round(acc['mean'], 4),
                'std': round(acc['std'], 4),
                'p95': round(acc['p95'], 4),
                'min': round(acc['min'], 4),
                'max': round(acc['max'], 4),
                'samples': acc['count']
            }
    
    # 安全性指标
    report['security'] = {}
    for metric in ['sybil_suppression', 'attack_success', 'attack_cost']:
        if metric in security_stats:
            sec = security_stats[metric]
            report['security'][metric] = {
                'mean': round(sec['mean'], 4),
                'std': round(sec['std'], 4),
                'p95': round(sec['p95'], 4),
                'min': round(sec['min'], 4),
                'max': round(sec['max'], 4),
                'samples': sec['count']
            }
    
    return report

def create_latex_stats_table(report):
    """创建LaTeX格式的统计表格"""
    latex_content = []
    
    # 性能指标表格
    if 'performance' in report:
        perf = report['performance']
        latex_content.append("\\subsection{Performance Metrics}")
        latex_content.append("\\begin{table}[H]")
        latex_content.append("\\centering")
        latex_content.append("\\begin{tabular}{@{}lccccc@{}}")
        latex_content.append("\\toprule")
        latex_content.append("\\textbf{Metric} & \\textbf{Mean} & \\textbf{Std} & \\textbf{P95} & \\textbf{Min} & \\textbf{Max} \\\\")
        latex_content.append("\\midrule")
        
        if 'processing_time' in perf:
            pt = perf['processing_time']
            latex_content.append(f"Processing Time (ms) & {pt['mean_ms']} & {pt['std_ms']} & {pt['p95_ms']} & {pt['min_ms']} & {pt['max_ms']} \\\\")
        
        if 'throughput' in perf:
            tp = perf['throughput']
            latex_content.append(f"Throughput (QPS) & {tp['mean_qps']} & {tp['std_qps']} & {tp['p95_qps']} & {tp['min_qps']} & {tp['max_qps']} \\\\")
        
        latex_content.append("\\bottomrule")
        latex_content.append("\\end{tabular}")
        latex_content.append("\\caption{Performance Metrics Statistical Analysis}")
        latex_content.append("\\label{tab:performance_stats}")
        latex_content.append("\\end{table}")
        latex_content.append("")
    
    # 准确性指标表格
    if 'accuracy' in report:
        acc = report['accuracy']
        latex_content.append("\\subsection{Accuracy Metrics}")
        latex_content.append("\\begin{table}[H]")
        latex_content.append("\\centering")
        latex_content.append("\\begin{tabular}{@{}lccccc@{}}")
        latex_content.append("\\toprule")
        latex_content.append("\\textbf{Metric} & \\textbf{Mean} & \\textbf{Std} & \\textbf{P95} & \\textbf{Min} & \\textbf{Max} \\\\")
        latex_content.append("\\midrule")
        
        for metric in ['precision', 'recall', 'f1']:
            if metric in acc:
                m = acc[metric]
                latex_content.append(f"{metric.capitalize()} & {m['mean']} & {m['std']} & {m['p95']} & {m['min']} & {m['max']} \\\\")
        
        latex_content.append("\\bottomrule")
        latex_content.append("\\end{tabular}")
        latex_content.append("\\caption{Accuracy Metrics Statistical Analysis (Precision, Recall, F1)}")
        latex_content.append("\\label{tab:accuracy_stats}")
        latex_content.append("\\end{table}")
        latex_content.append("")
    
    # 安全性指标表格
    if 'security' in report:
        sec = report['security']
        latex_content.append("\\subsection{Security Metrics}")
        latex_content.append("\\begin{table}[H]")
        latex_content.append("\\centering")
        latex_content.append("\\begin{tabular}{@{}lccccc@{}}")
        latex_content.append("\\toprule")
        latex_content.append("\\textbf{Metric} & \\textbf{Mean} & \\textbf{Std} & \\textbf{P95} & \\textbf{Min} & \\textbf{Max} \\\\")
        latex_content.append("\\midrule")
        
        if 'sybil_suppression' in sec:
            ss = sec['sybil_suppression']
            latex_content.append(f"Sybil Suppression & {ss['mean']} & {ss['std']} & {ss['p95']} & {ss['min']} & {ss['max']} \\\\")
        
        if 'attack_success' in sec:
            as_rate = sec['attack_success']
            latex_content.append(f"Attack Success Rate & {as_rate['mean']} & {as_rate['std']} & {as_rate['p95']} & {as_rate['min']} & {as_rate['max']} \\\\")
        
        if 'attack_cost' in sec:
            ac = sec['attack_cost']
            latex_content.append(f"Attack Cost & {ac['mean']} & {ac['std']} & {ac['p95']} & {ac['min']} & {ac['max']} \\\\")
        
        latex_content.append("\\bottomrule")
        latex_content.append("\\end{tabular}")
        latex_content.append("\\caption{Security Metrics Statistical Analysis}")
        latex_content.append("\\label{tab:security_stats}")
        latex_content.append("\\end{table}")
        latex_content.append("")
    
    return "\n".join(latex_content)

def main():
    log_dir = Path("/home/Great/SRS-Protocol/logs")
    
    print("开始分析日志文件...")
    
    # 分析各类日志
    perf_stats = analyze_performance_logs(log_dir)
    accuracy_stats = analyze_precision_recall_logs(log_dir)
    security_stats = analyze_security_logs(log_dir)
    
    # 生成摘要报告
    report = generate_summary_report(perf_stats, accuracy_stats, security_stats)
    
    # 保存报告
    with open('/home/Great/SRS-Protocol/logs/statistical_summary.json', 'w') as f:
        json.dump(report, f, indent=2)
    
    # 生成LaTeX表格
    latex_tables = create_latex_stats_table(report)
    with open('/home/Great/SRS-Protocol/logs/statistical_tables.tex', 'w') as f:
        f.write(latex_tables)
    
    # 打印摘要
    print("\n=== 统计分析摘要 ===")
    print("\n性能指标:")
    if 'performance' in report:
        perf = report['performance']
        if 'processing_time' in perf:
            pt = perf['processing_time']
            print(f"  处理时间: 均值 {pt['mean_ms']}ms, P95 {pt['p95_ms']}ms, P99 {pt['p99_ms']}ms")
        if 'throughput' in perf:
            tp = perf['throughput']
            print(f"  吞吐量: 均值 {tp['mean_qps']} QPS, P95 {tp['p95_qps']} QPS")
    
    print("\n准确性指标:")
    if 'accuracy' in report:
        acc = report['accuracy']
        for metric in ['precision', 'recall', 'f1']:
            if metric in acc:
                m = acc[metric]
                print(f"  {metric.capitalize()}: 均值 {m['mean']}, 标准差 {m['std']}")
    
    print("\n安全性指标:")
    if 'security' in report:
        sec = report['security']
        for metric in ['sybil_suppression', 'attack_success']:
            if metric in sec:
                m = sec[metric]
                print(f"  {metric.replace('_', ' ').title()}: 均值 {m['mean']}, 标准差 {m['std']}")
    
    print(f"\n完整统计报告已保存至: /home/Great/SRS-Protocol/logs/statistical_summary.json")
    print(f"LaTeX表格已生成: /home/Great/SRS-Protocol/logs/statistical_tables.tex")
    
    return report

if __name__ == "__main__":
    main()
