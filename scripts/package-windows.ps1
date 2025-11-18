param(
    [string]$IsccPath = "$([Environment]::GetEnvironmentVariable('ProgramFiles(x86)'))\Inno Setup 6\ISCC.exe"
)

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location (Join-Path $root "..")

Write-Host "Running build script..." -ForegroundColor Cyan
powershell.exe -ExecutionPolicy Bypass -File "$root\build-windows.ps1"

if (-not (Test-Path $IsccPath)) {
    Write-Warning "ISCC.exe wurde nicht gefunden. Bitte Pfad mit -IsccPath angeben oder Inno Setup installieren."
    exit 1
}

Write-Host "Building installer via Inno Setup..." -ForegroundColor Cyan
& "$IsccPath" "installer\windows\setup.iss"

if ($LASTEXITCODE -eq 0) {
    Write-Host "Installer successfully created in dist/windows/installer." -ForegroundColor Green
} else {
    Write-Host "Installer build failed with exit code $LASTEXITCODE." -ForegroundColor Red
    exit $LASTEXITCODE
}

