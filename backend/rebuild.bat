@echo off
echo ========================================
echo Rebuilding Backend with Fix
echo ========================================
echo.

echo [1/2] Building with increased memory...
call npm run build
if errorlevel 1 (
    echo ERROR: Build failed
    pause
    exit /b 1
)
echo.

echo [2/2] Build completed!
echo.
echo ========================================
echo To start backend, run: start.bat
echo ========================================
pause
