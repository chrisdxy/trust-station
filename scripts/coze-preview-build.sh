#!/usr/bin/env bash
set -euo pipefail

# 基于脚本位置定位项目根目录
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$SCRIPT_DIR"
cd "$PROJECT_DIR"

# 显式声明关键环境变量
export PORT=5000

echo "Installing dependencies for preview..."
pnpm install --prefer-frozen-lockfile --prefer-offline
