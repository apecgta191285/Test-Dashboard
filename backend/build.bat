@echo off
echo Building Backend with increased memory...
set NODE_OPTIONS=--max-old-space-size=6144
npm run build
