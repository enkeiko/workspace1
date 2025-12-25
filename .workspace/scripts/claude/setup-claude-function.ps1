# Claude Code 함수를 PowerShell 프로필에 추가하는 스크립트

$claudeCliCmd = "C:\npm-global\claude.cmd"
$profilePath = $PROFILE

# 프로필 디렉토리 확인 및 생성
$profileDir = Split-Path -Parent $profilePath
if (!(Test-Path $profileDir)) {
    New-Item -Path $profileDir -ItemType Directory -Force | Out-Null
}

# 함수 정의
$functionDefinition = @"
function claude {
    & '$claudeCliCmd' @args
}
"@

# 프로필 파일에 추가
if (Test-Path $profilePath) {
    $content = Get-Content $profilePath -Raw
    if ($content -notmatch "function claude") {
        Add-Content -Path $profilePath -Value "`n$functionDefinition`n"
        Write-Host "프로필에 claude 함수를 추가했습니다." -ForegroundColor Green
    } else {
        Write-Host "claude 함수가 이미 프로필에 있습니다." -ForegroundColor Yellow
    }
} else {
    Set-Content -Path $profilePath -Value $functionDefinition
    Write-Host "프로필 파일을 생성하고 claude 함수를 추가했습니다." -ForegroundColor Green
}

# 현재 세션에도 함수 추가
Invoke-Expression $functionDefinition

Write-Host "`n프로필 파일: $profilePath" -ForegroundColor Cyan
Write-Host "현재 세션과 다음 PowerShell 세션부터 'claude' 명령어를 사용할 수 있습니다." -ForegroundColor Green

