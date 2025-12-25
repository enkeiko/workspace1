# PATH 환경 변수에 필요한 경로 추가 스크립트

Write-Host "=== PATH 환경 변수 수정 ===" -ForegroundColor Cyan
Write-Host ""

# 추가할 경로들
$pathsToAdd = @(
    "C:\npm-global\node_modules\.bin",
    "C:\Users\enkei\AppData\Local\AnthropicClaude"
)

# 현재 사용자 PATH 가져오기
$currentUserPath = [Environment]::GetEnvironmentVariable("Path", "User")
$pathArray = $currentUserPath -split ';' | Where-Object { $_ -ne '' }

Write-Host "현재 사용자 PATH에 있는 경로 수: $($pathArray.Count)" -ForegroundColor Yellow
Write-Host ""

$added = @()
$alreadyExists = @()

foreach ($path in $pathsToAdd) {
    if (Test-Path $path) {
        if ($pathArray -notcontains $path) {
            $pathArray += $path
            $added += $path
            Write-Host "✅ 추가할 경로: $path" -ForegroundColor Green
        } else {
            $alreadyExists += $path
            Write-Host "ℹ️  이미 존재: $path" -ForegroundColor Cyan
        }
    } else {
        Write-Host "⚠️  경로가 존재하지 않음: $path" -ForegroundColor Yellow
    }
}

if ($added.Count -gt 0) {
    Write-Host ""
    Write-Host "PATH에 추가할 경로들:" -ForegroundColor Cyan
    $added | ForEach-Object { Write-Host "  - $_" -ForegroundColor White }
    
    Write-Host ""
    $response = Read-Host "PATH 환경 변수를 업데이트하시겠습니까? (Y/N)"
    
    if ($response -eq 'Y' -or $response -eq 'y') {
        $newPath = $pathArray -join ';'
        [Environment]::SetEnvironmentVariable("Path", $newPath, "User")
        Write-Host ""
        Write-Host "✅ PATH 환경 변수가 업데이트되었습니다!" -ForegroundColor Green
        Write-Host ""
        Write-Host "⚠️  중요: 변경 사항을 적용하려면 PowerShell을 재시작하세요." -ForegroundColor Yellow
        Write-Host "   또는 다음 명령어로 현재 세션의 PATH를 업데이트할 수 있습니다:" -ForegroundColor Yellow
        Write-Host "   `$env:PATH = [Environment]::GetEnvironmentVariable('Path', 'User') + ';' + [Environment]::GetEnvironmentVariable('Path', 'Machine')" -ForegroundColor White
    } else {
        Write-Host ""
        Write-Host "취소되었습니다." -ForegroundColor Yellow
    }
} else {
    Write-Host ""
    Write-Host "추가할 경로가 없습니다. 모든 경로가 이미 PATH에 있습니다." -ForegroundColor Green
}

Write-Host ""
Write-Host "=== 현재 세션 PATH 업데이트 ===" -ForegroundColor Cyan
Write-Host "현재 세션의 PATH를 업데이트하시겠습니까? (Y/N)" -ForegroundColor Yellow
$sessionResponse = Read-Host

if ($sessionResponse -eq 'Y' -or $sessionResponse -eq 'y') {
    $userPath = [Environment]::GetEnvironmentVariable("Path", "User")
    $machinePath = [Environment]::GetEnvironmentVariable("Path", "Machine")
    $env:PATH = "$userPath;$machinePath"
    Write-Host ""
    Write-Host "✅ 현재 세션의 PATH가 업데이트되었습니다!" -ForegroundColor Green
    Write-Host ""
    Write-Host "테스트:" -ForegroundColor Cyan
    Write-Host "  claude --version" -ForegroundColor White
}

