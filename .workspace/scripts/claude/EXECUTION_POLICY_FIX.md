# PowerShell 실행 정책 오류 해결

## 문제

PowerShell 프로필 파일을 로드할 때 다음과 같은 오류가 발생했습니다:

```
이 시스템에서 스크립트를 실행할 수 없으므로 ... 파일을 로드할 수 없습니다.
```

## 원인

PowerShell의 실행 정책(Execution Policy)이 스크립트 실행을 차단하고 있었습니다.

## 해결 완료

다음 작업이 완료되었습니다:

1. ✅ **실행 정책 설정**: `RemoteSigned`로 설정됨
   - 로컬에서 작성한 스크립트는 서명 없이 실행 가능
   - 인터넷에서 다운로드한 스크립트는 서명 필요

2. ✅ **프로필 파일 생성**: `C:\Users\enkei\OneDrive\문서\WindowsPowerShell\Microsoft.PowerShell_profile.ps1`
   - `claude` 함수가 포함되어 있음

## 현재 상태

- **실행 정책**: `RemoteSigned` (CurrentUser 스코프)
- **프로필 파일**: 생성 완료
- **프로필 내용**: `claude` 함수 포함

## 프로필 로드하기

### 방법 1: 현재 세션에서 로드
```powershell
. $PROFILE
```

### 방법 2: PowerShell 재시작
새로운 PowerShell 창을 열면 자동으로 프로필이 로드됩니다.

## 프로필 로드 후 테스트

프로필을 로드한 후 다음 명령어로 테스트하세요:

```powershell
# claude 함수 확인
Get-Command claude

# claude 실행
claude --version
```

## 실행 정책 확인

현재 실행 정책을 확인하려면:
```powershell
Get-ExecutionPolicy -List
```

## 참고

- **RemoteSigned**: 로컬 스크립트는 서명 없이 실행 가능, 원격 스크립트는 서명 필요
- **Bypass**: 모든 스크립트 실행 허용 (보안 위험)
- **Restricted**: 모든 스크립트 실행 차단 (기본값)

현재 설정인 `RemoteSigned`는 보안과 편의성의 균형이 잘 맞는 설정입니다.

