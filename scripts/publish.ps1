# PowerShell script to publish Electron app to GitHub Releases
# Usage: .\scripts\publish.ps1

param(
    [Parameter(Mandatory=$true)]
    [string]$Token
)

Write-Host "Setting up GitHub token..." -ForegroundColor Green
$env:GH_TOKEN = $Token

Write-Host "Building and publishing to GitHub Releases..." -ForegroundColor Green
pnpm run electron:publish

if ($LASTEXITCODE -eq 0) {
    Write-Host "`n✅ Successfully published to GitHub Releases!" -ForegroundColor Green
} else {
    Write-Host "`n❌ Publishing failed. Check the error messages above." -ForegroundColor Red
}

