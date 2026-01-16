@echo off
echo ================================================
echo Starting Flashpoint Web App (Development Mode)
echo ================================================
echo.

echo Checking if Flashpoint Game Server is running...
curl -s http://localhost:22500 > nul 2>&1
if errorlevel 1 (
    echo.
    echo ✗ Flashpoint Game Server is NOT running!
    echo.
    echo Please start Flashpoint Launcher first:
    echo   1. Go to D:\Flashpoint\Launcher
    echo   2. Run Flashpoint.exe
    echo   3. Wait for it to fully start
    echo   4. Then run this script again
    echo.
    pause
    exit /b 1
) else (
    echo ✓ Game Server is running on port 22500
)

echo.
echo Starting backend server...
start "Flashpoint Backend" cmd /k "cd backend && npm run dev"

timeout /t 3 /nobreak > nul

echo Starting frontend server...
start "Flashpoint Frontend" cmd /k "cd frontend && npm run dev"

echo.
echo ================================================
echo Servers starting...
echo ================================================
echo.
echo Backend:  http://localhost:3001
echo Frontend: http://localhost:5173
echo.
echo Press Ctrl+C in each window to stop servers
echo ================================================
