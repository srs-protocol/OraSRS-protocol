import os

file_path = '/home/Great/SRS-Protocol/LaTeX/orasrs-paper-final-fixed.tex'

with open(file_path, 'r') as f:
    content = f.read()

# Target the broken array we just added (with single backslash)
target_broken = r"""\begin{equation}
\label{eq:time_decay}
d(t) = 
\left\{
\begin{array}{ll}
1.0 - \frac{t}{48} & \text{if } t \leq 24 \
0.5 \cdot e^{-\frac{t-24}{24}} & \text{if } t > 24
\end{array}
\right.
\end{equation}"""

# Replacement with correct double backslash
replacement_correct = r"""\begin{equation}
\label{eq:time_decay}
d(t) = 
\left\{
\begin{array}{ll}
1.0 - \frac{t}{48} & \text{if } t \leq 24 \\
0.5 \cdot e^{-\frac{t-24}{24}} & \text{if } t > 24
\end{array}
\right.
\end{equation}"""

if target_broken in content:
    content = content.replace(target_broken, replacement_correct)
    print("Fixed broken array backslash.")
else:
    print("Broken array target not found. Checking for original...")
    # Fallback to original just in case
    target_orig = r"""\begin{equation}
\label{eq:time_decay}

\end{equation}"""
    if target_orig in content:
        content = content.replace(target_orig, replacement_correct)
        print("Fixed original empty equation.")

with open(file_path, 'w') as f:
    f.write(content)
