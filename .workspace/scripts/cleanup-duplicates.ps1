# Workspace Cleanup Script
# 워크스페이스 중복 파일 정리 스크립트

$workspace = "C:\Users\Nk Ko\Documents\workspace"
$timestamp = Get-Date -Format "yyyy-MM-ddTHH-mm-ss"
$backupPath = "$workspace\9-archive\cleanup-$timestamp"

Write-Host "=== 워크스페이스 중복 파일 정리 시작 ===" -ForegroundColor Green
Write-Host "백업 위치: $backupPath" -ForegroundColor Cyan

# 백업 디렉토리 생성
New-Item -ItemType Directory -Path $backupPath -Force | Out-Null

# 1. place-keywords-maker-v2 copy 폴더 백업 후 삭제
if (Test-Path "$workspace\2-projects\place-keywords-maker-v2 copy") {
    Write-Host "`n[1/4] place-keywords-maker-v2 copy 폴더 처리 중..." -ForegroundColor Yellow
    Move-Item "$workspace\2-projects\place-keywords-maker-v2 copy" "$backupPath\place-keywords-maker-v2-copy" -Force
    Write-Host "  ✓ 백업 및 삭제 완료 (~64MB)" -ForegroundColor Green
} else {
    Write-Host "`n[1/4] place-keywords-maker-v2 copy 폴더 없음 - 스킵" -ForegroundColor Gray
}

# 2. TEST_ADD.txt 삭제
if (Test-Path "$workspace\TEST_ADD.txt") {
    Write-Host "`n[2/4] TEST_ADD.txt 삭제 중..." -ForegroundColor Yellow
    Remove-Item "$workspace\TEST_ADD.txt" -Force
    Write-Host "  ✓ 삭제 완료" -ForegroundColor Green
} else {
    Write-Host "`n[2/4] TEST_ADD.txt 없음 - 스킵" -ForegroundColor Gray
}

# 3. 9-archive 내 node_modules 정리
Write-Host "`n[3/4] 9-archive 내 node_modules 정리 중..." -ForegroundColor Yellow
$archiveNodeModules = Get-ChildItem "$workspace\9-archive" -Recurse -Directory -Filter "node_modules" -ErrorAction SilentlyContinue
$nodeModulesCount = ($archiveNodeModules | Measure-Object).Count
if ($nodeModulesCount -gt 0) {
    foreach ($dir in $archiveNodeModules) {
        Remove-Item $dir.FullName -Recurse -Force -ErrorAction SilentlyContinue
    }
    Write-Host "  ✓ $nodeModulesCount 개 node_modules 폴더 삭제 완료" -ForegroundColor Green
} else {
    Write-Host "  ✓ 정리할 node_modules 없음" -ForegroundColor Gray
}

# 4. 빈 폴더 정리
Write-Host "`n[4/4] 빈 폴더 정리 중..." -ForegroundColor Yellow
$emptyDirs = Get-ChildItem "$workspace\2-projects\place-crawler" -Recurse -Directory |
    Where-Object { (Get-ChildItem $_.FullName -Force | Measure-Object).Count -eq 0 } |
    Select-Object -ExpandProperty FullName
$emptyDirCount = ($emptyDirs | Measure-Object).Count
if ($emptyDirCount -gt 0) {
    foreach ($dir in $emptyDirs) {
        Remove-Item $dir -Force -ErrorAction SilentlyContinue
    }
    Write-Host "  ✓ $emptyDirCount 개 빈 폴더 삭제 완료" -ForegroundColor Green
} else {
    Write-Host "  ✓ 정리할 빈 폴더 없음" -ForegroundColor Gray
}

Write-Host "`n=== 정리 완료 ===" -ForegroundColor Green
Write-Host "백업 위치: $backupPath" -ForegroundColor Cyan
