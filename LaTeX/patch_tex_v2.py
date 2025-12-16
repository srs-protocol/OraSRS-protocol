import os

file_path = '/home/Great/SRS-Protocol/LaTeX/orasrs-paper-final-fixed.tex'

with open(file_path, 'r') as f:
    content = f.read()

# Target the content we just added
target_eq = r"""\begin{equation}
\label{eq:time_decay}
d(t) = 
\begin{cases} 
1.0 - \frac{t}{48} & \text{if } t \leq 24 \
0.5 \cdot e^{-\frac{t-24}{24}} & \text{if } t > 24
\end{cases}
\end{equation}"""

replacement_eq = r"""\begin{equation}
\label{eq:time_decay}
d(t) = 
\left\{
\begin{array}{ll}
1.0 - \frac{t}{48} & \text{if } t \leq 24 \
0.5 \cdot e^{-\frac{t-24}{24}} & \text{if } t > 24
\end{array}
\right.
\end{equation}"""

if target_eq in content:
    content = content.replace(target_eq, replacement_eq)
    print("Fixed equation with array.")
else:
    print("Equation target not found (maybe already fixed or whitespace mismatch).")
    # Fallback: try to find the original empty block again just in case
    target_orig = r"""\begin{equation}
\label{eq:time_decay}

\end{equation}"""
    if target_orig in content:
        content = content.replace(target_orig, replacement_eq)
        print("Fixed original empty equation with array.")

with open(file_path, 'w') as f:
    f.write(content)
