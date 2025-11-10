# Filament Inventory / Filament Inventar

Zweisprachige Dokumentation (Deutsch & Englisch). Die Anwendung verwaltet 3D-Druck-Filamentspulen, analysiert G-Code und erstellt DYMO-kompatible Etiketten mit Barcode/QR-Code.

---

## 🇩🇪 Deutsch

### Funktionen

- Express REST-API & Web-UI (reines HTML/CSS/JS, kein Frontend-Framework)
- SQLite-Datenbank via Prisma ORM (`./data/filament.db`)
- Komplettes Spulen-Lifecycle: Anlegen, Verbrauch buchen, Nachladen, Archivieren
- Mehrsprachigkeit via `lang/lang.json` & `i18n.js`
- G-Code-Analyse (Header, M82/M83, M200, ΔE-Berechnung)
- Automatische Verbrauchsbuchung nach Upload
- Barcode (Code128) & QR-Code via `bwip-js` und `qrcode`
- DYMO LabelWriter 550 Layout (89×36 mm) inkl. 1D/2D-Auswahl
- Inventuransicht mit Soll/Ist-Abgleich & PDF-Export (PDFKit)
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
```

1. `.env.example` nach `.env` kopieren.
2. `BASE_URL`, `PORT` etc. bei Bedarf anpassen.
3. Start mit `npm run dev` (Auto-Reload) oder `npm start`.
4. Anwendung läuft standardmäßig auf `http://localhost:3000`.

### Datenmodell

- **Filament**
  - Stammdaten (Name, Hersteller, Material, Durchmesser, Dichte, Standort, Notizen, Preis, Produktlink)
  - `gramsPerMeter` automatisch berechnet
  - `colorsHex` als JSON-kodierte Liste von HEX-Farben
  - Archiv-Flag für inaktive Spulen
- **UsageLog**
  - Protokolliert jede Verbrauchsbuchung (`manual`, `gcode`, `restock`, …)
  - Automatische Einträge nach G-Code-Analyse & Nachladen

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

### Screenshots (Platzhalter)

- Übersicht: `docs/screenshot-overview.png`
- Neues Filament: `docs/screenshot-new.png`
- Labeldruck: `docs/screenshot-label.png`

### Weitere Hinweise

- REST-Endpunkte unter `/api/...`
- Sprachumschaltung via `?lang=` oder Cookie
- G-Code-Uploads werden per Multer temporär gespeichert
- Startskript `start-filament.bat` installiert Abhängigkeiten, führt Migrationen aus und startet den Server

### Aktuelle Änderungen (2025-11)

- Farbverwaltung komplett überarbeitet: Einzel-Varianten (Normal, Glow, Mehrfarbig, Neon, Transparent) mit dynamischen Panels, Vorschau und Debug-Panel im „Filament bearbeiten“-Dialog.
- Formulare schützen Checkboxen gegen versehentliches Deaktivieren beim Arbeiten im Panel; Debug-Ausgabe zeigt live die gespeicherte `colorConfig`.
- Einstellungen bieten nun konfigurierbare Pflichtfelder, Einheiten (mm↔inch, g↔oz/lb) **und** DYMO-Labeldimensionen (Barcode-/QR-Größe in mm bzw. inch).
- Barcodes werden für den DYMO-Druck als echte SVGs gerendert (lokale `drawingSvg`-Implementierung) und respektieren die eingestellten Maße.
- Detail- und Labelansicht zeigen HEX-Werte, Glow-/Transparent-Badges sowie GLOW-Hervorhebung.
- Neues Mengenfeld pro Filament inklusive Gesamtübersicht in der Tabelle.
- Inventur-Seite mit Soll/Ist-Abgleich, Summenkarten und PDF-Export per PDFKit.
- Lösch-Button in der Übersicht (mit Bestätigung) entfernt Spulen dauerhaft via `DELETE /api/filaments/:id`.

---

## 🇬🇧 English

### Features

- Express REST API & lightweight web UI (pure HTML/CSS/JS)
- SQLite database via Prisma ORM (`./data/filament.db`)
- Full spool lifecycle: create, log usage, restock, archive
- Multi-language UI powered by `lang/lang.json` & `i18n.js`
- G-code analysis (header parsing, M82/M83, M200, ΔE calculation)
- Automatic usage booking after upload
- Code128 barcodes (bwip-js) & QR codes (`qrcode`)
- DYMO LabelWriter 550 layout (89×36 mm) with 1D/2D toggle
- Inventory view with expected vs. counted reconciliation & PDF export (PDFKit)
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
```

1. Copy `.env.example` → `.env`.
2. Adjust `BASE_URL`, `PORT` if required.
3. Development server: `npm run dev` (nodemon).
4. Production mode: `npm start`.
5. App runs on `http://localhost:3000` by default.

### Data Model

- **Filament**
  - Core metadata (name, manufacturer, material, diameter, density, location, notes, price, product URL)
  - `gramsPerMeter` auto-calculated
  - `colorsHex` stored as JSON list of HEX values
  - Archive flag to hide inactive spools
- **UsageLog**
  - Tracks every usage booking (`manual`, `gcode`, `restock`, …)
  - Entries are created automatically after G-code analysis & restock

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

### Screenshots (placeholders)

- Overview: `docs/screenshot-overview.png`
- New Filament: `docs/screenshot-new.png`
- Label printing: `docs/screenshot-label.png`

### Additional Notes

- API endpoints available under `/api/...`
- Language switching via `?lang=` parameter or cookie
- Multer stores uploaded G-code temporarily
- `start-filament.bat` automates install → migrate → run workflow

### Latest updates (2025-11)

- Revamped colour management: individual variants (normal, glow, multicolour, neon, transparent) with dynamic panels, live preview and an admin-only debug panel in the edit form.
- Form logic keeps checkboxes from toggling while working inside panels; debug output mirrors the `colorConfig` currently stored.
- Settings page now lets you configure required/optional fields, measurement units (mm↔inch, g↔oz/lb) **and** DYMO label dimensions (barcode / QR size in mm or inch).
- Barcodes are rendered as true SVG via a local `drawingSvg` helper so the printed size honours the configured dimensions.
- Detail and label views display HEX values, glow/transparent badges, and highlight glow colours for quick visual verification.
- Added quantity tracking per filament (including total roll counter).
- New inventory dashboard with expected vs. counted reconciliation, summary cards and PDF export via PDFKit.
- Delete action in the overview (with confirmation) removes spools permanently through `DELETE /api/filaments/:id`.

---

Viel Spaß beim Verwalten deiner Filament-Spulen! / Happy printing! 🎉

