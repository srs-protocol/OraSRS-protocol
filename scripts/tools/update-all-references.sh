#!/bin/bash

# 更新所有引用的脚本
# 将旧的OraSRS名称替换为新的SecurityRiskAssessment名称

set -e

echo "更新所有OraSRS相关引用到SecurityRiskAssessment..."

# 更新合约名称
find /home/Great/SRS-Protocol -name "*.go" -type f -exec sed -i 's/OrasrsStakingContract/SecurityRiskAssessmentContract/g' {} \;
find /home/Great/SRS-Protocol -name "*.md" -type f -exec sed -i 's/OrasrsStakingContract/SecurityRiskAssessmentContract/g' {} \;

# 更新包名称
find /home/Great/SRS-Protocol -name "*.go" -type f -exec sed -i 's/sracontract/sracontract/g' {} \;
find /home/Great/SRS-Protocol -name "*.md" -type f -exec sed -i 's/sracontract/sracontract/g' {} \;

# 更新合约入口点
find /home/Great/SRS-Protocol -name "*.go" -type f -exec sed -i 's/sracontract\.Main/sracontract\.Main/g' {} \;

# 更新合约名称（如果在部署脚本中）
find /home/Great/SRS-Protocol -name "*.go" -type f -exec sed -i 's/sracontract/sracontract/g' {} \;
find /home/Great/SRS-Protocol -name "*.sh" -type f -exec sed -i 's/sracontract/sracontract/g' {} \;

# 更新文档中的OraSRS引用
find /home/Great/SRS-Protocol -name "*.md" -type f -exec sed -i 's/OraSRS/SecurityRiskAssessment/g' {} \;
find /home/Great/SRS-Protocol -name "*.md" -type f -exec sed -i 's/orasrs/SRA/g' {} \;

echo "所有引用已更新完成！"

# 验证更新结果
echo "验证更新结果..."
OLD_REFERENCES=$(grep -r "OrasrsStakingContract\|sracontract" --include="*.go" --include="*.yml" --include="*.md" . | wc -l)
echo "发现 $OLD_REFERENCES 个可能的旧引用（如果为0则表示全部更新完成）"

if [ $OLD_REFERENCES -eq 0 ]; then
    echo "✓ 所有引用已成功更新！"
else
    echo "请注意以下文件可能仍包含旧引用："
    grep -r "OrasrsStakingContract\|sracontract" --include="*.go" --include="*.yml" --include="*.md" . || echo "没有找到更多旧引用"
fi