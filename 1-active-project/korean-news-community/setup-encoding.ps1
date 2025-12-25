# PowerShell 콘솔 UTF-8 인코딩 설정 스크립트
# 실행: .\setup-encoding.ps1

Write-Host "=== 콘솔 인코딩 설정 ===" -ForegroundColor Cyan

# 콘솔 출력 인코딩을 UTF-8로 설정
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
[Console]::InputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8

# 코드 페이지를 UTF-8 (65001)로 변경
chcp 65001 | Out-Null

Write-Host "✅ UTF-8 인코딩 설정 완료" -ForegroundColor Green
Write-Host ""
Write-Host "이제 npm run dev 또는 npm run collect를 실행하세요." -ForegroundColor Yellow



