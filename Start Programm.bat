@echo off
setlocal EnableExtensions EnableDelayedExpansion

:: ---------- Console setup (UTF-8 + ANSI colors) ----------
chcp 65001 >nul
for /F "delims=" %%A in ('echo prompt $E^| cmd') do set "ESC=%%A"

set "RST=%ESC%[0m"
set "BOLD=%ESC%[1m"
set "DIM=%ESC%[2m"

:: 256-color accents (works in Win10/11 terminals)
set "FG_OK=%ESC%[38;5;82m"
set "FG_WARN=%ESC%[38;5;214m"
set "FG_ERR=%ESC%[38;5;203m"
set "FG_PRM=%ESC%[38;5;45m"
set "FG_TXT=%ESC%[38;5;250m"
set "FG_TITLE=%ESC%[38;5;141m"

:: ---------- Title ----------
cls
set "TITLE=Filament Manager / Inventory Launcher"
set "BAR=============================================================="

echo %ESC%[48;5;236m%FG_TITLE%%BOLD% %TITLE% %RST%
echo %ESC%[48;5;236m%FG_TXT% Node.js ^| Prisma ^| SQLite ^| DYMO Labels %RST%
echo.

:: ---------- Helpers ----------
set "WD=%cd%"
cd /d "%~dp0"
set "WORKDIR=%cd%"

call :info "Working directory: %WORKDIR%"

:: Check tool availability early
call :checkTool "node"   "https://nodejs.org/"           || goto :abort
call :checkTool "npm"    "https://nodejs.org/"           || goto :abort
call :checkTool "npx"    "https://nodejs.org/"           || goto :abort

echo.

:: ---------- STEP 1/3: deps ----------
call :step "STEP 1/3" "Checking npm dependencies"
if not exist "node_modules" (
  call :run "npm install" || goto :abort
) else (
  call :ok "node_modules present – skipping installation"
)

echo.

:: ---------- STEP 2/3: prisma ----------
call :step "STEP 2/3" "Applying database schema"
if exist ".env.example" if not exist ".env" (
  call :warn ".env missing – copying from .env.example"
  copy /y ".env.example" ".env" >nul
)
call :run "npx prisma migrate deploy" || goto :abort
call :ok "Prisma schema up to date"

echo.

:: ---------- STEP 3/3: start dev ----------
call :step "STEP 3/3" "Starting development server"

if "%APP_MODE%"=="" set "APP_MODE=both"
call :info "Mode: %APP_MODE%"

set "NODE_ENV=development"
call :run "npm run dev"
if errorlevel 1 goto :abort

echo.
call :info "Server stopped."
goto :end


:: =================== subroutines ===================

:step
  set "S=%~1"
  set "T=%~2"
  echo %BOLD%%FG_PRM%[%S%]%RST% %FG_TXT%%T%%RST%
  exit /b

:ok
  echo   %FG_OK%[ OK ]%RST% %FG_TXT%%~1%RST%
  exit /b

:warn
  echo   %FG_WARN%[WARN]%RST% %FG_TXT%%~1%RST%
  exit /b

:err
  echo   %FG_ERR%[FAIL]%RST% %FG_TXT%%~1%RST%
  exit /b

:info
  echo   %DIM%•%RST% %FG_TXT%%~1%RST%
  exit /b

:run
  set "CMD=%~1"
  echo   %DIM%> %CMD%%RST%
  call %CMD%
  if errorlevel 1 (
    call :err "%CMD%"
    exit /b 1
  )
  exit /b 0

:checkTool
  where %~1 >nul 2>&1
  if errorlevel 1 (
    call :err "Required tool '%~1' not found. Get it at %~2"
    exit /b 1
  ) else (
    for /f "delims=" %%V in ('%~1 -v 2^>nul ^| findstr /r /c:"[0-9]"') do set "VER=%%V"
    call :ok "%~1 detected%DIM%  %VER%%RST%"
    exit /b 0
  )

:abort
  echo.
  call :err "Aborting. See messages above."
  echo.
  pause
  exit /b 1

:end
  echo.
  pause
  exit /b 0
