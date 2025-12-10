#!/bin/bash
pdflatex orasrs-paper-final.tex 2>&1 | tee compilation_output.log
echo "Exit code: $?"
tail -30 compilation_output.log
