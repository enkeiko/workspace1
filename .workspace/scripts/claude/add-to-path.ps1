# PATH에 npm 전역 bin 경로와 Claude Code 경로 추가

Write-Host "=== PATH 환경 변수에 경로 추가 ===" -ForegroundColor Cyan
Write-Host ""

$pathsToAdd = @(
    "C:\npm-global",
    "C:\Users\enkei\AppData\Local\AnthropicClaude"
)

# 현재 사용자 PATH 가져오기
$currentUserPath = [Environment]::GetEnvironmentVariable("Path", "User")
if ($currentUserPath) {
    $pathArray = $currentUserPath -split ';' | Where-Object { $_ -ne '' }
} else {
    $pathArray = @()
}

$newPaths = @()
foreach ($path in $pathsToAdd) {
    if (Test-Path $path) {
        if ($pathArray -notcontains $path) {
            $pathArray += $path
            $newPaths += $path
            Write-Host "✅ 추가: $path" -ForegroundColor Green
        } else {
            Write-Host "ℹ️  이미 존재: $path" -ForegroundColor Cyan
        }
    } else {
        Write-Host "⚠️  경로 없음: $path" -ForegroundColor Yellow
    }
}

if ($newPaths.Count -gt 0) {
    $newPath = $pathArray -join ';'
    [Environment]::SetEnvironmentVariable("Path", $newPath, "User")
    Write-Host ""
    Write-Host "✅ PATH 환경 변수가 업데이트되었습니다!" -ForegroundColor Green
    Write-Host ""
    Write-Host "⚠️  PowerShell을 재시작하거나 다음 명령어를 실행하세요:" -ForegroundColor Yellow
    Write-Host "   `$env:PATH = [Environment]::GetEnvironmentVariable('Path', 'User') + ';' + [Environment]::GetEnvironmentVariable('Path', 'Machine')" -ForegroundColor White
} else {
    Write-Host ""
    Write-Host "추가할 경로가 없습니다." -ForegroundColor Green
}

# 현재 세션에도 적용
$userPath = [Environment]::GetEnvironmentVariable("Path", "User")
$machinePath = [Environment]::GetEnvironmentVariable("Path", "Machine")
$env:PATH = "$userPath;$machinePath"

Write-Host ""
Write-Host "✅ 현재 세션의 PATH도 업데이트되었습니다!" -ForegroundColor Green
Write-Host ""
Write-Host "테스트: claude --version" -ForegroundColor Cyan

