@echo off
echo Starting Backend in production mode...
set NODE_OPTIONS=--max-old-space-size=4096
node dist/src/main
