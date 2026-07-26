@echo off
title AgriLeitner Pro Local Server
cd /d "%~dp0"
echo =========================================================================
echo  AgriLeitner Pro 로컬 개발 서버 가동
echo  
echo  [안내] 구글 로그인은 보안(OAuth 2.0) 규정상 file:// 주소를 차단합니다.
echo         따라서 반드시 아래 로컬 웹 서버 주소로 접속하셔야 로그인 처리가 완료됩니다.
echo =========================================================================
echo.

:: 1. Check if python is available
where python >nul 2>nul
if %errorlevel% equ 0 (
    echo [시스템] 파이썬(Python) 내장 웹 서버를 기동합니다...
    echo [접속 주소] http://localhost:5000/leitner_app.html
    echo.
    start http://localhost:5000/leitner_app.html
    python -m http.server 5000
    goto end
)

:: 2. Check if npx/node is available
where npx >nul 2>nul
if %errorlevel% equ 0 (
    echo [시스템] Node.js http-server 패키지를 기동합니다...
    echo [접속 주소] http://localhost:5000/leitner_app.html
    echo.
    start http://localhost:5000/leitner_app.html
    npx http-server -p 5000
    goto end
)

echo [경고] 시스템에서 파이썬(Python) 또는 Node.js 환경을 감지하지 못했습니다.
echo.
echo [대안법 1] VS Code가 설치되어 있다면 'Live Server' 플러그인을 활성화하여 실행하십시오.
echo [대안법 2] 단어 학습 앱을 Vercel, Netlify 등 무료 호스팅에 업로드하여 접속하십시오.
echo.
pause

:end
