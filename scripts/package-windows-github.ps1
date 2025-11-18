# PowerShell Script zum Erstellen der Windows Installer mit GitHub-Download
# Erstellt zwei separate Installer: FilaHubSetup_x64.exe und FilaHubSetup_ARM64.exe

param(
    [string]$IsccPath = "$([Environment]::GetEnvironmentVariable('ProgramFiles(x86)'))\Inno Setup 6\ISCC.exe",
    [string]$GitHubUser = "YOUR_USERNAME",
    [string]$GitHubRepo = "FilaHub"
)

$ErrorActionPreference = "Stop"

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
$projectRoot = Resolve-Path (Join-Path $scriptDir "..\")
$setupX64 = Join-Path $projectRoot "installer\windows\setup-x64.iss"
$setupARM64 = Join-Path $projectRoot "installer\windows\setup-arm64.iss"

Write-Host "=== FilaHub Windows Installer Builder (GitHub Download) ===" -ForegroundColor Cyan
Write-Host ""

# Prüfe Inno Setup
if (-not (Test-Path $IsccPath)) {
    Write-Error "Inno Setup Compiler nicht gefunden bei '$IsccPath'"
    Write-Host "Bitte installiere Inno Setup oder passe den Pfad mit -IsccPath an." -ForegroundColor Yellow
    exit 1
}

Write-Host "WICHTIG: Stelle sicher, dass die GitHub URLs in setup-x64.iss und setup-arm64.iss korrekt sind!" -ForegroundColor Yellow
Write-Host "GitHub User: $GitHubUser" -ForegroundColor Gray
Write-Host "GitHub Repo: $GitHubRepo" -ForegroundColor Gray
Write-Host ""

# Erstelle x64 Installer
Write-Host "--- Erstelle FilaHubSetup_x64.exe ---" -ForegroundColor Cyan
& "$IsccPath" "$setupX64"

if ($LASTEXITCODE -ne 0) {
    Write-Error "Fehler beim Erstellen des x64 Installers!"
    exit 1
}

# Erstelle ARM64 Installer
Write-Host "--- Erstelle FilaHubSetup_ARM64.exe ---" -ForegroundColor Cyan
& "$IsccPath" "$setupARM64"

if ($LASTEXITCODE -ne 0) {
    Write-Error "Fehler beim Erstellen des ARM64 Installers!"
    exit 1
}

Write-Host ""
Write-Host "=== Installer erfolgreich erstellt! ===" -ForegroundColor Green
Write-Host "Speicherort: $projectRoot\dist\windows\installer\" -ForegroundColor Gray
Write-Host ""
Write-Host "Nächste Schritte:" -ForegroundColor Yellow
Write-Host "1. Lade die Anwendungsdateien auf GitHub Releases hoch:" -ForegroundColor Gray
Write-Host "   - FilaHub.exe" -ForegroundColor Gray
Write-Host "   - package.json" -ForegroundColor Gray
Write-Host "   - package-lock.json" -ForegroundColor Gray
Write-Host "   - prisma.zip (komprimierter prisma Ordner)" -ForegroundColor Gray
Write-Host "   - src.zip (komprimierter src Ordner)" -ForegroundColor Gray
Write-Host "   - lang.zip (komprimierter lang Ordner)" -ForegroundColor Gray
Write-Host "   - .env.example" -ForegroundColor Gray
Write-Host "2. Aktualisiere die GitHub URLs in setup-x64.iss und setup-arm64.iss" -ForegroundColor Gray
Write-Host "3. Teste die Installer auf einem frischen System" -ForegroundColor Gray

