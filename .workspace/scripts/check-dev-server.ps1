# 개발 서버 상태 확인 스크립트

Write-Host "=== 개발 서버 상태 확인 ===" -ForegroundColor Cyan

# 포트 3001 사용 중인지 확인
$port3001 = netstat -ano | findstr :3001
if ($port3001) {
    Write-Host "✅ 포트 3001에서 서버가 실행 중입니다." -ForegroundColor Green
    Write-Host $port3001
} else {
    Write-Host "❌ 포트 3001에서 서버가 실행되지 않습니다." -ForegroundColor Red
}

# 로그 파일 확인
if (Test-Path "dev.log") {
    Write-Host "`n=== 최근 로그 (마지막 20줄) ===" -ForegroundColor Cyan
    Get-Content "dev.log" -Tail 20
} else {
    Write-Host "`n⚠️ dev.log 파일이 없습니다." -ForegroundColor Yellow
}

# Node 프로세스 확인
Write-Host "`n=== Node 프로세스 ===" -ForegroundColor Cyan
Get-Process | Where-Object {$_.ProcessName -like "*node*"} | Select-Object Id, ProcessName, StartTime | Format-Table

Write-Host "`n=== 완료 ===" -ForegroundColor Cyan

