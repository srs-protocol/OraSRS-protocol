
import re

def diagnose_latex():
    with open('/home/Great/SRS-Protocol/LaTeX/orasrs-paper-final.tex', 'r') as f:
        lines = f.readlines()

    print("--- Sections Found ---")
    for i, line in enumerate(lines):
        if '\\section' in line:
            print(f"Line {i+1}: {line.strip()}")
    
    print("\n--- Subsections Found ---")
    for i, line in enumerate(lines):
        if '\\subsection' in line:
            print(f"Line {i+1}: {line.strip()}")

diagnose_latex()
