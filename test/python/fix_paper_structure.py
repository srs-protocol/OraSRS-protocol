
import re

def fix_paper():
    with open('/home/Great/SRS-Protocol/LaTeX/orasrs-paper-final.tex', 'r') as f:
        content = f.read()

    # 1. 提升隐私章节
    # 查找 \subsection{Privacy Protection Measures}
    # 并将其替换为 \section{Privacy Enhancement Architecture}
    # 同时添加 ZKP 和 同态加密 的内容（如果尚未存在）
    privacy_section_title = r'\section{Privacy Enhancement Architecture}'
    if privacy_section_title not in content:
        target = r'\subsection{Privacy Protection Measures}'
        if target in content:
            new_content = r"""
\section{Privacy Enhancement Architecture}
\subsection{Zero-Knowledge Proofs}
We utilize Zero-Knowledge Proofs (ZKPs) to verify that an IP's reputation score exceeds a certain threshold (e.g., > 0.8) without revealing the exact score. This allows consumers to make informed decisions while protecting the proprietary scoring models of the providers.

\subsection{Homomorphic Encryption}
To further protect data privacy during the aggregation process, we employ homomorphic encryption. This allows the consensus nodes to compute the average reputation score from encrypted individual reports without decrypting them, ensuring that individual validator inputs remain confidential.
"""
            content = content.replace(target, new_content)
            print("Fixed: Privacy section promoted and expanded.")
        else:
            print("Warning: Could not find 'Privacy Protection Measures' subsection.")

    # 2. 验证 SOTA 表格
    sota_table_caption = r'\caption{Comparison with SOTA Solutions}'
    if sota_table_caption not in content:
        # 插入 SOTA 表格
        # 寻找 Related Work 章节
        target = r'\section{System Architecture}'
        if target in content:
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
            content = content.replace(target, sota_table + '\n' + target)
            print("Fixed: SOTA table inserted.")
        else:
            print("Warning: Could not find 'System Architecture' section.")
    else:
        print("Verified: SOTA table exists.")

    # 3. 验证 Figure 1
    # 检查标题是否包含 T0-T3
    fig1_caption_part = r'T0-T3 timeline'
    if fig1_caption_part not in content:
        # 尝试替换旧标题
        old_caption = r'\caption{OraSRS system architecture showing the triad design: (1) Edge Agent for local-first enforcement, (2) Consensus Layer for tamper-proof verification, and (3) Intelligence Layer for global reputation sharing.}'
        new_caption = r'\caption{OraSRS system architecture showing the triad design with T0-T3 timeline: (1) Edge Agent (T0), (2) Consensus Layer (T1-T2), and (3) Intelligence Layer (T3).}'
        if old_caption in content:
            content = content.replace(old_caption, new_caption)
            print("Fixed: Figure 1 caption updated.")
        else:
            print("Warning: Could not find old Figure 1 caption to update.")
    else:
        print("Verified: Figure 1 caption is correct.")

    with open('/home/Great/SRS-Protocol/LaTeX/orasrs-paper-final.tex', 'w') as f:
        f.write(content)

fix_paper()
