
import re

def insert_missing_sections():
    with open('/home/Great/SRS-Protocol/LaTeX/orasrs-paper-final.tex', 'r') as f:
        content = f.read()

    target = r'\subsection{Network Topology Engineering Trade-offs}'
    
    if target in content:
        # 检查是否已经有 System Architecture 标题
        if r'\section{System Architecture}' not in content:
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

\section{System Architecture}
\subsection{Overview}
OraSRS adopts a three-layer architecture: Edge Layer, Consensus Layer, and Intelligence Layer.
"""
            content = content.replace(target, sota_table + '\n' + target)
            print("Fixed: Inserted System Architecture section and SOTA table.")
        else:
            print("System Architecture section already exists.")
    else:
        print("Error: Could not find target subsection to insert before.")

    with open('/home/Great/SRS-Protocol/LaTeX/orasrs-paper-final.tex', 'w') as f:
        f.write(content)

insert_missing_sections()
