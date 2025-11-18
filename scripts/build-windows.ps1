param(
    [string]$DistDir = "dist/windows/app"
)

Write-Host "Cleaning previous dist directory..." -ForegroundColor Cyan
if (Test-Path $DistDir) {
    Remove-Item -Path $DistDir -Recurse -Force
}

Write-Host "Creating distribution directory at $DistDir" -ForegroundColor Cyan
New-Item -ItemType Directory -Path $DistDir -Force | Out-Null

Write-Host "Copying application files..." -ForegroundColor Cyan
$itemsToCopy = @(
    "package.json",
    "package-lock.json",
    "README.md",
    ".env.example",
    "Start Programm.bat",
    "prisma",
    "src",
    "lang",
    "public" # optional: add other runtime directories if needed
)

# Erstelle leeren data Ordner (ohne Datenbank-Dateien)
$dataDir = Join-Path $DistDir "data"
New-Item -ItemType Directory -Path $dataDir -Force | Out-Null
# Kopiere nur config.json falls vorhanden, aber keine .db Dateien
if (Test-Path "data\config.json") {
    Copy-Item "data\config.json" -Destination $dataDir -Force
}

foreach ($item in $itemsToCopy) {
    if (Test-Path $item) {
        Copy-Item -Path $item -Destination (Join-Path $DistDir $item) -Recurse
    } else {
        Write-Warning "Skipped missing item: $item"
    }
}

Write-Host "Installing production dependencies..." -ForegroundColor Cyan
Push-Location $DistDir
npm ci --omit=dev
Pop-Location

Write-Host "Distribution prepared. You can now create the installer with Inno Setup." -ForegroundColor Green

