@echo off
echo ========================================
echo RGA Dashboard Backend - Complete Setup
echo ========================================
echo.

REM Step 1: Install dependencies
echo [1/6] Installing dependencies...
call npm install
if %errorlevel% neq 0 (
    echo ERROR: npm install failed
    pause
    exit /b 1
)
echo.

REM Step 2: Install correct Prisma version
echo [2/6] Installing Prisma 5.7.1...
call npm install prisma@5.7.1 @prisma/client@5.7.1 --save-exact
if %errorlevel% neq 0 (
    echo ERROR: Prisma installation failed
    pause
    exit /b 1
)
echo.

REM Step 3: Generate Prisma client
echo [3/6] Generating Prisma client...
call npx prisma generate
if %errorlevel% neq 0 (
    echo ERROR: Prisma generate failed
    echo.
    echo TROUBLESHOOTING:
    echo 1. Make sure .env file exists in backend folder
    echo 2. Check DATABASE_URL in .env: DATABASE_URL="file:./prisma/dev.db"
    echo 3. Try running: copy .env.example .env
    pause
    exit /b 1
)
echo.

REM Step 4: Push database schema
echo [4/6] Pushing database schema...
call npx prisma db push
if %errorlevel% neq 0 (
    echo ERROR: Database push failed
    pause
    exit /b 1
)
echo.

REM Step 5: Seed database
echo [5/6] Seeding database...
call npx ts-node prisma/seed.ts
if %errorlevel% neq 0 (
    echo WARNING: Database seed failed (might be already seeded)
    echo You can continue anyway
)
echo.

REM Step 6: Build
echo [6/6] Building backend...
set NODE_OPTIONS=--max-old-space-size=6144
call npm run build
if %errorlevel% neq 0 (
    echo ERROR: Build failed
    pause
    exit /b 1
)
echo.

echo ========================================
echo Setup completed successfully!
echo ========================================
echo.
echo Next steps:
echo 1. Run backend: start.bat
echo 2. Open http://localhost:3000/api/v1
echo.
echo Login credentials:
echo   Admin: admin@test.com / password123
echo   Client: client@test.com / password123
echo.
pause
