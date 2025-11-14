# ================================================================
# 42ment ERP - Windows Build Script (PowerShell)
# This script packages the ERP system for Windows distribution
# ================================================================

Write-Host ""
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host "  42ment ERP - Windows Build Script" -ForegroundColor Cyan
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host ""

# Check Python
try {
    $pythonVersion = python --version 2>&1
    Write-Host "[OK] Python found: $pythonVersion" -ForegroundColor Green
} catch {
    Write-Host "[ERROR] Python is not installed or not in PATH!" -ForegroundColor Red
    Write-Host "Please install Python 3.11+ from https://www.python.org" -ForegroundColor Yellow
    pause
    exit 1
}

Write-Host ""

# Check/Install PyInstaller
Write-Host "[INFO] Checking PyInstaller..." -ForegroundColor Yellow
$pyinstallerCheck = python -m pip show pyinstaller 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "[INFO] PyInstaller not found. Installing..." -ForegroundColor Yellow
    python -m pip install pyinstaller
    if ($LASTEXITCODE -ne 0) {
        Write-Host "[ERROR] Failed to install PyInstaller!" -ForegroundColor Red
        pause
        exit 1
    }
    Write-Host "[OK] PyInstaller installed" -ForegroundColor Green
} else {
    Write-Host "[OK] PyInstaller already installed" -ForegroundColor Green
}

Write-Host ""
Write-Host "[INFO] Installing project dependencies..." -ForegroundColor Yellow
python -m pip install -r requirements.txt -q
if ($LASTEXITCODE -eq 0) {
    Write-Host "[OK] Dependencies installed" -ForegroundColor Green
} else {
    Write-Host "[WARNING] Some dependencies may have failed to install" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "[INFO] Cleaning previous build..." -ForegroundColor Yellow
if (Test-Path "dist") { Remove-Item -Recurse -Force "dist" }
if (Test-Path "build") { Remove-Item -Recurse -Force "build" }
Write-Host "[OK] Cleaned" -ForegroundColor Green

Write-Host ""
Write-Host "[INFO] Building executable with PyInstaller..." -ForegroundColor Yellow
Write-Host ""
python -m PyInstaller launcher.spec --clean --noconfirm

if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "[ERROR] Build failed!" -ForegroundColor Red
    pause
    exit 1
}

Write-Host ""
Write-Host "[OK] Build successful!" -ForegroundColor Green
Write-Host ""

# Create distribution package
Write-Host "[INFO] Creating distribution package..." -ForegroundColor Yellow

$distDir = "dist\42ment-ERP-Windows"
$buildDir = "dist\42ment-ERP"

if (Test-Path $distDir) { Remove-Item -Recurse -Force $distDir }
New-Item -ItemType Directory -Path $distDir -Force | Out-Null

# Copy build output
Write-Host "[INFO] Copying files..." -ForegroundColor Yellow
Copy-Item -Path $buildDir -Destination "$distDir\app" -Recurse -Force

# Create data folder structure
New-Item -ItemType Directory -Path "$distDir\app\data" -Force | Out-Null
New-Item -ItemType Directory -Path "$distDir\app\data\exports" -Force | Out-Null
New-Item -ItemType Directory -Path "$distDir\app\data\logs" -Force | Out-Null
New-Item -ItemType Directory -Path "$distDir\app\data\backups" -Force | Out-Null

# Copy additional files
if (Test-Path "README.md") { Copy-Item "README.md" "$distDir\" -Force }
if (Test-Path "QUICKSTART.md") { Copy-Item "QUICKSTART.md" "$distDir\" -Force }
if (Test-Path "GUI_사용법.md") { Copy-Item "GUI_사용법.md" "$distDir\" -Force }

# Create launcher script
$launcherContent = @"
@echo off
cd /d "%~dp0app"
start "" "42ment-ERP.exe"
"@
Set-Content -Path "$distDir\시작-42ment-ERP.bat" -Value $launcherContent -Encoding ASCII

# Create README for distribution
$distReadme = @"
# 42ment ERP v0.1 - Windows 배포판

프리랜서를 위한 경량 프로젝트 관리 시스템

## 설치 방법

1. 이 폴더 전체를 원하는 위치에 복사하세요
2. "시작-42ment-ERP.bat" 파일을 더블클릭하세요
3. GUI 런처가 열리면 "▶ ERP 시작" 버튼을 클릭하세요
4. 웹 브라우저가 자동으로 열립니다

## 시스템 요구사항

- Windows 10/11 (64-bit)
- 최소 4GB RAM
- 500MB 여유 공간

## 처음 사용시

1. GUI 런처에서 "데이터베이스 초기화" 클릭
2. (선택사항) "샘플 데이터 로드" 클릭하여 예제 데이터 확인
3. "▶ ERP 시작" 클릭하여 시스템 시작

## 데이터 위치

모든 데이터는 다음 위치에 저장됩니다:
- 데이터베이스: app\data\42ment.db
- 내보내기: app\data\exports\
- 로그: app\data\logs\
- 백업: app\data\backups\

## 문제 해결

### 앱이 시작되지 않는 경우
1. Windows Defender나 백신 프로그램에서 차단되었는지 확인
2. 폴더를 "신뢰할 수 있는 위치"로 추가
3. 관리자 권한으로 실행 시도

### 브라우저가 열리지 않는 경우
수동으로 다음 주소로 접속:
http://localhost:8501

### 포트 충돌 오류
다른 프로그램이 8501 포트를 사용 중일 수 있습니다.
해당 프로그램을 종료하거나, src\main.py에서 포트 변경 가능

## 지원

문서: QUICKSTART.md, GUI_사용법.md 참조
버전: v0.1
"@
Set-Content -Path "$distDir\README-설치.txt" -Value $distReadme -Encoding UTF8

Write-Host ""
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host "  Build Complete!" -ForegroundColor Green
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "배포 패키지가 생성되었습니다:" -ForegroundColor Green
Write-Host "  $distDir" -ForegroundColor Cyan
Write-Host ""
Write-Host "테스트하려면:" -ForegroundColor Yellow
Write-Host "  1. $distDir 폴더로 이동" -ForegroundColor White
Write-Host "  2. '시작-42ment-ERP.bat' 더블클릭" -ForegroundColor White
Write-Host ""
Write-Host "배포하려면:" -ForegroundColor Yellow
Write-Host "  $distDir 폴더 전체를 압축하여 배포하세요" -ForegroundColor White
Write-Host ""

# Create ZIP archive
Write-Host "[INFO] Creating ZIP archive..." -ForegroundColor Yellow
$zipFile = "dist\42ment-ERP-Windows.zip"
if (Test-Path $zipFile) { Remove-Item $zipFile -Force }

Compress-Archive -Path $distDir -DestinationPath $zipFile -CompressionLevel Optimal

if (Test-Path $zipFile) {
    $zipSize = [math]::Round((Get-Item $zipFile).Length / 1MB, 2)
    Write-Host "[OK] ZIP archive created: $zipFile ($zipSize MB)" -ForegroundColor Green
}

Write-Host ""
pause
