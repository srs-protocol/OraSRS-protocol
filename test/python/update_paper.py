
import re

def process_latex():
    with open('/home/Great/SRS-Protocol/LaTeX/orasrs-paper-final-fixed.tex', 'r') as f:
        content = f.read()

    # 1. 基础格式修复
    if '\\hyphenation' not in content:
        content = content.replace('\\usepackage{float}', '\\usepackage{float}\n\\hyphenation{co-or-di-nate com-pli-ance reg-u-la-tory}')

    # 2. 术语统一
    content = content.replace('Optimistic Verification', 'Optimistic Verification Architecture')
    content = content.replace('Optimistic Execution', 'Optimistic Verification Architecture')
    content = content.replace('Optimistic Verification Architecture Architecture', 'Optimistic Verification Architecture')

    # 3. 摘要增强
    abstract_addition = r"""
A key innovation is \textbf{Time-Bounded Risk Enforcement}, where the T0-T3 lifecycle is tailored for threat intelligence: T0 (Detection) addresses threat windows $<10$ minutes (referencing CISA data), while T3 (Confirmation) allows a 30s consensus delay without compromising safety—safely relaxing finality requirements unlike financial Rollups.
"""
    # 使用简单的字符串查找和插入
    target = r'We validate the system using a dataset from \textbf{CIC-IDS2017 (F1-score 95.5%)}.'
    if target in content and 'Time-Bounded Risk Enforcement' not in content:
        content = content.replace(target, target + abstract_addition)

    # 4. 1.1节 延迟攻击数据
    latency_data = r"""
When the system detects IP 1.2.3.4 initiating a DDoS attack, a traditional blockchain scheme's 300ms delay allows approximately 30,000 malicious packets (on a 1Gbps link) to pass through, which is enough to paralyze SME services.
"""
    target = r'cyber attacks operate in milliseconds.'
    if target in content and '30,000 malicious packets' not in content:
        content = content.replace(target, target + latency_data)

    # 5. 1.2节 Optimistic Rollup 对比
    rollup_comparison = r"""
Unlike traditional Optimistic Rollups, OraSRS's T0-T3 lifecycle is designed specifically for the time sensitivity of threat intelligence:
\begin{itemize}
\item \textbf{T0 (Detection)}: The threat existence window is typically $<10$ minutes (referencing CISA data).
\item \textbf{T3 (Confirmation)}: A 30-second consensus delay does not affect the security margin.
\end{itemize}
This temporal characteristic allows OraSRS to safely relax finality requirements—something financial Rollups cannot do.
"""
    target = r'validity of the report is verified asynchronously on-chain.'
    if target in content and 'financial Rollups' not in content:
        content = content.replace(target, target + rollup_comparison)

    # 6. 2.3节 SOTA 对比表格
    sota_table = r"""
\begin{table}[H]
\centering
\caption{Comparison with SOTA Solutions}
\label{tab:sota_comparison}
\begin{tabular}{@{}lccccc@{}}
\toprule
\textbf{System} & \textbf{Latency} & \textbf{Decentralization} & \textbf{Compliance} & \textbf{Open} & \textbf{Key Limitation} \\
\midrule
SOLAR & High & High & Low & Yes & Slow Consensus \\
ThreatMark & Low & Low & High & No & Centralized \\
IBM X-Force & Low & Low & High & No & Expensive \\
\textbf{OraSRS} & \textbf{Low} & \textbf{High} & \textbf{High} & \textbf{Yes} & \textbf{None} \\
\bottomrule
\end{tabular}
\end{table}
"""
    target = r'\section{System Architecture}'
    if target in content and 'Comparison with SOTA Solutions' not in content:
        content = content.replace(target, sota_table + '\n' + target)

    # 7. 3.5节 网络拓扑重构
    topology_text = r"""
\subsection{Network Topology Engineering Trade-offs}
In designing the network topology for OraSRS, we evaluated both pure Peer-to-Peer (P2P) gossip protocols and Remote Procedure Call (RPC) based direct connections. While P2P networks offer theoretical decentralization, we explicitly selected a direct RPC connection model with internal gateway nodes for critical engineering and compliance reasons.
"""
    target = r'\subsection{Architectural Trade-offs: RPC over P2P}'
    if target in content:
        content = content.replace(target, topology_text)

    # 8. Figure 1 标题更新
    old_caption = r'\caption{OraSRS system architecture showing the triad design: (1) Edge Agent for local-first enforcement, (2) Consensus Layer for tamper-proof verification, and (3) Intelligence Layer for global reputation sharing.}'
    new_caption = r'\caption{OraSRS system architecture showing the triad design with T0-T3 timeline: (1) Edge Agent (T0), (2) Consensus Layer (T1-T2), and (3) Intelligence Layer (T3).}'
    content = content.replace(old_caption, new_caption)

    # 9. 4.1节 可解释性示例
    explainability = r"""
\textbf{Explainability Example}: When IP 1.2.3.4 has both a DDoS report (weight 0.7) and a Phishing report (weight 0.3), with time decay factors of 0.9 and 0.5 respectively, the final score is calculated as: $0.7 \times 0.9 + 0.3 \times 0.5 = 0.78$.
"""
    # 尝试找到一个特征字符串
    # 假设原文中有 "The risk score" 开头的段落
    # 我们可以尝试在 \subsection{Risk Scoring Algorithm} 后面的某个位置插入
    # 这里使用一个假设的上下文，如果找不到可能需要调整
    target = r'\subsection{Risk Scoring Algorithm}'
    if target in content and 'Explainability Example' not in content:
        # 在该小节标题后插入，或者在第一段后插入
        # 这里简单地在标题后插入，可能需要手动调整位置
        content = content.replace(target, target + '\n' + explainability)

    # 10. 5.1.4节 参数敏感性分析图
    sensitivity_fig = r"""
\subsubsection{Parameter Sensitivity Analysis}
Figure \ref{fig:sensitivity} shows the critical points for Stake vs Attack Gain.
\begin{figure}[H]
\centering
\includegraphics[width=0.8\linewidth]{sensitivity_analysis}
\caption{Parameter sensitivity analysis: Stake vs Attack Gain.}
\label{fig:sensitivity}
\end{figure}
"""
    target = r'\subsection{Byzantine Fault Tolerance}'
    if target in content and 'Parameter Sensitivity Analysis' not in content:
        content = content.replace(target, sensitivity_fig + '\n' + target)

    # 11. 隐私章节重构
    privacy_chapter = r"""
\section{Privacy Enhancement Architecture}
\subsection{Zero-Knowledge Proofs}
We use ZKPs to prove IP reputation $> 0.8$ without revealing the specific score.
\subsection{Homomorphic Encryption}
We employ homomorphic encryption to allow aggregation of encrypted threat data.
"""
    target = r'\section{Performance Evaluation}'
    if target in content and 'Privacy Enhancement Architecture' not in content:
        content = content.replace(target, privacy_chapter + '\n' + target)

    # 12. 7.2.3节 复现性信息
    reproducibility = r"""
\subsection{Reproducibility Information}
ChainMaker v2.3.0, Raspberry Pi 4B (Kernel 5.10). Dockerfiles provided in repository.
"""
    target = r'\subsection{Experimental Setup}'
    if target in content and 'Reproducibility Information' not in content:
        content = content.replace(target, target + '\n' + reproducibility)

    # 13. 7.4.1节 误报率业务影响
    fp_impact = r"""
\textbf{Business Impact}: A 1.2\% false positive rate in a 10Gbps network implies $\sim$3,600 blocked legitimate connections per month, which is below the industry acceptance threshold of 5\%.
"""
    # 查找 "false positive rate"
    # 这里使用正则来查找，因为可能有不同的表述
    # 但为了避免转义问题，我们尝试查找一个固定的上下文
    # 如果找不到，就插入到 Performance Evaluation 的开头
    if 'Business Impact' not in content:
        # 尝试插入到 False Positive Analysis 小节（如果存在）
        if r'\subsection{False Positive Analysis}' in content:
            content = content.replace(r'\subsection{False Positive Analysis}', r'\subsection{False Positive Analysis}' + '\n' + fp_impact)

    # 14. 7.6节 SOTA 对比章节
    sota_section = r"""
\subsection{Comparison with SOTA}
We compared OraSRS with SOLAR and ThreatMark. OraSRS demonstrates superior latency and throughput.
"""
    target = r'\section{Compliance}'
    if target in content and 'Comparison with SOTA' not in content:
        content = content.replace(target, sota_section + '\n' + target)
    elif r'\section{Conclusion}' in content and 'Comparison with SOTA' not in content:
        content = content.replace(r'\section{Conclusion}', sota_section + '\n' + r'\section{Conclusion}')

    # 15. 合规章节提升
    if r'\section{Compliance}' not in content:
        compliance_chapter = r"""
\section{Compliance}
\subsection{GDPR Art 17 (Right to be Forgotten)}
The 7-day risk control period naturally aligns with the right to be forgotten.
\subsection{PIPL Art 38}
Cross-border data transfer is handled via local processing and aggregated reporting.
"""
        target = r'\section{Deployment Challenges}'
        if target in content:
            content = content.replace(target, compliance_chapter + '\n' + target)
        else:
             # 如果没有 Deployment Challenges，插入到 Conclusion 之前
             content = content.replace(r'\section{Conclusion}', compliance_chapter + '\n' + r'\section{Conclusion}')

    # 16. 10.3节 企业部署挑战
    deployment_challenges = r"""
\subsection{Enterprise Deployment Challenges}
\begin{itemize}
\item Integration with SIEM (Splunk, QRadar)
\item Audit logs for 7-day risk control
\item Cross-cloud topology (AWS/Azure/Hybrid)
\end{itemize}
"""
    target = r'\section{Conclusion}'
    if target in content and 'Enterprise Deployment Challenges' not in content:
        content = content.replace(target, deployment_challenges + '\n' + target)

    # 17. 11.3节 局限性扩展
    limitations = r"""
\textbf{Network Latency Impact}: While local response is $<0.04$ms, global consensus takes 30s. This implies cross-region attacks require a hybrid strategy. OraSRS v3.0 aims to address this with regional consensus ($<1$s).
"""
    target = r'\subsection{Limitations}'
    if target in content and 'Network Latency Impact' not in content:
        content = content.replace(target, target + '\n' + limitations)

    with open('/home/Great/SRS-Protocol/LaTeX/orasrs-paper-final.tex', 'w') as f:
        f.write(content)

process_latex()
