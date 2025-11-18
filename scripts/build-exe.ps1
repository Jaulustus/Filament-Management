# PowerShell Script zum Erstellen der FilaHub.exe
# Benötigt: pkg (npm install -g pkg oder npm install --save-dev pkg)

$ErrorActionPreference = "Stop"

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
$projectRoot = Resolve-Path (Join-Path $scriptDir "..\")

Write-Host "Building FilaHub.exe..." -ForegroundColor Cyan
Write-Host "Project root: $projectRoot" -ForegroundColor Gray

# Wechsle ins Projektverzeichnis
Push-Location $projectRoot

try {
    # Prüfe ob pkg installiert ist
    $pkgInstalled = $false
    try {
        $null = Get-Command pkg -ErrorAction Stop
        $pkgInstalled = $true
    } catch {
        Write-Host "pkg ist nicht global installiert. Prüfe lokale Installation..." -ForegroundColor Yellow
        if (Test-Path "node_modules\.bin\pkg.cmd") {
            $pkgInstalled = $true
            $pkgCmd = "node_modules\.bin\pkg.cmd"
        }
    }

    if (-not $pkgInstalled) {
        Write-Host "pkg wird installiert..." -ForegroundColor Yellow
        npm install --save-dev pkg
        $pkgCmd = "node_modules\.bin\pkg.cmd"
    } else {
        $pkgCmd = "pkg"
    }

    Write-Host "Erstelle FilaHub.exe mit pkg..." -ForegroundColor Cyan
    
    # Erstelle die .exe
    & $pkgCmd startup.js --targets node18-win-x64 --output FilaHub.exe

    if ($LASTEXITCODE -eq 0) {
        Write-Host "`nFilaHub.exe erfolgreich erstellt!" -ForegroundColor Green
        Write-Host "Datei: $projectRoot\FilaHub.exe" -ForegroundColor Gray
        
        # Zeige Dateigröße
        if (Test-Path "FilaHub.exe") {
            $fileSize = (Get-Item "FilaHub.exe").Length / 1MB
            Write-Host "Größe: $([math]::Round($fileSize, 2)) MB" -ForegroundColor Gray
        }
    } else {
        Write-Host "Fehler beim Erstellen der .exe!" -ForegroundColor Red
        exit 1
    }

} finally {
    Pop-Location
}

Write-Host "`nFertig!" -ForegroundColor Green

