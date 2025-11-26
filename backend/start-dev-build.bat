@echo off
echo Building and starting Backend in development mode...
set DATABASE_URL=file:./prisma/dev.db
set NODE_OPTIONS=--max-old-space-size=4096

echo Building...
call npm run build

if %ERRORLEVEL% NEQ 0 (
    echo Build failed!
    pause
    exit /b %ERRORLEVEL%
)

echo Starting server...
node dist/src/main.js


