#!/bin/bash
# verify-task6.sh

# Start the app, send a command, then 'y' to the diff, then 'exit'
(
  sleep 5
  echo "add a comment at the top of src/cli.ts saying '// This is a comment'"
  sleep 15
  echo "y"
  sleep 5
  echo "exit"
) | npx tsx src/cli.ts
