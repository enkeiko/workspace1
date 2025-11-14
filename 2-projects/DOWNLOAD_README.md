# 42ment ERP - 다운로드 및 사용 가이드

## 다운로드 가능한 패키지

현재 다음 패키지들이 준비되어 있습니다:

### 1. 전체 프로젝트 패키지 (권장)
**파일**: `42ment-erp-package.tar.gz` (134KB)
**경로**: `/home/user/workspace1/2-projects/42ment-erp-package.tar.gz`

**포함 내용**:
- 모든 소스 코드
- 빌드 스크립트
- 문서
- 설정 파일
- 기존 실행 스크립트

**적합한 경우**:
- Windows PC에서 직접 빌드하려는 경우
- 소스 코드를 수정하려는 경우
- 완전한 프로젝트가 필요한 경우

### 2. 빌드 파일만 (경량)
**파일**: `42ment-erp-build-only.tar.gz` (9.7KB)
**경로**: `/home/user/workspace1/2-projects/42ment-erp-build-only.tar.gz`

**포함 내용**:
- launcher.spec
- build-windows.bat
- build-windows.ps1
- requirements-build.txt
- BUILD_GUIDE.md
- WINDOWS_PACKAGE_README.md
- PACKAGING_SUMMARY.md

**적합한 경우**:
- 기존 프로젝트에 빌드 스크립트만 추가하려는 경우
- 문서만 필요한 경우

## 다운로드 방법

### 방법 1: 직접 파일 복사

현재 Linux/WSL 환경이라면:

```bash
# Windows 경로로 복사 (예: C:\Users\YourName\Downloads)
cp /home/user/workspace1/2-projects/42ment-erp-package.tar.gz /mnt/c/Users/YourName/Downloads/

# 또는 빌드 파일만
cp /home/user/workspace1/2-projects/42ment-erp-build-only.tar.gz /mnt/c/Users/YourName/Downloads/
```

### 방법 2: 파일 탐색기에서 직접 접근

1. Windows 파일 탐색기 열기
2. 주소창에 입력: `\\wsl$\Ubuntu\home\user\workspace1\2-projects`
3. tar.gz 파일을 원하는 위치로 드래그

### 방법 3: VSCode 등 에디터에서

현재 작업 중인 에디터에서 파일 탐색기로 해당 경로를 열어서 다운로드

## 압축 해제

### Windows에서

#### 7-Zip 사용 (권장)
1. 7-Zip 설치 (https://www.7-zip.org/)
2. 파일 우클릭 → 7-Zip → Extract Here

#### Windows 11/10 기본 기능
1. 파일 우클릭 → "압축 풀기"
2. .tar.gz는 두 번 압축 해제 필요할 수 있음

### Linux/Mac에서

```bash
tar -xzf 42ment-erp-package.tar.gz
```

## 사용 방법

### 전체 패키지를 받은 경우

1. **압축 해제**
   ```
   42ment-erp-package.tar.gz 압축 해제
   → 42ment-erp/ 폴더 생성됨
   ```

2. **Windows PC로 이동**
   - 42ment-erp 폴더를 USB나 네트워크로 Windows PC에 복사

3. **빌드 실행**
   ```batch
   cd 42ment-erp
   build-windows.bat
   ```
   또는
   ```powershell
   cd 42ment-erp
   .\build-windows.ps1
   ```

4. **결과 확인**
   ```
   dist/42ment-ERP-Windows/ 폴더에 실행 파일 생성됨
   ```

5. **실행**
   ```
   dist/42ment-ERP-Windows/시작-42ment-ERP.bat 더블클릭
   ```

### 빌드 파일만 받은 경우

1. **기존 프로젝트 폴더로 이동**
   ```bash
   cd your-existing-42ment-erp-folder
   ```

2. **빌드 파일 압축 해제**
   ```bash
   tar -xzf 42ment-erp-build-only.tar.gz
   ```

3. **빌드 실행**
   ```batch
   build-windows.bat
   ```

## 빌드 시스템 요구사항

Windows PC에서 빌드하려면:

- **Python 3.11+** 설치 필요
  - https://www.python.org/downloads/ 에서 다운로드
  - 설치 시 "Add Python to PATH" 체크 필수

- **디스크 공간**: 최소 2GB 여유

- **메모리**: 최소 4GB RAM

- **인터넷 연결**: 의존성 다운로드용 (최초 빌드 시만)

## 빌드 프로세스

빌드 스크립트가 자동으로 다음을 수행합니다:

1. ✅ Python 설치 확인
2. ✅ PyInstaller 자동 설치
3. ✅ 프로젝트 의존성 설치
4. ✅ 실행 파일 빌드
5. ✅ 배포 패키지 구성
6. ✅ (PowerShell만) ZIP 아카이브 생성

## 빌드 시간

- **최초 빌드**: 5-10분 (의존성 다운로드 포함)
- **재빌드**: 2-3분

## 빌드 결과물

```
dist/
└── 42ment-ERP-Windows/
    ├── app/
    │   ├── 42ment-ERP.exe      # GUI 런처
    │   ├── src/                # ERP 소스
    │   ├── config/             # 설정
    │   ├── data/               # 데이터 폴더
    │   └── _internal/          # 의존성
    ├── 시작-42ment-ERP.bat      # 간편 실행
    ├── README-설치.txt
    └── 문서들...
```

**크기**: 약 200-500MB (모든 Python 의존성 포함)

## 배포

빌드가 완료되면:

1. `dist/42ment-ERP-Windows` 폴더 전체를 ZIP으로 압축
2. 최종 사용자에게 배포
3. 사용자는 압축 해제 후 `시작-42ment-ERP.bat` 실행
4. Python 설치 불필요!

## 문제 해결

### "Python을 찾을 수 없음" 오류

**해결**: Python 설치 및 PATH 환경변수 설정 확인

### "PyInstaller를 찾을 수 없음" 오류

**해결**: 스크립트가 자동 설치. 수동으로: `pip install pyinstaller`

### 빌드 실패

**확인사항**:
1. Python 버전 3.11 이상인지 확인: `python --version`
2. 디스크 공간 충분한지 확인
3. 바이러스 백신이 빌드를 차단하지 않는지 확인

### 더 자세한 정보

- `BUILD_GUIDE.md` - 상세 빌드 가이드
- `WINDOWS_PACKAGE_README.md` - 최종 사용자 가이드
- `PACKAGING_SUMMARY.md` - 패키징 프로세스 요약

## 빠른 시작 (요약)

```bash
# 1. 다운로드
다운로드: 42ment-erp-package.tar.gz

# 2. 압축 해제
tar -xzf 42ment-erp-package.tar.gz

# 3. Windows PC로 복사
USB나 네트워크로 복사

# 4. 빌드 (Windows에서)
cd 42ment-erp
build-windows.bat

# 5. 실행
cd dist\42ment-ERP-Windows
시작-42ment-ERP.bat 더블클릭
```

## 지원

질문이나 문제가 있으면:
- BUILD_GUIDE.md의 문제 해결 섹션 참조
- GitHub Issues 확인
- 프로젝트 문서 참조

---

**준비 완료!** 이제 Windows에서 실행 가능한 ERP 시스템을 빌드할 수 있습니다.
