import json
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
from sklearn.metrics import precision_score, recall_score, f1_score
import os
from pathlib import Path

# ========== 1. 日志读取 ==========
def load_logs(log_dir):
    """
    读取日志文件，返回 DataFrame
    从现有的日志文件中读取数据
    """
    records = []
    
    # 读取性能测试日志
    perf_files = Path(log_dir).glob("performance-test-*.json")
    for file_path in perf_files:
        try:
            with open(file_path, 'r') as f:
                data = json.load(f)
                if 'test_summary' in data:
                    summary = data['test_summary']
                    summary['log_type'] = 'performance'
                    records.append(summary)
        except:
            continue
    
    # 读取精度/召回测试日志
    pr_files = Path(log_dir).glob("*precision*sybil*.json")
    for file_path in pr_files:
        try:
            with open(file_path, 'r') as f:
                data = json.load(f)
                if 'precisionRecallTest' in data:
                    pr_data = data['precisionRecallTest']
                    pr_data['log_type'] = 'precision_recall'
                    # 添加summary数据
                    if 'summary' in data:
                        pr_data.update(data['summary'])
                    records.append(pr_data)
        except:
            continue
            
    # 读取女巫攻击模拟日志
    sybil_files = Path(log_dir).glob("*sybil*.json")
    for file_path in sybil_files:
        try:
            with open(file_path, 'r') as f:
                data = json.load(f)
                if 'sybilResistanceTest' in data:
                    sybil_data = data['sybilResistanceTest']
                    sybil_data['log_type'] = 'sybil_resistance'
                    records.append(sybil_data)
        except:
            continue
    
    # 读取合约测试日志
    contract_files = Path(log_dir).glob("*contract*.json")
    for file_path in contract_files:
        try:
            with open(file_path, 'r') as f:
                data = json.load(f)
                if 'test_summary' in data:
                    summary = data['test_summary']
                    summary['log_type'] = 'contract_test'
                    records.append(summary)
        except:
            continue
    
    if records:
        return pd.DataFrame(records)
    else:
        return pd.DataFrame()

# ========== 2. 性能统计 ==========
def performance_stats(df):
    """计算性能统计指标"""
    # 提取延迟数据
    latencies = []
    throughputs = []
    
    perf_logs = df[df['log_type'] == 'performance']
    if not perf_logs.empty:
        for _, row in perf_logs.iterrows():
            if 'avg_time_per_ip_ms' in row and pd.notna(row['avg_time_per_ip_ms']):
                latencies.append(float(row['avg_time_per_ip_ms']))
            elif 'avg_time_per_query_ms' in row and pd.notna(row['avg_time_per_query_ms']):
                latencies.append(float(row['avg_time_per_query_ms']))
                
            if 'requests_per_second' in row and pd.notna(row['requests_per_second']):
                throughputs.append(float(row['requests_per_second']))
    
    contract_logs = df[df['log_type'] == 'contract_test']
    if not contract_logs.empty:
        for _, row in contract_logs.iterrows():
            if 'avg_time_per_query_ms' in row and pd.notna(row['avg_time_per_query_ms']):
                try:
                    avg_time = float(row['avg_time_per_query_ms'])
                    if avg_time > 0:  # 过滤无效数据
                        latencies.append(avg_time)
                except:
                    continue
                
            if 'requests_per_second' in row and pd.notna(row['requests_per_second']):
                try:
                    rps = float(row['requests_per_second'])
                    if rps > 0:  # 过滤无效数据
                        throughputs.append(rps)
                except:
                    continue
    
    stats = {}
    if latencies:
        latencies = np.array(latencies)
        stats['latency'] = {
            "mean": np.mean(latencies),
            "variance": np.var(latencies),
            "p50": np.percentile(latencies, 50),
            "p95": np.percentile(latencies, 95),
            "p99": np.percentile(latencies, 99),
            "min": np.min(latencies),
            "max": np.max(latencies),
            "count": len(latencies),
            "std": np.std(latencies)
        }
    
    if throughputs:
        throughputs = np.array(throughputs)
        stats['throughput'] = {
            "mean": np.mean(throughputs),
            "variance": np.var(throughputs),
            "p50": np.percentile(throughputs, 50),
            "p95": np.percentile(throughputs, 95),
            "p99": np.percentile(throughputs, 99),
            "min": np.min(throughputs),
            "max": np.max(throughputs),
            "count": len(throughputs),
            "std": np.std(throughputs)
        }
    
    return stats

# ========== 3. 检测准确性 ==========
def detection_metrics(df):
    """计算检测准确性指标"""
    pr_logs = df[df['log_type'] == 'precision_recall']
    
    if not pr_logs.empty:
        # 直接从日志中提取已计算的指标
        precisions = []
        recalls = []
        f1_scores = []
        
        for _, row in pr_logs.iterrows():
            if 'precision' in row and pd.notna(row['precision']):
                precisions.append(row['precision'])
            if 'recall' in row and pd.notna(row['recall']):
                recalls.append(row['recall'])
            if 'f1Score' in row and pd.notna(row['f1Score']):
                f1_scores.append(row['f1Score'])
        
        metrics = {}
        if precisions:
            precisions = np.array(precisions)
            metrics['precision'] = {
                "mean": np.mean(precisions),
                "variance": np.var(precisions),
                "std": np.std(precisions),
                "min": np.min(precisions),
                "max": np.max(precisions),
                "count": len(precisions)
            }
        
        if recalls:
            recalls = np.array(recalls)
            metrics['recall'] = {
                "mean": np.mean(recalls),
                "variance": np.var(recalls),
                "std": np.std(recalls),
                "min": np.min(recalls),
                "max": np.max(recalls),
                "count": len(recalls)
            }
        
        if f1_scores:
            f1_scores = np.array(f1_scores)
            metrics['f1'] = {
                "mean": np.mean(f1_scores),
                "variance": np.var(f1_scores),
                "std": np.std(f1_scores),
                "min": np.min(f1_scores),
                "max": np.max(f1_scores),
                "count": len(f1_scores)
            }
        
        return metrics
    
    return {}

# ========== 4. 安全性测试 ==========
def sybil_attack_stats(df):
    """计算安全性测试指标"""
    sybil_logs = df[df['log_type'] == 'sybil_resistance']
    pr_logs = df[df['log_type'] == 'precision_recall']
    
    stats = {}
    
    if not sybil_logs.empty:
        suppression_rates = []
        detection_rates = []
        
        for _, row in sybil_logs.iterrows():
            if 'sybilSuppressionRate' in row and pd.notna(row['sybilSuppressionRate']):
                suppression_rates.append(row['sybilSuppressionRate'])
            if 'sybilDetectionRate' in row and pd.notna(row['sybilDetectionRate']):
                detection_rates.append(row['sybilDetectionRate'])
        
        if suppression_rates:
            suppression_rates = np.array(suppression_rates)
            stats['sybil_suppression'] = {
                "mean": np.mean(suppression_rates),
                "variance": np.var(suppression_rates),
                "std": np.std(suppression_rates),
                "p95": np.percentile(suppression_rates, 95),
                "min": np.min(suppression_rates),
                "max": np.max(suppression_rates),
                "count": len(suppression_rates)
            }
        
        if detection_rates:
            detection_rates = np.array(detection_rates)
            stats['sybil_detection'] = {
                "mean": np.mean(detection_rates),
                "variance": np.var(detection_rates),
                "std": np.std(detection_rates),
                "min": np.min(detection_rates),
                "max": np.max(detection_rates),
                "count": len(detection_rates)
            }
    
    # 从精度召回日志中获取攻击成功率
    if not pr_logs.empty:
        attack_success_rates = []
        
        for _, row in pr_logs.iterrows():
            # 使用假正例率作为攻击成功指标
            if 'falsePositiveRate' in row and pd.notna(row['falsePositiveRate']):
                attack_success_rates.append(row['falsePositiveRate'])
        
        if attack_success_rates:
            attack_success_rates = np.array(attack_success_rates)
            stats['attack_success_rate'] = {
                "mean": np.mean(attack_success_rates),
                "variance": np.var(attack_success_rates),
                "std": np.std(attack_success_rates),
                "p95": np.percentile(attack_success_rates, 95),
                "min": np.min(attack_success_rates),
                "max": np.max(attack_success_rates),
                "count": len(attack_success_rates)
            }
    
    return stats

# ========== 5. 可视化 ==========
def plot_latency_distribution(df):
    """绘制延迟分布图"""
    perf_logs = df[df['log_type'] == 'performance']
    latencies = []
    
    for _, row in perf_logs.iterrows():
        if 'avg_time_per_ip_ms' in row and pd.notna(row['avg_time_per_ip_ms']):
            latencies.append(float(row['avg_time_per_ip_ms']))
        elif 'avg_time_per_query_ms' in row and pd.notna(row['avg_time_per_query_ms']):
            latencies.append(float(row['avg_time_per_query_ms']))
    
    if latencies:
        latencies = np.array(latencies)
        plt.figure(figsize=(10, 6))
        plt.hist(latencies, bins=30, color="skyblue", edgecolor="black")
        plt.title("Latency Distribution (ms)")
        plt.xlabel("Latency (ms)")
        plt.ylabel("Frequency")
        plt.grid(True, alpha=0.3)
        plt.savefig('/home/Great/SRS-Protocol/logs/latency_distribution.png')
        plt.show()
        print("延迟分布图已保存至 /home/Great/SRS-Protocol/logs/latency_distribution.png")

def generate_theoretical_formulas():
    """生成理论公式部分"""
    formulas = """
# Theoretical Formalization

## Simplified Reputation Update Function

We adopt a simplified reputation update function to model node behavior in the OraSRS protocol:

$$R_i(t+1) = R_i(t) + \alpha \cdot valid - \beta \cdot invalid$$

Where:
- $R_i(t)$: Reputation of node $i$ at time $t$
- $\alpha$: Positive reward factor for valid contributions
- $\beta$: Penalty factor for invalid contributions
- $valid$: Valid contribution score
- $invalid$: Invalid contribution score

This engineering-driven model effectively captures node behavior without complex mathematical derivation.

## Attack Cost Function

The attack cost function for Sybil attacks is simplified as:

$$C_{attack} = N_{sybil} \cdot c_{id} + P_{penalty}$$

Where:
- $N_{sybil}$: Number of Sybil identities created
- $c_{id}$: Cost per identity creation
- $P_{penalty}$: Potential penalty upon detection

## Detection Accuracy

The F1 score calculation follows the standard formula:

$$F1 = 2 \cdot \frac{Precision \cdot Recall}{Precision + Recall}$$

Where:
- $Precision = \frac{TP}{TP + FP}$ (True Positives over all positive predictions)
- $Recall = \frac{TP}{TP + FN}$ (True Positives over all actual positives)

These simplified formulas provide theoretical grounding while maintaining engineering practicality.
    """
    return formulas

def create_latex_tables(perf_stats, det_metrics, sec_stats):
    """创建LaTeX格式的统计表格"""
    latex_content = []
    
    # 性能指标表格
    if 'latency' in perf_stats or 'throughput' in perf_stats:
        latex_content.append("\\section{Statistical Analysis Results}")
        latex_content.append("\\subsection{Performance Metrics}")
        latex_content.append("\\begin{table}[H]")
        latex_content.append("\\centering")
        latex_content.append("\\begin{tabular}{@{}lcccccc@{}}")
        latex_content.append("\\toprule")
        latex_content.append("\\textbf{Metric} & \\textbf{Mean} & \\textbf{Std} & \\textbf{P50} & \\textbf{P95} & \\textbf{Min} & \\textbf{Max} \\\\")
        latex_content.append("\\midrule")
        
        if 'latency' in perf_stats:
            lat = perf_stats['latency']
            latex_content.append(f"Latency (ms) & {lat['mean']:.4f} & {lat['std']:.4f} & {lat['p50']:.4f} & {lat['p95']:.4f} & {lat['min']:.4f} & {lat['max']:.4f} \\\\")
        
        if 'throughput' in perf_stats:
            thr = perf_stats['throughput']
            latex_content.append(f"Throughput (QPS) & {thr['mean']:.2f} & {thr['std']:.2f} & {thr['p50']:.2f} & {thr['p95']:.2f} & {thr['min']:.2f} & {thr['max']:.2f} \\\\")
        
        latex_content.append("\\bottomrule")
        latex_content.append("\\end{tabular}")
        latex_content.append("\\caption{Performance Metrics Statistical Analysis}")
        latex_content.append("\\label{tab:performance_stats}")
        latex_content.append("\\end{table}")
        latex_content.append("")
    
    # 准确性指标表格
    if det_metrics:
        latex_content.append("\\subsection{Accuracy Metrics}")
        latex_content.append("\\begin{table}[H]")
        latex_content.append("\\centering")
        latex_content.append("\\begin{tabular}{@{}lcccccc@{}}")
        latex_content.append("\\toprule")
        latex_content.append("\\textbf{Metric} & \\textbf{Mean} & \\textbf{Std} & \\textbf{Variance} & \\textbf{Min} & \\textbf{Max} & \\textbf{Count} \\\\")
        latex_content.append("\\midrule")
        
        for metric in ['precision', 'recall', 'f1']:
            if metric in det_metrics:
                m = det_metrics[metric]
                latex_content.append(f"{metric.capitalize()} & {m['mean']:.4f} & {m['std']:.4f} & {m['variance']:.6f} & {m['min']:.4f} & {m['max']:.4f} & {m['count']} \\\\")
        
        latex_content.append("\\bottomrule")
        latex_content.append("\\end{tabular}")
        latex_content.append("\\caption{Accuracy Metrics Statistical Analysis (Precision, Recall, F1)}")
        latex_content.append("\\label{tab:accuracy_stats}")
        latex_content.append("\\end{table}")
        latex_content.append("")
    
    # 安全性指标表格
    if sec_stats:
        latex_content.append("\\subsection{Security Metrics}")
        latex_content.append("\\begin{table}[H]")
        latex_content.append("\\centering")
        latex_content.append("\\begin{tabular}{@{}lcccccc@{}}")
        latex_content.append("\\toprule")
        latex_content.append("\\textbf{Metric} & \\textbf{Mean} & \\textbf{Std} & \\textbf{P95} & \\textbf{Min} & \\textbf{Max} & \\textbf{Count} \\\\")
        latex_content.append("\\midrule")
        
        for metric in ['sybil_suppression', 'attack_success_rate']:
            if metric in sec_stats:
                m = sec_stats[metric]
                latex_content.append(f"{metric.replace('_', ' ').title()} & {m['mean']:.4f} & {m['std']:.4f} & {m['p95']:.4f} & {m['min']:.4f} & {m['max']:.4f} & {m['count']} \\\\")
        
        latex_content.append("\\bottomrule")
        latex_content.append("\\end{tabular}")
        latex_content.append("\\caption{Security Metrics Statistical Analysis}")
        latex_content.append("\\label{tab:security_stats}")
        latex_content.append("\\end{table}")
        latex_content.append("")
    
    return "\n".join(latex_content)

# ========== 主程序入口 ==========
if __name__ == "__main__":
    log_dir = "/home/Great/SRS-Protocol/logs"
    
    # 1. 加载日志
    print("正在加载日志文件...")
    df = load_logs(log_dir)
    
    if df.empty:
        print("未找到有效的日志数据")
    else:
        print(f"成功加载 {len(df)} 条日志记录")
        print(f"日志类型: {df['log_type'].unique()}")
    
        # 2. 性能统计
        print("\n正在计算性能统计指标...")
        perf = performance_stats(df)
        print("性能统计完成")
    
        # 3. 检测准确性
        print("正在计算检测准确性指标...")
        metrics = detection_metrics(df)
        print("检测准确性计算完成")
    
        # 4. 安全性测试
        print("正在计算安全性测试指标...")
        sybil = sybil_attack_stats(df)
        print("安全性测试计算完成")
    
        # 5. 生成完整报告
        print("\n生成统计分析报告...")
        
        # 保存统计结果
        stats_report = {
            'performance': perf,
            'accuracy': metrics,
            'security': sybil
        }
        
        with open('/home/Great/SRS-Protocol/logs/final_stats_report.json', 'w') as f:
            json.dump(stats_report, f, indent=2, default=str)
        
        # 生成LaTeX表格
        latex_tables = create_latex_tables(perf, metrics, sybil)
        with open('/home/Great/SRS-Protocol/logs/final_statistical_tables.tex', 'w') as f:
            f.write(latex_tables)
        
        # 生成理论公式部分
        theoretical_part = generate_theoretical_formulas()
        with open('/home/Great/SRS-Protocol/logs/theoretical_formalization_content.txt', 'w') as f:
            f.write(theoretical_part)
        
        # 6. 绘制延迟分布图
        try:
            plot_latency_distribution(df)
        except:
            print("绘图失败，可能缺少matplotlib依赖")
        
        # 打印摘要
        print("\n=== 统计分析摘要 ===")
        if perf:
            print("\n性能指标:")
            if 'latency' in perf:
                lat = perf['latency']
                print(f"  延迟: 均值 {lat['mean']:.4f}ms, P95 {lat['p95']:.4f}ms, P99 {lat['p99']:.4f}ms")
            if 'throughput' in perf:
                thr = perf['throughput']
                print(f"  吞吐量: 均值 {thr['mean']:.2f} QPS, P95 {thr['p95']:.2f} QPS")
        
        if metrics:
            print("\n准确性指标:")
            for metric in ['precision', 'recall', 'f1']:
                if metric in metrics:
                    m = metrics[metric]
                    print(f"  {metric.capitalize()}: 均值 {m['mean']:.4f}, 标准差 {m['std']:.4f}")
        
        if sybil:
            print("\n安全性指标:")
            for metric in ['sybil_suppression', 'attack_success_rate']:
                if metric in sybil:
                    m = sybil[metric]
                    print(f"  {metric.replace('_', ' ').title()}: 均值 {m['mean']:.4f}, 标准差 {m['std']:.4f}")
        
        print(f"\n完整统计报告已保存至: /home/Great/SRS-Protocol/logs/final_stats_report.json")
        print(f"LaTeX表格已生成: /home/Great/SRS-Protocol/logs/final_statistical_tables.tex")
        print(f"理论公式内容已保存: /home/Great/SRS-Protocol/logs/theoretical_formalization_content.txt")
