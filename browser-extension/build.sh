#!/bin/bash

# OraSRS Browser Extension Build Script
# 打包瀏覽器擴展

echo "🚀 開始構建 OraSRS 瀏覽器擴展..."

# 檢查必要文件
REQUIRED_FILES=(
  "manifest.json"
  "background.js"
  "popup.html"
  "popup.js"
  "src/content.js"
)

for file in "${REQUIRED_FILES[@]}"; do
  if [[ ! -f "$file" ]]; then
    echo "❌ 錯誤: 缺少必要文件 $file"
    exit 1
  fi
done

echo "✅ 所有必要文件存在"

# 創建構建目錄
BUILD_DIR="build"
mkdir -p "$BUILD_DIR"

# 構建擴展包
EXTENSION_FILE="orasrs-security-extension-$(date +%Y%m%d-%H%M%S).zip"

# 使用 zip 命令創建擴展包
zip -r "$BUILD_DIR/$EXTENSION_FILE" \
  manifest.json \
  background.js \
  popup.html \
  popup.js \
  src/ \
  icons/ \
  README.md \
  -x "*/\.*" \
  -x "\.*"

if [[ $? -eq 0 ]]; then
  echo "✅ 瀏覽器擴展構建成功!"
  echo "📁 檔案位置: $BUILD_DIR/$EXTENSION_FILE"
  echo "📊 檔案大小: $(du -h "$BUILD_DIR/$EXTENSION_FILE" | cut -f1)"
  
  # 顯示構建統計
  echo ""
  echo "📈 構建統計:"
  echo "   - 文件數量: $(zip -l "$BUILD_DIR/$EXTENSION_FILE" | tail -1 | awk '{print $1}')"
  echo "   - 原始大小: $(du -sb | grep -o '[0-9]*' | head -1) bytes"
  echo "   - 壓縮後大小: $(du -sb "$BUILD_DIR/$EXTENSION_FILE" | grep -o '[0-9]*' | head -1) bytes"
else
  echo "❌ 構建失敗"
  exit 1
fi

echo ""
echo "🎯 擴展構建完成!"
echo "💡 提示: 可以將 $EXTENSION_FILE 文件加載到瀏覽器中進行測試"
