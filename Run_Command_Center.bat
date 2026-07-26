@echo off
title AgriLeitner Pro AI Command Center Launcher
cd /d "%~dp0"
cls
python command_center.py
if %errorlevel% neq 0 (
    echo.
    echo [시스템 오류] 파이썬을 실행하는 데 실패했습니다. 파이썬이 올바르게 설치되었는지 확인하십시오.
    pause
)
