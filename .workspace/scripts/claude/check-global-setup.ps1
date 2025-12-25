# 전역 설정 확인 스크립트

Write-Host "=== Node.js 및 npm 전역 설정 확인 ===" -ForegroundColor Cyan
Write-Host ""

# Node.js 경로
$nodePath = (Get-Command node -ErrorAction SilentlyContinue).Source
if ($nodePath) {
    Write-Host "✅ Node.js: $nodePath" -ForegroundColor Green
} else {
    Write-Host "❌ Node.js를 찾을 수 없습니다." -ForegroundColor Red
}

# npm 경로
$npmPath = (Get-Command npm -ErrorAction SilentlyContinue).Source
if ($npmPath) {
    Write-Host "✅ npm: $npmPath" -ForegroundColor Green
} else {
    Write-Host "❌ npm을 찾을 수 없습니다." -ForegroundColor Red
}

# npm 전역 prefix
$npmPrefix = npm config get prefix 2>$null
if ($npmPrefix) {
    Write-Host "✅ npm 전역 prefix: $npmPrefix" -ForegroundColor Green
}

# npm 전역 모듈 경로
$npmRoot = npm root -g 2>$null
if ($npmRoot) {
    Write-Host "✅ npm 전역 모듈: $npmRoot" -ForegroundColor Green
}

# npm 전역 bin 경로 확인
$npmGlobalBin = Join-Path $npmPrefix "node_modules\.bin"
if (Test-Path $npmGlobalBin) {
    Write-Host "✅ npm 전역 bin: $npmGlobalBin" -ForegroundColor Green
} else {
    Write-Host "⚠️  npm 전역 bin 경로가 없습니다: $npmGlobalBin" -ForegroundColor Yellow
}

# PATH에 npm 전역 bin이 있는지 확인
$pathHasNpmGlobal = $env:PATH -split ';' | Where-Object { $_ -eq $npmGlobalBin -or $_ -eq $npmPrefix }
if ($pathHasNpmGlobal) {
    Write-Host "✅ npm 전역 bin이 PATH에 있습니다." -ForegroundColor Green
} else {
    Write-Host "❌ npm 전역 bin이 PATH에 없습니다!" -ForegroundColor Red
    Write-Host "   추가해야 할 경로: $npmGlobalBin" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "=== Claude Code 설정 확인 ===" -ForegroundColor Cyan
Write-Host ""

$claudePath = "C:\Users\enkei\AppData\Local\AnthropicClaude\claude.exe"
if (Test-Path $claudePath) {
    Write-Host "✅ Claude Code: $claudePath" -ForegroundColor Green
} else {
    Write-Host "❌ Claude Code를 찾을 수 없습니다." -ForegroundColor Red
}

# PATH에 Claude Code가 있는지 확인
$pathHasClaude = $env:PATH -split ';' | Where-Object { $_ -like '*AnthropicClaude*' }
if ($pathHasClaude) {
    Write-Host "✅ Claude Code가 PATH에 있습니다." -ForegroundColor Green
} else {
    Write-Host "❌ Claude Code가 PATH에 없습니다!" -ForegroundColor Red
    Write-Host "   추가해야 할 경로: C:\Users\enkei\AppData\Local\AnthropicClaude" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "=== 권장 사항 ===" -ForegroundColor Cyan
Write-Host ""

if (-not $pathHasNpmGlobal) {
    Write-Host "1. npm 전역 패키지를 사용하려면 다음 경로를 PATH에 추가하세요:" -ForegroundColor Yellow
    Write-Host "   $npmGlobalBin" -ForegroundColor White
}

if (-not $pathHasClaude) {
    Write-Host "2. Claude Code를 사용하려면 다음 경로를 PATH에 추가하세요:" -ForegroundColor Yellow
    Write-Host "   C:\Users\enkei\AppData\Local\AnthropicClaude" -ForegroundColor White
    Write-Host "   또는 PowerShell 프로필에 함수를 추가하세요." -ForegroundColor Yellow
}

