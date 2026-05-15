#!/bin/bash
set -Eeuo pipefail

COZE_WORKSPACE_PATH="${COZE_WORKSPACE_PATH:-$(pwd)}"
cd "${COZE_WORKSPACE_PATH}"

PORT=80

echo "Starting HTTP service on port ${PORT} for deploy..."
PORT=${PORT} node dist/server.js
