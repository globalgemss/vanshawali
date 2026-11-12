$ErrorActionPreference = 'Stop'
Set-Location $PSScriptRoot
Write-Host 'Vanshawali 360 -> globalgemss/vanshawali' -ForegroundColor Cyan
if (!(Get-Command git -ErrorAction SilentlyContinue)) { throw 'Git not installed. Install Git for Windows: https://git-scm.com/download/win' }
if (!(Test-Path '.git')) { git init }
git add -A
$existing = git status --porcelain
if ($existing) { git commit -m 'Add Vanshawali 360 V5 Royal Premium demo source' }
git branch -M main
$origin = git remote 2>$null
if ($origin -contains 'origin') { git remote set-url origin 'https://github.com/globalgemss/vanshawali.git' }
else { git remote add origin 'https://github.com/globalgemss/vanshawali.git' }
Write-Host 'Pushing to GitHub. Git Credential Manager may ask you to sign in.' -ForegroundColor Yellow
git push -u origin main
if ($LASTEXITCODE -ne 0) {throw 'Push failed. Check GitHub sign-in / remote branch status.'}
Write-Host 'Finished: https://github.com/globalgemss/vanshawali' -ForegroundColor Green
