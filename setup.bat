@echo off
echo ================================================
echo Flashpoint Web App - Setup Script
echo ================================================
echo.
echo No Visual Studio or build tools required!
echo Pure JavaScript dependencies only.
echo.

echo [1/4] Setting up backend...
cd backend
if not exist node_modules (
    echo Installing backend dependencies...
    call npm install
) else (
    echo Backend dependencies already installed
)

if not exist .env (
    echo Creating .env file...
    copy .env.example .env
    echo Please edit backend\.env if your Flashpoint path is different
) else (
    echo .env file already exists
)

cd ..
echo.

echo [2/4] Setting up frontend...
cd frontend
if not exist node_modules (
    echo Installing frontend dependencies...
    call npm install
) else (
    echo Frontend dependencies already installed
)

cd ..
echo.

echo [3/4] Verifying Flashpoint installation...
if exist "D:\Flashpoint\Data\flashpoint.sqlite" (
    echo ✓ Flashpoint database found
) else (
    echo ✗ Flashpoint database not found at D:\Flashpoint\Data\flashpoint.sqlite
    echo   Please update FLASHPOINT_PATH in backend\.env
)

echo.
echo [4/4] Setup complete!
echo.
echo ================================================
echo Next Steps:
echo ================================================
echo 1. Start Flashpoint Launcher (to run Game Server)
echo 2. Run: start-dev.bat
echo 3. Open browser: http://localhost:5173
echo.
echo For detailed instructions, see QUICK_START.md
echo ================================================
pause
