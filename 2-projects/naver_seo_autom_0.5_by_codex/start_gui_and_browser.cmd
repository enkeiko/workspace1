@echo off
setlocal
REM GUI 서버 및 브라우저 자동 실행 스크립트
REM 파일 기반 실행으로 보안 솔루션의 fileless 차단을 회피합니다.

set HOST=127.0.0.1
set PORT=3060

REM 현재 스크립트 디렉터리로 이동
cd /d %~dp0

REM 새 콘솔 창에서 서버 실행
start "NaverSEO GUI Server" cmd /c "node src\gui\server.js"

REM 잠시 대기 후 기본 브라우저로 열기
timeout /t 2 >nul
start "" http://127.0.0.1:%PORT%/

echo GUI 서버를 http://127.0.0.1:%PORT% 에서 실행했습니다.
echo 이 창은 닫아도 무방합니다.
pause

