# 실시간 로그 확인 스크립트

Write-Host "=== 실시간 로그 확인 (종료: Ctrl+C) ===" -ForegroundColor Cyan
Write-Host ""

if (Test-Path "dev.log") {
    Get-Content "dev.log" -Wait -Tail 50
} else {
    Write-Host "dev.log 파일이 없습니다. 서버를 먼저 실행하세요." -ForegroundColor Yellow
    Write-Host "실행 명령: npm run dev:log" -ForegroundColor Yellow
}

