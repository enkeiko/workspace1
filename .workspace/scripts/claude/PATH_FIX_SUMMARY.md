# PATH 환경 변수 수정 요약

## 문제 원인

**맞습니다!** 전역 설정이 제대로 되어 있지 않았습니다:

1. **npm 전역 패키지**: `C:\npm-global\claude.cmd`가 설치되어 있지만
2. **npm 전역 bin 경로**: `C:\npm-global\node_modules\.bin`이 PATH에 없었습니다
3. **Claude Code 경로**: `C:\Users\enkei\AppData\Local\AnthropicClaude`도 PATH에 없었습니다

## 해결 완료

다음 경로들이 사용자 PATH 환경 변수에 추가되었습니다:
- ✅ `C:\npm-global\node_modules\.bin` (npm 전역 패키지 실행 파일)
- ✅ `C:\Users\enkei\AppData\Local\AnthropicClaude` (Claude Code 실행 파일)

## 현재 세션에서 사용하기

현재 PowerShell 세션에서 바로 사용하려면:

```powershell
$env:PATH = [Environment]::GetEnvironmentVariable('Path', 'User') + ';' + [Environment]::GetEnvironmentVariable('Path', 'Machine')
```

그 다음 테스트:
```powershell
claude --version
```

## 영구 적용

환경 변수는 이미 업데이트되었으므로, **새로운 PowerShell 창을 열면** 자동으로 `claude` 명령어를 사용할 수 있습니다.

## 확인 사항

- Node.js: ✅ 전역 설정됨 (`C:\Program Files\nodejs`)
- npm: ✅ 전역 설정됨
- npm 전역 prefix: `C:\npm-global`
- npm 전역 bin: `C:\npm-global\node_modules\.bin` (이제 PATH에 추가됨)
- Claude CLI: `C:\npm-global\claude.cmd` (npm으로 설치됨)
- Claude Code: `C:\Users\enkei\AppData\Local\AnthropicClaude\claude.exe`

## 참고

- `claude` 명령어는 npm으로 전역 설치된 CLI입니다 (`@anthropic-ai/claude-code`)
- Claude Code는 별도의 데스크톱 애플리케이션입니다
- 두 가지 모두 이제 PATH에 추가되어 사용할 수 있습니다

