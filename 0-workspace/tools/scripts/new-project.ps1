param(
  [Parameter(Mandatory=$false)][string] $Name
)

if (-not $Name) {
  $Name = Read-Host '프로젝트 이름(짧은-케밥-케이스)'
}

if (-not $Name) { Write-Host '이름이 필요합니다.'; exit 1 }

$datePrefix = Get-Date -Format 'yyyy-MM'
$projName = "$datePrefix-$Name"
$dest = Join-Path (Join-Path $env:USERPROFILE 'Documents\workspace\projects') $projName

New-Item -ItemType Directory -Path $dest -Force | Out-Null
Copy-Item -Path (Join-Path $env:USERPROFILE 'Documents\workspace\templates\project-standard\*') -Destination $dest -Recurse -Force -Container

# README 자리표시자 치환
(Get-Content (Join-Path $dest 'README.md')) -replace '\{PROJECT_NAME\}', $projName | Set-Content (Join-Path $dest 'README.md')

Write-Host "생성 완료: $dest"
