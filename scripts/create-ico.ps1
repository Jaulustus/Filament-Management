# PowerShell Script zum Erstellen einer .ico Datei aus PNG-Dateien
# Benötigt: ImageMagick (https://imagemagick.org/) oder Online-Tool

$ErrorActionPreference = "Stop"

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
$projectRoot = Resolve-Path (Join-Path $scriptDir "..\")
$iconsDir = Join-Path $projectRoot "assets\icons"

Write-Host "Erstelle FilaHub.ico aus PNG-Dateien..." -ForegroundColor Cyan

# Prüfe ob ImageMagick installiert ist
$magickPath = Get-Command magick -ErrorAction SilentlyContinue
if (-not $magickPath) {
    Write-Host "`nImageMagick nicht gefunden!" -ForegroundColor Yellow
    Write-Host "Optionen:" -ForegroundColor Yellow
    Write-Host "1. ImageMagick installieren: https://imagemagick.org/script/download.php" -ForegroundColor Gray
    Write-Host "2. Online-Tool verwenden: https://convertio.co/png-ico/" -ForegroundColor Gray
    Write-Host "3. Die größte PNG-Datei (Filahub512.png) manuell in .ico konvertieren" -ForegroundColor Gray
    Write-Host "`nFür Windows Installer benötigen wir: assets\icons\app.ico" -ForegroundColor Yellow
    Write-Host "Empfohlene Größen in der .ico: 16x16, 32x32, 48x48, 256x256" -ForegroundColor Gray
    
    # Erstelle eine einfache .ico aus der 256x256 PNG (falls ImageMagick nicht verfügbar)
    $png256 = Join-Path $iconsDir "Filahub256.png"
    $icoPath = Join-Path $iconsDir "app.ico"
    
    if (Test-Path $png256) {
        Write-Host "`nKopiere Filahub256.png als app.ico (temporär)..." -ForegroundColor Yellow
        Copy-Item $png256 $icoPath -Force
        Write-Host "HINWEIS: Dies ist nur eine temporäre Lösung!" -ForegroundColor Yellow
        Write-Host "Bitte erstelle eine echte Multi-Resolution .ico Datei!" -ForegroundColor Yellow
    }
    
    exit 0
}

# Erstelle Multi-Resolution .ico mit ImageMagick
$icoPath = Join-Path $iconsDir "app.ico"
$pngFiles = @(
    (Join-Path $iconsDir "Filahub16.png"),
    (Join-Path $iconsDir "Filahub32.png"),
    (Join-Path $iconsDir "Filahub48.png"),
    (Join-Path $iconsDir "Filahub256.png")
)

# Prüfe welche Dateien vorhanden sind
$availablePngs = @()
foreach ($png in $pngFiles) {
    if (Test-Path $png) {
        $availablePngs += $png
    }
}

if ($availablePngs.Count -eq 0) {
    Write-Host "Keine PNG-Dateien gefunden!" -ForegroundColor Red
    exit 1
}

Write-Host "Verwende folgende PNG-Dateien:" -ForegroundColor Gray
foreach ($png in $availablePngs) {
    Write-Host "  - $(Split-Path $png -Leaf)" -ForegroundColor Gray
}

# Erstelle .ico mit ImageMagick
Write-Host "`nErstelle app.ico..." -ForegroundColor Cyan
& magick $availablePngs -background none $icoPath

if (Test-Path $icoPath) {
    $fileSize = (Get-Item $icoPath).Length / 1KB
    Write-Host "✓ app.ico erfolgreich erstellt! ($([math]::Round($fileSize, 2)) KB)" -ForegroundColor Green
    Write-Host "Pfad: $icoPath" -ForegroundColor Gray
} else {
    Write-Host "✗ Fehler beim Erstellen der .ico Datei!" -ForegroundColor Red
    exit 1
}

