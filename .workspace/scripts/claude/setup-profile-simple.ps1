$profilePath = $PROFILE
$profileDir = Split-Path -Parent $profilePath

if (!(Test-Path $profileDir)) {
    New-Item -Path $profileDir -ItemType Directory -Force | Out-Null
}

$content = @'
# Claude Code CLI를 기본 claude로 연결 (터미널 Claude Code 실행)
function claude {
    & "C:\npm-global\claude.cmd" @args
}

# 데스크탑 Claude를 쓰고 싶으면 claude-desktop 사용
function claude-desktop {
    & "C:\Users\enkei\AppData\Local\AnthropicClaude\claude.exe" @args
}
'@

Set-Content -Path $profilePath -Value $content -Encoding UTF8

Write-Host "프로필 파일이 생성되었습니다: $profilePath" -ForegroundColor Green
Write-Host ""
Write-Host "프로필 파일 내용:" -ForegroundColor Cyan
Get-Content $profilePath

Write-Host ""
Write-Host "프로필을 로드하려면:" -ForegroundColor Yellow
Write-Host "  . `$PROFILE" -ForegroundColor White

