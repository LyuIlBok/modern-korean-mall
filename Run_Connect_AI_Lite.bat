@echo off
:: Set CMD active page code to UTF-8 to prevent garbled Korean characters
chcp 65001 >nul
title Connect AI Lite - Launcher
cd /d "%~dp0"
cls
node connect_ai_lite.js
if %errorlevel% neq 0 (
    echo.
    echo ❌ [오류] Node.js 실행에 실패했습니다.
    echo         Node.js가 컴퓨터에 정상적으로 설치되었는지 확인해 주십시오.
    echo.
    pause
)
