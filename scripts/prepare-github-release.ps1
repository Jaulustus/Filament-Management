# PowerShell Script zum Vorbereiten der Dateien für GitHub Release
# Erstellt ZIP-Dateien und kopiert Dateien für den Release-Upload

$ErrorActionPreference = "Stop"

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
$projectRoot = Resolve-Path (Join-Path $scriptDir "..\")
$releaseDir = Join-Path $projectRoot "dist\github-release"

Write-Host "=== Vorbereitung für GitHub Release ===" -ForegroundColor Cyan
Write-Host ""

# Erstelle Release-Verzeichnis
if (Test-Path $releaseDir) {
    Remove-Item $releaseDir -Recurse -Force
}
New-Item -ItemType Directory -Path $releaseDir | Out-Null

Write-Host "Erstelle Release-Verzeichnis..." -ForegroundColor Gray

# WICHTIG: Keine Datenbank-Dateien (.db) mitliefern!
# Die Datenbank wird beim ersten Start automatisch erstellt

# Kopiere FilaHub.exe (falls vorhanden)
$exePath = Join-Path $projectRoot "FilaHub.exe"
if (Test-Path $exePath) {
    Copy-Item $exePath -Destination $releaseDir
    Write-Host "✓ FilaHub.exe kopiert" -ForegroundColor Green
} else {
    Write-Host "⚠ FilaHub.exe nicht gefunden - bitte zuerst 'npm run build:exe' ausführen" -ForegroundColor Yellow
}

# Kopiere package.json und package-lock.json
Copy-Item (Join-Path $projectRoot "package.json") -Destination $releaseDir -ErrorAction SilentlyContinue
Copy-Item (Join-Path $projectRoot "package-lock.json") -Destination $releaseDir -ErrorAction SilentlyContinue
Write-Host "✓ package.json kopiert" -ForegroundColor Green

# Kopiere .env.example
Copy-Item (Join-Path $projectRoot ".env.example") -Destination $releaseDir -ErrorAction SilentlyContinue
Write-Host "✓ .env.example kopiert" -ForegroundColor Green

# Erstelle ZIP-Dateien
Write-Host ""
Write-Host "Erstelle ZIP-Dateien..." -ForegroundColor Gray

# Prüfe ob 7-Zip verfügbar ist
$7zipPath = Get-Command "7z" -ErrorAction SilentlyContinue
if (-not $7zipPath) {
    $7zipPath = Get-Command "C:\Program Files\7-Zip\7z.exe" -ErrorAction SilentlyContinue
}

if ($7zipPath) {
    # Erstelle prisma.zip
    & $7zipPath a (Join-Path $releaseDir "prisma.zip") (Join-Path $projectRoot "prisma\*") | Out-Null
    Write-Host "✓ prisma.zip erstellt" -ForegroundColor Green
    
    # Erstelle src.zip
    & $7zipPath a (Join-Path $releaseDir "src.zip") (Join-Path $projectRoot "src\*") | Out-Null
    Write-Host "✓ src.zip erstellt" -ForegroundColor Green
    
    # Erstelle lang.zip
    & $7zipPath a (Join-Path $releaseDir "lang.zip") (Join-Path $projectRoot "lang\*") | Out-Null
    Write-Host "✓ lang.zip erstellt" -ForegroundColor Green
} else {
    # Fallback: Verwende PowerShell Compress-Archive
    Write-Host "7-Zip nicht gefunden, verwende PowerShell Compress-Archive..." -ForegroundColor Yellow
    
    Compress-Archive -Path (Join-Path $projectRoot "prisma\*") -DestinationPath (Join-Path $releaseDir "prisma.zip") -Force
    Write-Host "✓ prisma.zip erstellt" -ForegroundColor Green
    
    Compress-Archive -Path (Join-Path $projectRoot "src\*") -DestinationPath (Join-Path $releaseDir "src.zip") -Force
    Write-Host "✓ src.zip erstellt" -ForegroundColor Green
    
    Compress-Archive -Path (Join-Path $projectRoot "lang\*") -DestinationPath (Join-Path $releaseDir "lang.zip") -Force
    Write-Host "✓ lang.zip erstellt" -ForegroundColor Green
}

Write-Host ""
Write-Host "=== Release-Dateien vorbereitet! ===" -ForegroundColor Green
Write-Host "Verzeichnis: $releaseDir" -ForegroundColor Gray
Write-Host ""
Write-Host "Dateien für GitHub Release:" -ForegroundColor Yellow
Get-ChildItem $releaseDir | ForEach-Object {
    $size = [math]::Round($_.Length / 1MB, 2)
    Write-Host "  - $($_.Name) ($size MB)" -ForegroundColor Gray
}
Write-Host ""
Write-Host "Lade diese Dateien auf GitHub Releases hoch!" -ForegroundColor Cyan

