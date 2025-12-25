# 현재 PowerShell 세션에서 바로 claude 함수 정의
function claude {
    & 'C:\Users\enkei\AppData\Local\AnthropicClaude\claude.exe' $args
}

Write-Host "claude 함수가 현재 세션에 추가되었습니다!" -ForegroundColor Green
Write-Host "이제 'claude' 명령어를 사용할 수 있습니다." -ForegroundColor Cyan

