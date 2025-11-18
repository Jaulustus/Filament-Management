# Filament Inventory / Filament Inventar

Zweisprachige Dokumentation (Deutsch & Englisch). Die Anwendung verwaltet 3D-Druck-Filamentspulen, analysiert G-Code und erstellt DYMO-kompatible Etiketten mit Barcode/QR-Code.

---

## 🇩🇪 Deutsch

### Funktionen

- Interaktive Startseite mit Moduswahl (Filament Manager ↔ Inventur System) über `Start Programm.bat`
- Express REST-API & Web-UI (reines HTML/CSS/JS, kein Frontend-Framework)
- SQLite-Datenbank via Prisma ORM (`./data/filament.db`)
- Komplettes Spulen-Lifecycle: Anlegen, Verbrauch buchen, Nachladen, Archivieren
- Mehrsprachigkeit via `lang/lang.json` & `i18n.js`
- G-Code-Analyse (Header, M82/M83, M200, ΔE-Berechnung)
- Automatische Verbrauchsbuchung nach Upload
- Barcode (Code128) & QR-Code via `bwip-js` und `qrcode`
- DYMO LabelWriter 550 Layout (89×36 mm) inkl. 1D/2D-Auswahl
- Inventurmodul mit Produktdatenbank (EAN, Besonderheiten, Bilder) inkl. PDF-Inventurbericht (PDFKit)
- Bereichs-/Raumverwaltung (z. B. Lager, Verkauf, Buffet) mit Farblogik für Bestände
- Scanner-Workflow in „Inventur durchführen“ (EAN oder interner Code) inkl. Ampelsystem
- Modal-Dialog für Barcode/QR-Code (Anzeige & Direktdruck) in beiden Modulen
- Farbverwaltung mit beliebig vielen HEX-Werten pro Spule

### Voraussetzungen

| Komponente | Version/Info | Zweck |
|------------|--------------|-------|
| Node.js | ≥ 18 | Runtime |
| npm | ≥ 9 | Paketverwaltung |
| SQLite | Bestandteil von Node | Persistente Datenbank (`data/filament.db`) |
| DYMO LabelWriter 550 Treiber | aktuell | Etikettendruck |
| Git (optional) | aktuelle Version | Deployment/Versionskontrolle |

### Installation & Setup

```bash
npm install
npx prisma generate
npx prisma migrate dev --name init
# bei bestehenden Installationen nach Updates:
# npx prisma migrate dev --name add-quantity-field
# npx prisma migrate dev --name add-inventory-items
# npx prisma migrate dev --name add-inventory-area
```

1. `.env.example` nach `.env` kopieren.
2. `BASE_URL`, `PORT` etc. bei Bedarf anpassen.
3. Entwicklung: `npm run dev` (Auto-Reload). Produktion: `npm start`.
4. Alternativ `Start Programm.bat` ausführen → Modus wählen → der Server startet automatisch (inkl. `npm install`/Prisma deploy beim ersten Lauf).
5. Anwendung läuft standardmäßig auf `http://localhost:3000`.

### Datenmodell

- **Filament**
  - Stammdaten (Name, Hersteller, Material, Durchmesser, Dichte, Standort, Notizen, Preis, Produktlink)
  - `gramsPerMeter` automatisch berechnet
  - `colorsHex` als JSON-kodierte Liste von HEX-Farben
  - Archiv-Flag für inaktive Spulen
- **UsageLog**
  - Protokolliert jede Verbrauchsbuchung (`manual`, `gcode`, `restock`, …)
  - Automatische Einträge nach G-Code-Analyse & Nachladen
- **InventoryItem**
  - Produktname, optionaler EAN-Code, automatisch generierter interner Code
  - Stückzahl & Stückpreis (Summen werden on-the-fly berechnet)
  - Besonderheiten (Gewicht/Liter), Bild-URL oder hochgeladene PNG/JPG
  - Archivierungsstatus, automatische Timestamps

### Multi-Color System

- HEX-Farben (`#ff8800`) per Farbwähler hinzufügen
- Varianten können Grundfarbe, optionale Leuchtfarbe sowie Transparenz enthalten
- Darstellung als Badges/Swatches in Listen-, Detail- und Label-Ansicht

### Archiv-System

- Archivierte Spulen sind abgeschwächt dargestellt und per Toggle einblendbar
- Aktionen: Archivieren, Wiederherstellen, Label drucken, Nachladen

### G-Code Analyse

- Streaming-Parser, erkennt:
  - `; filament used =`, `; filament used [g] =`, `MATERIAL_USED_MM`
  - Extrusionsmodus M82/M83
  - volumetrischer Modus M200
- Berechnet nur positive ΔE-Werte (Retracts werden ignoriert)
- Fallback auf Längen-/Volumenberechnung
- Optionaler automatischer Log-Eintrag und Restgewichts-Update

### Label-Druck (DYMO 89×36 mm)

1. `POST /api/filaments` oder Formular „Neues Filament“ ausfüllen.
2. Über „Label-Vorschau“ Barcode (1D), QR (2D) oder beide wählen.
3. `/print/label/:id?type=1d|2d|both` öffnen.
4. Browserdruck (`Strg+P`) → DYMO LabelWriter 550, Format 89×36 mm.

### Inventurmodul

- Neues Produkt anlegen:
  - EAN-Code scannen oder manuell eingeben (optional)
  - Automatischer Bilder-Import via OpenFoodFacts (Fallback: Upload/Bild-URL)
  - Interner Code wird erzeugt, falls kein EAN vorhanden ist
  - Bereich (Lager, Verkaufsfläche, Regal…) frei wählbar
- Übersicht:
  - Produktname, EAN, Einzelpreis, Gesamtwert, Stückzahl
  - Aktionen: Menge ändern, archivieren, löschen, Codes anzeigen/drucken
  - Bereichsfilter + Bild-Spalte
- Inventur (Audit):
  - Soll-/Ist-Abgleich mit Summenkarten
  - Live-Farblogik (rot/gelb/grün/schwarz) je nach Bestand
  - Such-/Scanfeld (EAN oder interner Code) zum direkten Anspringen
  - PDF-Export (inkl. Bilder, Bereich, Summenübersicht)

### Screenshots (Platzhalter)

- Übersicht: `docs/screenshot-overview.png`
- Neues Filament: `docs/screenshot-new.png`
- Labeldruck: `docs/screenshot-label.png`

### Weitere Hinweise

- REST-Endpunkte unter `/api/...`
- Sprachumschaltung via `?lang=` oder Cookie
- G-Code-Uploads werden per Multer temporär gespeichert
- Bild-Uploads für das Inventurmodul liegen unter `/uploads/inventory`
- `Start Programm.bat` installiert Abhängigkeiten, führt Prisma-Migrationen aus und startet den Server inkl. Moduswahl
- Barcode-/QR-Modals können direkt gedruckt werden (separates Fenster mit beiden Codes)
- Globale Einstellungen (`/settings`) verwalten Währung, Einheiten, Etikettengrößen und Inventurbereiche
- Optionaler Schalter: Filament-Spulen im Inventurbericht berücksichtigen (nur wenn gewünscht)

### Bedienungsanleitung

**Allgemein**
- `Start Programm.bat` ausführen und gewünschten Modus wählen (Filament Manager oder Inventur System). Bei `APP_MODE=both` dient die Landing-Page als Umschaltzentrale.
- Sprache jederzeit oben rechts wechseln (`DE`/`EN`).
- Unter „Einstellungen“ legst du Etikettengrößen, Einheiten, Pflichtfelder und Inventurbereiche (ein Bereich pro Zeile) fest.

**Filament Manager**
- Über die Landing-Page `Filament Manager öffnen` oder den Menüpunkt `Filamentliste`.
- `Filamentliste`: Suchfeld, Archiv-Toggle, Gesamtmenge sowie Aktionen pro Zeile (Nachfüllen, Codes anzeigen, Archivieren/Wiederherstellen, Löschen).
- `Codes anzeigen`: Modal mit Strichcode/QR-Code, Druckknöpfe für „beide“, „nur QR“ oder „nur Barcode“.
- `Neues Filament`: Formular mit Farbvarianten, dynamischen Pflichtfeldern und Label-Vorschau; Speichern erzeugt sofort druckbare Codes.
- Detailansicht: vollständige Filamentdaten, Nutzungshistorie, Aktionen (Bearbeiten, Codes, Restock, Archivierung).

**Inventur System**
- Landing-Button `Inventur System öffnen` oder Navigationseintrag `Übersicht`.
- `Übersicht`: Tabelle mit Bildern, Bereich, EAN/interner Code, Preisen und Mengen. Bereichsfilter (Dropdown) und Archiv-Schalter kombinierbar; Aktionen umfassen Bearbeiten, Codes, Menge ändern, Archivieren/Wiederherstellen, Löschen.
- `Neues Produkt`: EAN scannen oder eingeben, Bereich aus Vorschlagsliste wählen oder neu tippen, Besonderheit hinterlegen. Bilder via Upload, URL oder Auto-Fetch (OpenFoodFacts). Interner Code wird automatisch erzeugt, wenn keine EAN vorhanden ist.
- `Produkt bearbeiten`: Stammdaten, Bilder und Bereiche aktualisieren oder entfernen.
- `Inventur durchführen`: Scanner-/Suchfeld (ENTER) springt direkt zur Zeile. Farblogik der Eingabefelder (grün >7, gelb 6–3, rot 3–1, schwarz 0). Summenkarten aktualisieren live; PDF-Export erstellt Bericht inkl. Bildern, Bereichen und Abweichungen. Optional lassen sich Filament-Spulen einblenden.
- `Codes anzeigen`: Für jedes Produkt identisch zum Filament-Modul verfügbar.

### Aktuelle Änderungen (2025-11)

- Interaktive Landing Page mit Credits, Easter Eggs und direkter Moduswahl
- `Start Programm.bat` ersetzt das frühere Skript und fragt beim Launch den gewünschten Modus ab
- Barcode-/QR-Code-Modals mit Direktdruck in Filament- und Inventur-Ansichten
- Inventurmodul erweitert (Prisma-Tabelle, OpenFoodFacts-Bilder, interne Codes, PDF-Inventur)
- Inventur-Bereiche + Scanner-Eingabe mit Farblogik (Audit & Übersicht)
- Filamentliste ausgelagert nach `filament_overview.html`, Landing zeigt zuletzt aktualisierte Spulen
- Farbverwaltung mit Normal/Glow/Multicolor/Neon/Transparent bleibt erhalten

---

## 🇬🇧 English

### Features

- Interactive landing page (choose Filament Manager or Inventory System) launched via `Start Programm.bat`
- Express REST API & lightweight web UI (pure HTML/CSS/JS)
- SQLite database via Prisma ORM (`./data/filament.db`)
- Full spool lifecycle: create, log usage, restock, archive
- Multi-language UI powered by `lang/lang.json` & `i18n.js`
- G-code analysis (header parsing, M82/M83, M200, ΔE calculation)
- Automatic usage booking after upload
- Code128 barcodes (bwip-js) & QR codes (`qrcode`)
- DYMO LabelWriter 550 layout (89×36 mm) with 1D/2D toggle
- Inventory module for generic stock (EAN, internal codes, images, PDF inventory audit)
- Area/room assignment (e.g. storage, shop floor, buffet) with colour-coded stock status
- Scanner workflow inside “Inventory audit” (EAN or internal code) incl. traffic-light indicators
- Modal dialog for displaying/printing barcode + QR code in both modules
- Multi-color HEX support for each spool

### Requirements

| Component | Version/Info | Purpose |
|-----------|--------------|---------|
| Node.js | ≥ 18 | Runtime environment |
| npm | ≥ 9 | Package manager |
| SQLite | bundled with Node | Persists data (`data/filament.db`) |
| DYMO LabelWriter 550 Driver | latest | Label printing |
| Git (optional) | latest | Version control/deployment |

### Installation & First Run

```bash
npm install
npx prisma generate
npx prisma migrate dev --name init
# on existing setups after updates:
# npx prisma migrate dev --name add-quantity-field
# npx prisma migrate dev --name add-inventory-items
# npx prisma migrate dev --name add-inventory-area
```

1. Copy `.env.example` → `.env`.
2. Adjust `BASE_URL`, `PORT` if required.
3. Development server: `npm run dev` (nodemon).
4. Production mode: `npm start`.
5. Alternatively run `Start Programm.bat`, choose the desired mode, and let the script handle install + migrations + server start.
6. App runs on `http://localhost:3000` by default.

### Data Model

- **Filament**
  - Core metadata (name, manufacturer, material, diameter, density, location, notes, price, product URL)
  - `gramsPerMeter` auto-calculated
  - `colorsHex` stored as JSON list of HEX values
  - Archive flag to hide inactive spools
- **UsageLog**
  - Tracks every usage booking (`manual`, `gcode`, `restock`, …)
  - Entries are created automatically after G-code analysis & restock
- **InventoryItem**
  - Product name, optional EAN, automatically generated internal code
  - Quantity & unit price (totals calculated on the fly)
  - Special notes (weight/litre), image URL or uploaded PNG/JPG
  - Archive flag plus timestamps

### Multi-Color HEX System

- Add unlimited HEX colors using the color picker
- Variants support base color, optional glow color and transparency flag
- Swatches & badges across list, detail and label preview pages

### Archive Workflow

- Archived spools show dimmed styling and can be toggled via UI
- Actions include archive/unarchive, restock, reprint label, duplicate

### G-Code Logic

- Streaming parser detects:
  - `; filament used =`, `; filament used [g] =`, `MATERIAL_USED_MM`
  - M82/M83 extrusion mode
  - M200 volumetric mode
- Sums positive ΔE only, ignores retracts
- Falls back to length/volume calculations when needed
- Writes usage logs and updates remaining weight automatically

### Label Printing (DYMO 89×36 mm)

1. Create or select a filament.
2. Use “Preview Label” to pick 1D, 2D or both codes.
3. Open `/print/label/:id?type=1d|2d|both`.
4. Print via browser (`Ctrl+P`) → choose DYMO LabelWriter 550, layout 89×36 mm.

### Inventory Module

- New product form:
  - Scan/type EAN (optional)
  - Auto-fetch product imagery via OpenFoodFacts (fallback: upload or external URL)
  - Generates a printable internal code when no EAN is provided
  - Assign any “area” (storage, sales floor, shelf …)
- Overview:
  - Shows name, EAN/internal code, unit price, total value, quantity
  - Actions: adjust quantity, archive/unarchive, delete, open code modal for printing
  - Area filter + dedicated image column
- Audit:
  - Compare expected vs. counted quantities
  - Live colour feedback (red/yellow/green/black) depending on stock level
  - Search/scan field (EAN or internal code) to jump straight to a product
  - Export PDF summary (includes images, area column, totals)

### Screenshots (placeholders)

- Overview: `docs/screenshot-overview.png`
- New Filament: `docs/screenshot-new.png`
- Label printing: `docs/screenshot-label.png`

### Additional Notes

- API endpoints available under `/api/...`
- Language switching via `?lang=` parameter or cookie
- Multer stores uploaded G-code temporarily; inventory images live in `/uploads/inventory`
- `Start Programm.bat` automates install → migrate → run workflow (with interactive mode selection)
- Barcode/QR modals allow instant preview + print across the app
- Inventory areas + scanner-driven audit workflow with colour feedback
- Global settings (`/settings`) cover units, currency, label sizes and inventory areas
- Optional toggle: include filament spools in the inventory report when needed
- Windows build scripts: see `scripts/build-windows.ps1` + `installer/windows/setup.iss`

### User Guide

**General**
- Run `Start Programm.bat` and pick the desired mode (Filament Manager or Inventory System). With `APP_MODE=both` the landing page is your switchboard.
- Change the interface language at any time via the top-right toggle (`DE`/`EN`).
- Use `Settings` to configure label dimensions, currency/units, required fields and to maintain the list of inventory areas (one per line).
- Packaging: run `scripts/build-windows.ps1` to prepare `dist/windows/app`; build installer via Inno Setup (`installer/windows/setup.iss`)

**Filament Manager**
- From the landing page choose `Open Filament Manager` or use the nav item `Filament Overview`.
- `Filament Overview`: search box, archive toggle, total quantity and per-row actions (restock, show codes, archive/unarchive, delete).
- `Show codes`: opens the barcode/QR modal with print buttons for “both”, “QR only” or “barcode only”.
- `New Filament`: complete the dynamic form (colour variants, mandatory fields, label preview); saving instantly creates printable codes.
- Filament detail view: shows full metadata, usage history and provides actions for editing, code modal, restocking and archiving.

**Inventory System**
- Choose `Open Inventory System` (landing) or the nav entry `Overview`.
- `Overview`: table with product image, area, EAN/internal code, prices and quantity; filter by area, toggle archived items, actions include edit, codes, change quantity, archive/unarchive, delete.
- `New Product`: scan/enter EAN, select or type an area (suggestions available), add “special notes”, upload an image or auto-fetch via OpenFoodFacts. Internal codes are auto-generated when no EAN exists.
- `Edit Product`: adjust metadata, swap/remove images, update areas.
- `Conduct Inventory`: scan/type a code and press ENTER to jump to the row. Quantity inputs are colour-coded (green >7, yellow 6–3, red 3–1, black 0). Summary cards update live; export generates a PDF with images, areas and differences. Filament spools can be included via settings if desired.
- `Show codes`: same modal experience as in the filament module for every product.

### Latest updates (2025-11)

- Interactive landing page with credits, Easter eggs, and quick mode selection
- `Start Programm.bat` prompts for Filament vs. Inventory mode during launch
- Barcode/QR modal with direct print support throughout the application
- Expanded inventory module (Prisma table, OpenFoodFacts imagery, internal barcodes, PDF audit)
- Filament list moved to `filament_overview.html`; landing highlights recently updated spools
- Enhanced colour management (normal/glow/multicolour/neon/transparent) retained

---

Viel Spaß beim Verwalten deiner Filament-Spulen! / Happy printing! 🎉

### Windows Packaging

1. `powershell.exe -ExecutionPolicy Bypass -File scripts/build-windows.ps1` – erzeugt `dist/windows/app` inkl. Produktions-Abhängigkeiten.
2. Lizenztext anpassen (`installer/windows/license.txt`).
3. Optional: Node.js-Installer (`node-setup.msi`) in `installer/windows/` ablegen, um fehlendes Node automatisch zu installieren.
4. Inno Setup installieren (https://jrsoftware.org/isinfo.php).
5. `installer/windows/setup.iss` in Inno Setup öffnen und `Build` ausführen.
6. Ergebnis: `dist/windows/installer/FilamentManagementSetup.exe` (Desktop-Verknüpfung zeigt auf `Start Programm.bat`).
7. Optional: Node-Installer wird nur ausgeführt, wenn er beigelegt ist und auf dem Zielsystem kein `node` gefunden wird.

### Release-Checkliste

1. Projekt bauen: `npm run build` (falls vorhanden) bzw. Tests ausführen.
2. PowerShell-Skript: `powershell.exe -ExecutionPolicy Bypass -File scripts/build-windows.ps1`.
3. Inno Setup öffnen (`installer/windows/setup.iss`) und Installer bauen.
4. Ergebnis (`dist/windows/installer/FilamentManagementSetup.exe`) testen (frische VM).
5. Optional: Prüfen, ob Node.js mitgeliefert/erkannt wird.
6. Dateien signieren (sofern Zertifikate vorhanden).
7. Release-Notizen verfassen und Setup + Checksums auf GitHub veröffentlichen.

