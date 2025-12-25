# 개발 서버 실행 스크립트 (한글 인코딩 설정 포함)
# 실행: .\run-dev.ps1

Write-Host "=== 개발 서버 시작 (UTF-8 인코딩) ===" -ForegroundColor Cyan

# 콘솔 인코딩을 UTF-8로 설정
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
[Console]::InputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8

# 코드 페이지를 UTF-8로 변경
chcp 65001 | Out-Null

Write-Host "✅ UTF-8 인코딩 설정 완료`n" -ForegroundColor Green

# 개발 서버 실행
npm run dev



