# Filament Inventory

Lokale Node.js-Anwendung zur Verwaltung von 3D-Druck-Filament-Spulen inklusive G-Code-Analyse, Barcode-Generator und DYMO-Drucklayout.

## Features

- Express REST-API und Web-UI ohne Framework-Overhead (reines HTML/CSS/JS)
- SQLite-Datenbank via Prisma ORM (`./data/filament.db`)
- Verwaltung von Filament-Spulen inkl. Archivierung und Verbrauchs-Logs
- Mehrsprachige Oberfläche (DE/EN) über `lang/lang.json` und `i18n.js`
- G-Code-Upload mit Streaming-Parser (Header-Erkennung, M82/M83, M200)
- Automatische Verbrauchs-Buchung nach G-Code-Analyse
- Code128-Barcodes via `bwip-js` und QR-Codes via `qrcode`
- DYMO LabelWriter 550 Druckansicht (89×36 mm)
- Farbverwaltung mit beliebig vielen HEX-Werten pro Spule

## Anforderungen

- Node.js ≥ 18
- npm ≥ 9
- SQLite (im Lieferumfang von Node enthalten)

## Installation

```bash
npm install
npx prisma generate
npx prisma migrate dev
```

Kopiere `.env.example` nach `.env` und passe Port oder Basis-URL bei Bedarf an.

## Entwicklung & Start

```bash
# Entwicklung mit automatischem Reload
npm run dev

# Produktion
npm start
```

Die Anwendung läuft standardmäßig auf `http://localhost:3000`.

## Datenmodell

- `Filament`
  - Stammdaten (Name, Hersteller, Material, Durchmesser, Dichte, Standort …)
  - `gramsPerMeter` aus Durchmesser & Dichte berechnet
  - `colorsHex` als JSON-Array beliebiger HEX-Codes
  - Archivierung via Flag `archived`
- `UsageLog`
  - Jede Verbrauchsbuchung mit Quelle (`manual`, `gcode`, `restock` …)
  - Automatisch bei G-Code-Analyse und Nachladen

## Multi-Color HEX System

- Farben werden als HEX-Codes (z. B. `#ff8800`) gespeichert
- UI erlaubt beliebige Anzahl an Farben
- Anzeige als Swatches und farbige Tags

## Archiv-System

- Archivierte Spulen sind ausgegraut und standardmäßig ausgeblendet
- Toggle „Archivierte anzeigen“ lädt beide Zustände via API
- Archivierung/Restore über REST-Endpunkte und UI-Buttons

## G-Code Logik

- Streaming-Parser extrahiert Header-Werte (`filament used`, `MATERIAL_USED_MM`)
- Erkennung von M82/M83 (absolute/relative Extrusion)
- M200 (volumetrischer Modus) wird berücksichtigt
- Positive ΔE summiert (Retracts werden ignoriert)
- Verbrauch wird bevorzugt aus Headern berechnet, sonst aus Fallbacks
- Automatische Buchung auf gewählte Spule inkl. Log-Eintrag

## Label-Druck (DYMO 89×36 mm)

1. Öffne `/print/label/:id`
2. Prüfe Barcode, QR-Code und Metadaten
3. Klicke auf „Label drucken“ → Browser-Printdialog
4. Wähle DYMO LabelWriter 550 und Format 89×36 mm

## Screenshots (Platzhalter)

- Übersicht: `docs/screenshot-overview.png`
- Neue Spule: `docs/screenshot-new.png`
- Labeldruck: `docs/screenshot-label.png`

## Weitere Hinweise

- API ist unter `/api/...` erreichbar und liefert JSON
- Sprachumschaltung via `?lang=` und Cookie
- Barcodes/QR-Codes werden on-the-fly erzeugt
- Multer-Upload speichert G-Code kurzzeitig im Temp-Verzeichnis

