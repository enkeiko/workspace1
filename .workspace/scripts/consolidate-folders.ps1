# Folder Consolidation Script
# 폴더 구조 통합 스크립트

$workspace = "C:\Users\Nk Ko\Documents\workspace"
$timestamp = Get-Date -Format "yyyy-MM-ddTHH-mm-ss"

Write-Host "=== 폴더 구조 통합 시작 ===" -ForegroundColor Green

# 1. specs/002-42ment-erp → 1-planning/specs/
if (Test-Path "$workspace\specs\002-42ment-erp") {
    Write-Host "`n[1/4] specs/002-42ment-erp → 1-planning/specs/ 이동 중..." -ForegroundColor Yellow
    Move-Item "$workspace\specs\002-42ment-erp" "$workspace\1-planning\specs\" -Force
    Write-Host "  ✓ 이동 완료" -ForegroundColor Green

    # specs 폴더가 비었으면 삭제
    $specsEmpty = (Get-ChildItem "$workspace\specs" -Force | Measure-Object).Count -eq 0
    if ($specsEmpty) {
        Remove-Item "$workspace\specs" -Force
        Write-Host "  ✓ 빈 specs 폴더 삭제" -ForegroundColor Green
    }
} else {
    Write-Host "`n[1/4] specs/002-42ment-erp 없음 - 스킵" -ForegroundColor Gray
}

# 2. src/ → 9-archive/ (V1 파일들)
if (Test-Path "$workspace\src") {
    Write-Host "`n[2/4] src/ → 9-archive/old-src-$timestamp 이동 중..." -ForegroundColor Yellow
    Move-Item "$workspace\src" "$workspace\9-archive\old-src-$timestamp" -Force
    Write-Host "  ✓ 이동 완료" -ForegroundColor Green
} else {
    Write-Host "`n[2/4] src/ 없음 - 스킵" -ForegroundColor Gray
}

# 3. docs/ 내용을 0-workspace/docs/ops/로 통합
if (Test-Path "$workspace\docs") {
    Write-Host "`n[3/4] docs/ 내용 통합 중..." -ForegroundColor Yellow

    # docs/ops는 이미 존재하므로 유지
    # 다른 파일들 백업
    $docsFiles = Get-ChildItem "$workspace\docs" -File
    if (($docsFiles | Measure-Object).Count -gt 0) {
        New-Item -ItemType Directory -Path "$workspace\9-archive\old-docs-$timestamp" -Force | Out-Null
        foreach ($file in $docsFiles) {
            Move-Item $file.FullName "$workspace\9-archive\old-docs-$timestamp\" -Force
        }
        Write-Host "  ✓ docs 루트 파일 백업 완료" -ForegroundColor Green
    }

    # docs/ 하위 폴더 확인 (ops 제외)
    $docsSubdirs = Get-ChildItem "$workspace\docs" -Directory | Where-Object { $_.Name -ne 'ops' }
    if (($docsSubdirs | Measure-Object).Count -gt 0) {
        foreach ($dir in $docsSubdirs) {
            Move-Item $dir.FullName "$workspace\9-archive\old-docs-$timestamp\" -Force
        }
        Write-Host "  ✓ docs 하위 폴더 백업 완료" -ForegroundColor Green
    }
} else {
    Write-Host "`n[3/4] docs/ 없음 - 스킵" -ForegroundColor Gray
}

# 4. scripts/ → 0-workspace/scripts/
if (Test-Path "$workspace\scripts") {
    Write-Host "`n[4/4] scripts/ → 0-workspace/scripts/ 이동 중..." -ForegroundColor Yellow

    # 0-workspace/scripts가 없으면 생성
    if (-not (Test-Path "$workspace\0-workspace\scripts")) {
        New-Item -ItemType Directory -Path "$workspace\0-workspace\scripts" -Force | Out-Null
    }

    # scripts 내용 이동
    Get-ChildItem "$workspace\scripts" -Recurse | Move-Item -Destination "$workspace\0-workspace\scripts\" -Force
    Remove-Item "$workspace\scripts" -Force
    Write-Host "  ✓ 이동 완료" -ForegroundColor Green
} else {
    Write-Host "`n[4/4] scripts/ 없음 - 스킵" -ForegroundColor Gray
}

Write-Host "`n=== 폴더 구조 통합 완료 ===" -ForegroundColor Green
Write-Host "최종 구조:" -ForegroundColor Cyan
Write-Host "  0-workspace/ - 공유 리소스" -ForegroundColor White
Write-Host "  1-planning/  - 기획 및 스펙" -ForegroundColor White
Write-Host "  2-projects/  - 활성 프로젝트" -ForegroundColor White
Write-Host "  9-archive/   - 과거 버전 및 백업" -ForegroundColor White
Write-Host "  docs/ops/    - 운영 문서" -ForegroundColor White
