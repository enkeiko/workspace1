# Claude Code PowerShell 실행 문제 해결

## 문제 상황
Claude Code가 설치되어 있지만 PowerShell에서 `claude` 명령어로 실행되지 않는 경우입니다.

## 원인
Claude Code 실행 파일이 PATH 환경 변수에 포함되어 있지 않아서 발생합니다.

## 해결 방법

### 방법 1: 프로필 파일 사용 (권장)

PowerShell 프로필 파일에 함수를 추가하면 모든 PowerShell 세션에서 `claude` 명령어를 사용할 수 있습니다.

1. **프로필 파일 확인:**
```powershell
echo $PROFILE
```

2. **프로필 파일에 함수 추가:**
프로필 파일 (`C:\Users\enkei\OneDrive\문서\WindowsPowerShell\Microsoft.PowerShell_profile.ps1`)을 열고 다음 내용을 추가하세요:

```powershell
function claude {
    & 'C:\Users\enkei\AppData\Local\AnthropicClaude\claude.exe' $args
}
```

3. **프로필 파일 다시 로드:**
```powershell
. $PROFILE
```

4. **테스트:**
```powershell
claude --version
```

### 방법 2: 현재 세션에서만 사용

현재 PowerShell 세션에서만 사용하려면 다음 명령어를 실행하세요:

```powershell
function claude {
    & 'C:\Users\enkei\AppData\Local\AnthropicClaude\claude.exe' $args
}
```

### 방법 3: 전체 경로로 실행

별칭이나 함수 없이 전체 경로로 직접 실행:

```powershell
& 'C:\Users\enkei\AppData\Local\AnthropicClaude\claude.exe' --version
```

### 방법 4: PATH 환경 변수에 추가 (영구적 해결)

1. 시스템 환경 변수 편집:
   - Windows 키 + R → `sysdm.cpl` 입력
   - "고급" 탭 → "환경 변수" 클릭
   - "사용자 변수" 또는 "시스템 변수"에서 `Path` 선택 → "편집"
   - "새로 만들기" 클릭
   - `C:\Users\enkei\AppData\Local\AnthropicClaude` 추가
   - 확인 클릭

2. PowerShell 재시작 후 테스트:
```powershell
claude --version
```

## 자동 설정 스크립트

워크스페이스에 있는 `setup-claude-function.ps1` 스크립트를 실행하면 자동으로 설정됩니다:

```powershell
powershell -ExecutionPolicy Bypass -File setup-claude-function.ps1
```

## 확인 사항

- Claude Code 설치 경로: `C:\Users\enkei\AppData\Local\AnthropicClaude\claude.exe`
- 프로필 파일 경로: `C:\Users\enkei\OneDrive\문서\WindowsPowerShell\Microsoft.PowerShell_profile.ps1`

## 참고

- 프로필 파일을 수정한 후에는 PowerShell을 재시작하거나 `. $PROFILE` 명령어로 프로필을 다시 로드해야 합니다.
- 각 PowerShell 세션은 독립적이므로, 새 세션을 열 때마다 프로필이 자동으로 로드됩니다.

