# GitHub-basierte Windows Installer

Diese Installer laden die Anwendungsdateien automatisch von GitHub Releases herunter.

## Installer-Dateien

- **FilaHubSetup_x64.exe** - Für Windows x64 (Intel/AMD)
- **FilaHubSetup_ARM64.exe** - Für Windows ARM64

## Voraussetzungen

1. Inno Setup 6+ installiert
2. GitHub Repository mit Releases eingerichtet
3. Dateien auf GitHub Releases hochgeladen

## Setup-Schritte

### 1. GitHub Repository konfigurieren

Aktualisiere die GitHub URLs in beiden Installer-Dateien:

**setup-x64.iss** und **setup-arm64.iss**:
```pascal
#define MyAppURL "https://github.com/DEIN_USERNAME/FilaHub"
#define GitHubReleaseURL "https://github.com/DEIN_USERNAME/FilaHub/releases/download/v1.1.0"
```

### 2. Release-Dateien vorbereiten

```powershell
# Erstellt alle benötigten Dateien für GitHub Release
powershell.exe -ExecutionPolicy Bypass -File scripts\prepare-github-release.ps1
```

Dies erstellt im Verzeichnis `dist/github-release/`:
- `FilaHub.exe` (muss vorher mit `npm run build:exe` erstellt werden)
- `package.json`
- `package-lock.json`
- `prisma.zip`
- `src.zip`
- `lang.zip`
- `.env.example`

### 3. Dateien auf GitHub hochladen

1. Gehe zu deinem GitHub Repository
2. Erstelle ein neues Release (z.B. `v1.1.0`)
3. Lade alle Dateien aus `dist/github-release/` hoch

### 4. Installer erstellen

```powershell
# Erstellt beide Installer (x64 und ARM64)
powershell.exe -ExecutionPolicy Bypass -File scripts\package-windows-github.ps1
```

Die Installer werden erstellt in:
- `dist/windows/installer/FilaHubSetup_x64.exe`
- `dist/windows/installer/FilaHubSetup_ARM64.exe`

## Installationspfad

Standard-Installationspfad: **`C:\Program Files\FilaHub`**

## Was der Installer macht

1. **Prüft Node.js** - Falls nicht installiert, wird es automatisch installiert
2. **Lädt Dateien von GitHub** - Alle benötigten Dateien werden heruntergeladen
3. **Entpackt ZIP-Dateien** - `prisma.zip`, `src.zip`, `lang.zip` werden entpackt
4. **Installiert die Anwendung** - Alle Dateien werden nach `C:\Program Files\FilaHub` kopiert
5. **Erstellt Verknüpfungen** - Desktop und Startmenü-Verknüpfungen
6. **Startet FilaHub** - Optional nach Installation

## Benötigte GitHub Release-Dateien

Die folgenden Dateien müssen auf GitHub Releases verfügbar sein:

- `FilaHub.exe` - Die kompilierte Anwendung
- `package.json` - npm Paket-Definition
- `package-lock.json` - npm Lock-Datei (optional)
- `prisma.zip` - Prisma Schema und Migrationen
- `src.zip` - Quellcode (Views, Routes, etc.)
- `lang.zip` - Sprachdateien
- `.env.example` - Beispiel-Umgebungsvariablen

## Fehlerbehebung

### Download schlägt fehl

- Prüfe die GitHub URLs in den .iss Dateien
- Stelle sicher, dass alle Dateien auf GitHub Releases hochgeladen sind
- Prüfe die Internetverbindung

### ZIP-Entpackung schlägt fehl

- Stelle sicher, dass PowerShell verfügbar ist
- Prüfe, ob die ZIP-Dateien korrekt erstellt wurden

### Node.js Installation schlägt fehl

- Die Node.js .msi Dateien müssen in `installer/windows/dependencies/` vorhanden sein
- Prüfe, ob die richtige Architektur (x64/ARM64) verwendet wird

