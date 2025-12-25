# PowerShell 프로필 파일 생성

$profilePath = $PROFILE
$profileDir = Split-Path -Parent $profilePath

Write-Host "프로필 파일 경로: $profilePath" -ForegroundColor Cyan
Write-Host ""

# 프로필 디렉토리 생성
if (!(Test-Path $profileDir)) {
    New-Item -Path $profileDir -ItemType Directory -Force | Out-Null
    Write-Host "프로필 디렉토리를 생성했습니다." -ForegroundColor Green
}

# 프로필 파일 내용
$profileContent = @"
# Claude Code 함수
function claude {
    & 'C:\Users\enkei\AppData\Local\AnthropicClaude\claude.exe' `$args
}
"@

# 프로필 파일 생성 또는 업데이트
if (Test-Path $profilePath) {
    $existingContent = Get-Content $profilePath -Raw
    if ($existingContent -notmatch "function claude") {
        Add-Content -Path $profilePath -Value "`n$profileContent`n"
        Write-Host "프로필 파일에 claude 함수를 추가했습니다." -ForegroundColor Green
    } else {
        Write-Host "claude 함수가 이미 프로필에 있습니다." -ForegroundColor Yellow
    }
} else {
    Set-Content -Path $profilePath -Value $profileContent
    Write-Host "프로필 파일을 생성했습니다." -ForegroundColor Green
}

Write-Host ""
Write-Host "프로필 파일 내용:" -ForegroundColor Cyan
Get-Content $profilePath

Write-Host ""
Write-Host "=== 실행 정책 확인 ===" -ForegroundColor Cyan
$executionPolicy = Get-ExecutionPolicy -Scope CurrentUser
Write-Host "현재 사용자 실행 정책: $executionPolicy" -ForegroundColor Yellow

if ($executionPolicy -eq "Restricted") {
    Write-Host ""
    Write-Host "⚠️  실행 정책이 'Restricted'입니다. 프로필을 로드하려면 실행 정책을 변경해야 합니다." -ForegroundColor Yellow
    Write-Host "다음 명령어를 실행하세요:" -ForegroundColor Yellow
    Write-Host "  Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser" -ForegroundColor White
} else {
    Write-Host "✅ 실행 정책이 설정되어 있습니다." -ForegroundColor Green
}

Write-Host ""
Write-Host "=== 프로필 로드 테스트 ===" -ForegroundColor Cyan
Write-Host "프로필을 로드하려면 다음 명령어를 실행하세요:" -ForegroundColor Yellow
Write-Host "  . `$PROFILE" -ForegroundColor White
Write-Host ""
Write-Host "또는 PowerShell을 재시작하면 자동으로 프로필이 로드됩니다." -ForegroundColor Cyan

