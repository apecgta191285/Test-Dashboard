@echo off
echo ========================================
echo RGA Dashboard Backend - Setup
echo ========================================
echo.

echo [1/6] Installing dependencies...
call npm install
if errorlevel 1 (
    echo ERROR: npm install failed
    pause
    exit /b 1
)
echo.

echo [2/6] Installing Prisma 5.7.1...
call npm install prisma@5.7.1 @prisma/client@5.7.1 --save-exact
if errorlevel 1 (
    echo ERROR: Prisma installation failed
    pause
    exit /b 1
)
echo.

echo [3/6] Generating Prisma client...
call npx prisma generate
if errorlevel 1 (
    echo ERROR: Prisma generate failed
    pause
    exit /b 1
)
echo.

echo [4/6] Pushing database schema...
set DATABASE_URL=file:./prisma/dev.db
call npx prisma db push
if errorlevel 1 (
    echo ERROR: Database push failed
    pause
    exit /b 1
)
echo.

echo [5/6] Seeding database...
call npx ts-node prisma/seed.ts
if errorlevel 1 (
    echo WARNING: Database seed failed (might be already seeded)
)
echo.

echo [6/6] Building backend...
set NODE_OPTIONS=--max-old-space-size=6144
call npm run build
if errorlevel 1 (
    echo ERROR: Build failed
    pause
    exit /b 1
)
echo.

echo ========================================
echo Setup completed successfully!
echo ========================================
echo.
echo To start the backend, run: start.bat
echo.
pause
