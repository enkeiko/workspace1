# PowerShell 프로필 실행 정책 수정 스크립트

Write-Host "=== PowerShell 실행 정책 설정 ===" -ForegroundColor Cyan
Write-Host ""

# 현재 실행 정책 확인
$currentPolicy = Get-ExecutionPolicy -Scope CurrentUser
Write-Host "현재 사용자 실행 정책: $currentPolicy" -ForegroundColor Yellow

# RemoteSigned로 변경 (로컬 스크립트는 서명 없이 실행 가능)
try {
    Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser -Force
    Write-Host ""
    Write-Host "✅ 실행 정책이 'RemoteSigned'로 변경되었습니다." -ForegroundColor Green
    Write-Host ""
    Write-Host "변경된 실행 정책:" -ForegroundColor Cyan
    Get-ExecutionPolicy -List | Format-Table
} catch {
    Write-Host ""
    Write-Host "❌ 실행 정책 변경 실패: $_" -ForegroundColor Red
}

Write-Host ""
Write-Host "=== 프로필 파일 확인 ===" -ForegroundColor Cyan
Write-Host ""

$profilePath = $PROFILE
Write-Host "프로필 파일 경로: $profilePath" -ForegroundColor Yellow

if (Test-Path $profilePath) {
    Write-Host "✅ 프로필 파일이 존재합니다." -ForegroundColor Green
    Write-Host ""
    Write-Host "프로필 파일 내용:" -ForegroundColor Cyan
    Get-Content $profilePath
} else {
    Write-Host "⚠️  프로필 파일이 없습니다. 생성하시겠습니까?" -ForegroundColor Yellow
    Write-Host ""
    
    # 프로필 디렉토리 확인
    $profileDir = Split-Path -Parent $profilePath
    if (!(Test-Path $profileDir)) {
        New-Item -Path $profileDir -ItemType Directory -Force | Out-Null
        Write-Host "프로필 디렉토리를 생성했습니다: $profileDir" -ForegroundColor Green
    }
    
    # 기본 프로필 파일 생성
    $profileContent = @"
# Claude Code 함수
function claude {
    & 'C:\Users\enkei\AppData\Local\AnthropicClaude\claude.exe' `$args
}
"@
    
    Set-Content -Path $profilePath -Value $profileContent
    Write-Host "✅ 프로필 파일을 생성했습니다." -ForegroundColor Green
    Write-Host ""
    Write-Host "프로필 파일 내용:" -ForegroundColor Cyan
    Get-Content $profilePath
}

Write-Host ""
Write-Host "=== 테스트 ===" -ForegroundColor Cyan
Write-Host "프로필을 로드하려면 다음 명령어를 실행하세요:" -ForegroundColor Yellow
Write-Host "  . `$PROFILE" -ForegroundColor White
Write-Host ""
Write-Host "또는 PowerShell을 재시작하면 자동으로 프로필이 로드됩니다." -ForegroundColor Cyan

