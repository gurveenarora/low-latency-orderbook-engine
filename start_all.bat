@echo off
echo ====================================================================
echo APEX-QUANT: Microsecond Order Matching & Risk Platform Launcher
echo ====================================================================

if not exist cpp_engine\matching_engine.dll (
    echo Compiling C++20 Engine DLL...
    call cpp_engine\build.bat
)

echo Starting FastAPI Backend (Port 8000)...
start "FastAPI Backend (C++ Engine)" cmd /k "cd /d %~dp0backend && python -m uvicorn main:app --host 0.0.0.0 --port 8000"

echo Starting Next.js Trading Terminal (Port 3000)...
start "Next.js Trading Terminal" cmd /k "cd /d %~dp0frontend && npm run dev"

echo Exposing Public Tunnel Endpoint...
start "Public Internet Tunnel" cmd /k "npx localtunnel --port 3000"

echo ====================================================================
echo System Running!
echo Local Network Access: http://localhost:3000
echo Public Internet Tunnel window opening...
echo ====================================================================
