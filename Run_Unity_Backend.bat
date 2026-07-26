@echo off
:: Set CMD active page code to UTF-8 to prevent garbled characters
chcp 65001 >nul
title AgriLeitner Unity Agent Backend Server
cd /d "%~dp0"
cls
node unity_server.js
if %errorlevel% neq 0 (
    echo.
    echo ❌ [오류] Unity API 서버 실행에 실패했습니다. Node.js가 정상 작동 중인지 확인하십시오.
    pause
)
