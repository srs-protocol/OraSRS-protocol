import os

file_path = '/home/Great/SRS-Protocol/LaTeX/orasrs-paper-final-fixed.tex'

with open(file_path, 'r') as f:
    content = f.read()

target_eq = r"""\begin{equation}
\label{eq:time_decay}

\end{equation}"""

replacement_eq = r"""\begin{equation}
\label{eq:time_decay}
d(t) = 
\begin{cases} 
1.0 - \frac{t}{48} & \text{if } t \leq 24 \
0.5 \cdot e^{-\frac{t-24}{24}} & \text{if } t > 24
\end{cases}
\end{equation}"""

target_item = r"""\begin{itemize}
\end{itemize}"""

replacement_item = r"""% \begin{itemize}
% \end{itemize}"""

if target_eq in content:
    content = content.replace(target_eq, replacement_eq)
    print("Fixed equation.")
else:
    print("Equation target not found.")

if target_item in content:
    content = content.replace(target_item, replacement_item)
    print("Fixed itemize.")
else:
    print("Itemize target not found.")

with open(file_path, 'w') as f:
    f.write(content)
