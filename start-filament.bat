@echo off
setlocal enabledelayedexpansion

REM -------- Projektpfad setzen --------
cd /d "%~dp0"

echo [1/3] Pruefe npm-Abhaengigkeiten ...
if not exist "node_modules" (
    echo    node_modules fehlt - fuehre npm install aus.
    call npm install
    if errorlevel 1 (
        echo Fehler bei npm install. Abbruch.
        pause
        exit /b 1
    )
) else (
    echo    node_modules vorhanden - ueberspringe Installation.
)

echo [2/3] Datenbank-Schema abgleichen ...
call npx prisma migrate deploy
if errorlevel 1 (
    echo Fehler bei prisma migrate deploy. Abbruch.
    pause
    exit /b 1
)

echo [3/3] Starte Entwicklungsserver ...
call npm run dev

echo Server wurde beendet.
pause


