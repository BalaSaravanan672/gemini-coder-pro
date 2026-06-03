#!/bin/bash
# Test autonomous analysis flow
printf 'analyze the CLI Agent project and explain\nexit\n' | \
  GEMINI_CODER_SERVER_URL="http://localhost:8787" \
  GEMINI_CODER_SERVER_TOKEN="localtoken" \
  node dist/cli.js chat --autonomous
