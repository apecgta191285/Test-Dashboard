@echo off
echo Starting Backend in development mode with increased memory...

set NODE_OPTIONS=--max-old-space-size=4096
npm run start:dev


