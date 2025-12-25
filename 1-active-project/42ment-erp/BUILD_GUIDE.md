# 42ment ERP - Windows 빌드 가이드

이 가이드는 42ment ERP를 Windows 실행 파일(.exe)로 패키징하는 방법을 설명합니다.

## 사전 요구사항

### 필수 소프트웨어

1. **Python 3.11 이상**
   - [python.org](https://www.python.org/downloads/)에서 다운로드
   - 설치 시 "Add Python to PATH" 옵션 선택 필수

2. **PyInstaller**
   - 빌드 스크립트가 자동으로 설치합니다
   - 또는 수동 설치: `pip install pyinstaller`

### 시스템 요구사항

- Windows 10/11 (64-bit)
- 최소 4GB RAM
- 2GB 여유 디스크 공간 (빌드 과정용)

## 빌드 방법

### 방법 1: 배치 파일 사용 (권장)

가장 간단한 방법입니다:

1. `build-windows.bat` 파일을 더블클릭
2. 스크립트가 자동으로:
   - PyInstaller 설치 확인/설치
   - 의존성 설치
   - 실행 파일 빌드
   - 배포 패키지 생성

```bash
# 또는 명령 프롬프트에서:
build-windows.bat
```

### 방법 2: PowerShell 스크립트 사용

더 상세한 출력과 ZIP 아카이브 자동 생성:

1. PowerShell을 관리자 권한으로 실행
2. 프로젝트 폴더로 이동
3. 실행 정책 설정 (최초 1회):
   ```powershell
   Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
   ```
4. 빌드 스크립트 실행:
   ```powershell
   .\build-windows.ps1
   ```

### 방법 3: 수동 빌드

세밀한 제어가 필요한 경우:

```bash
# 1. 의존성 설치
pip install -r requirements.txt
pip install pyinstaller

# 2. 이전 빌드 정리
rmdir /s /q dist
rmdir /s /q build

# 3. PyInstaller 실행
pyinstaller launcher.spec --clean --noconfirm

# 4. 배포 패키지 수동 구성
# dist\42ment-ERP 폴더 확인
```

## 빌드 결과

빌드가 완료되면 다음 구조로 생성됩니다:

```
dist/
├── 42ment-ERP/                    # PyInstaller 빌드 출력
│   ├── 42ment-ERP.exe            # 메인 실행 파일
│   ├── src/                       # 소스 코드
│   ├── config/                    # 설정 파일
│   └── _internal/                 # 의존성 파일들
│
└── 42ment-ERP-Windows/            # 배포용 패키지
    ├── app/                       # 실행 파일 및 리소스
    │   ├── 42ment-ERP.exe
    │   ├── src/
    │   ├── config/
    │   ├── data/                  # 데이터 폴더
    │   │   ├── exports/
    │   │   ├── logs/
    │   │   └── backups/
    │   └── _internal/
    ├── 시작-42ment-ERP.bat        # 간편 실행 스크립트
    ├── README-설치.txt             # 설치 가이드
    ├── README.md
    ├── QUICKSTART.md
    └── GUI_사용법.md
```

### ZIP 아카이브 (PowerShell 빌드 시)

```
dist/
└── 42ment-ERP-Windows.zip        # 배포용 압축 파일
```

## 빌드 후 테스트

### 로컬 테스트

1. `dist\42ment-ERP-Windows` 폴더로 이동
2. `시작-42ment-ERP.bat` 더블클릭
3. GUI 런처가 나타나는지 확인
4. "▶ ERP 시작" 버튼 클릭
5. 브라우저에서 http://localhost:8501 열림 확인

### 다른 PC에서 테스트

1. `42ment-ERP-Windows` 폴더를 USB나 네트워크로 복사
2. Python 미설치 PC에서 테스트
3. 모든 기능이 정상 작동하는지 확인

## 배포

### ZIP 배포 (권장)

```powershell
# PowerShell 스크립트가 자동으로 생성
# 또는 수동으로:
Compress-Archive -Path "dist\42ment-ERP-Windows" -DestinationPath "42ment-ERP-v0.1-Windows.zip"
```

### 사용자 설치 가이드

배포 패키지에 포함된 `README-설치.txt` 참조:

1. ZIP 압축 해제
2. 원하는 위치에 폴더 배치
3. `시작-42ment-ERP.bat` 실행
4. 처음 실행 시 데이터베이스 초기화

## 문제 해결

### PyInstaller 오류

**오류**: `ModuleNotFoundError: No module named 'XXX'`

**해결**:
```python
# launcher.spec 파일의 hiddenimports에 추가
hiddenimports=[
    'streamlit',
    'pandas',
    'XXX',  # 누락된 모듈 추가
],
```

### 실행 파일이 크기가 큰 경우

**원인**: PyInstaller가 모든 의존성을 포함

**해결**:
- 정상입니다 (일반적으로 200-500MB)
- UPX 압축 사용 (이미 활성화됨)
- 필요시 불필요한 의존성 제거

### Windows Defender 경고

**원인**: 서명되지 않은 실행 파일

**해결**:
1. 사용자에게 "추가 정보" → "실행" 클릭 안내
2. 조직의 경우: 코드 서명 인증서 구매하여 서명
   ```bash
   signtool sign /f certificate.pfx /p password 42ment-ERP.exe
   ```

### 빌드 속도 개선

```bash
# 캐시 사용하여 빌드
pyinstaller launcher.spec --noconfirm

# clean 옵션 제거 (디버깅 시)
pyinstaller launcher.spec --noconfirm
```

## 고급 설정

### 아이콘 추가

1. .ico 파일 준비 (256x256 권장)
2. `launcher.spec` 수정:
   ```python
   exe = EXE(
       ...
       icon='path/to/icon.ico',
   )
   ```

### 버전 정보 추가

```bash
# version.txt 파일 생성
pyi-grab_version notepad.exe

# launcher.spec 수정
exe = EXE(
    ...
    version='version.txt',
)
```

### 원파일 실행 파일 (대안)

`launcher.spec` 수정하여 단일 파일로 빌드:

```python
exe = EXE(
    pyz,
    a.scripts,
    a.binaries,
    a.zipfiles,
    a.datas,
    [],
    name='42ment-ERP',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    upx_exclude=[],
    runtime_tmpdir=None,
    console=False,
    onefile=True,  # 단일 파일로 빌드
)
```

**주의**: 단일 파일 빌드는 시작이 느릴 수 있습니다.

## CI/CD 통합

### GitHub Actions 예시

```yaml
name: Build Windows EXE

on:
  push:
    tags:
      - 'v*'

jobs:
  build:
    runs-on: windows-latest
    steps:
      - uses: actions/checkout@v3

      - name: Set up Python
        uses: actions/setup-python@v4
        with:
          python-version: '3.11'

      - name: Install dependencies
        run: |
          python -m pip install --upgrade pip
          pip install -r requirements.txt
          pip install pyinstaller

      - name: Build with PyInstaller
        run: pyinstaller launcher.spec --clean --noconfirm

      - name: Create distribution
        run: .\build-windows.ps1

      - name: Upload artifact
        uses: actions/upload-artifact@v3
        with:
          name: 42ment-ERP-Windows
          path: dist/42ment-ERP-Windows.zip
```

## 체크리스트

빌드 전:
- [ ] Python 3.11+ 설치 확인
- [ ] requirements.txt 최신 상태 확인
- [ ] 모든 소스 코드 커밋 완료

빌드 후:
- [ ] 로컬에서 실행 테스트
- [ ] 다른 PC에서 실행 테스트
- [ ] 모든 기능 동작 확인
- [ ] 데이터베이스 초기화 테스트
- [ ] PDF 생성 기능 테스트

배포 전:
- [ ] README-설치.txt 검토
- [ ] 버전 번호 확인
- [ ] 라이선스 파일 포함
- [ ] 사용자 매뉴얼 포함

## 참고 자료

- [PyInstaller 공식 문서](https://pyinstaller.org/)
- [Streamlit 배포 가이드](https://docs.streamlit.io/knowledge-base/deploy)
- [Python 패키징 가이드](https://packaging.python.org/)

## 지원

문제가 발생하면:
1. 이 문서의 "문제 해결" 섹션 참조
2. `build` 폴더의 로그 확인
3. PyInstaller 로그 확인: `build/42ment-ERP/warn-42ment-ERP.txt`
