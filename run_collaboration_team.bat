@echo off
title AgriLeitner Pro AI Team Orchestrator Launcher
cd /d "%~dp0"
echo ==========================================================
echo  AgriLeitner Pro AI 협업 에이전트 팀 가동
echo ==========================================================
echo.

:: Check if python is available
where python >nul 2>nul
if %errorlevel% equ 0 (
    python run_collaboration.py
    goto end
)

:: If python is not available, try to launch the two CMDs directly from batch
echo [안내] 시스템에 Python이 설치되어 있지 않습니다.
echo        따라서 배치파일 명령어로 즉시 두 개의 에이전트를 가동합니다.
echo.

set TITLE_ALPHA=AgriLeitner - Agent Alpha (Frontend)
set TITLE_BETA=AgriLeitner - Agent Beta (Backend)

echo -> 1번 에이전트 Alpha(프론트엔드) 가동...
start cmd.exe /k "title %TITLE_ALPHA% && gemini"
timeout /t 1 >nul

echo -> 2번 에이전트 Beta(백엔드) 가동...
start cmd.exe /k "title %TITLE_BETA% && gemini"

echo [성공] 두 개의 에이전트 터미널 창이 가동되었습니다!
echo        화면 좌/우로 배치하신 후 각 창에서 Alpha(프론트엔드), Beta(백엔드) 역할을 지정해 주세요.
echo.
pause

:end
