# Icon-Setup für FilaHub

## Aktuelle Icon-Dateien

Alle PNG-Dateien befinden sich in `assets/icons/`:
- `Filahub8.png` - 8x8 px
- `Filahub16.png` - 16x16 px
- `Filahub32.png` - 32x32 px
- `Filahub64.png` - 64x64 px
- `Filahub128.png` - 128x128 px
- `Filahub256.png` - 256x256 px
- `Filahub512.png` - 512x512 px
- `Filahub1024.png` - 1024x1024 px
- `Filahub2048.png` - 2048x2048 px
- `Filahub4096.png` - 4096x4096 px

## Windows (.ico)

**Benötigt:** `assets/icons/app.ico` (Multi-Resolution)

### Option 1: Mit ImageMagick (empfohlen)

1. ImageMagick installieren: https://imagemagick.org/script/download.php
2. Script ausführen:
   ```powershell
   powershell.exe -ExecutionPolicy Bypass -File scripts\create-ico.ps1
   ```

### Option 2: Online-Tool

1. Gehe zu https://convertio.co/png-ico/ oder https://icoconvert.com/
2. Lade `Filahub256.png` hoch
3. Wähle Multi-Resolution (16x16, 32x32, 48x48, 256x256)
4. Lade `app.ico` herunter
5. Speichere in `assets/icons/app.ico`

### Option 3: Manuell mit GIMP/Photoshop

1. Öffne die PNG-Dateien in GIMP/Photoshop
2. Exportiere als .ico mit mehreren Größen (16, 32, 48, 256)
3. Speichere als `assets/icons/app.ico`

## macOS (.icns)

**Benötigt:** `assets/icons/app.icns`

### Erstellung mit `iconutil` (macOS):

```bash
# Erstelle iconset-Verzeichnis
mkdir app.iconset

# Kopiere PNG-Dateien in die richtigen Größen
cp Filahub16.png app.iconset/icon_16x16.png
cp Filahub32.png app.iconset/icon_16x16@2x.png
cp Filahub32.png app.iconset/icon_32x32.png
cp Filahub64.png app.iconset/icon_32x32@2x.png
cp Filahub128.png app.iconset/icon_128x128.png
cp Filahub256.png app.iconset/icon_128x128@2x.png
cp Filahub256.png app.iconset/icon_256x256.png
cp Filahub512.png app.iconset/icon_256x256@2x.png
cp Filahub512.png app.iconset/icon_512x512.png
cp Filahub1024.png app.iconset/icon_512x512@2x.png

# Erstelle .icns
iconutil -c icns app.iconset

# Verschiebe nach assets/icons/
mv app.icns assets/icons/app.icns
rm -rf app.iconset
```

## Linux (.png oder .svg)

**Benötigt:** `assets/icons/app.png` (512x512) oder `app.svg`

Für Linux reicht eine große PNG-Datei:
```bash
cp Filahub512.png assets/icons/app.png
```

Oder verwende ein SVG für bessere Skalierung.

## Verwendung

- **Windows Installer**: Verwendet automatisch `assets/icons/app.ico`
- **Windows .exe**: Verwendet `Filahub256.png` (wird in .exe eingebettet)
- **macOS**: Wird später für den macOS-Installer verwendet
- **Linux**: Wird später für den Linux-Installer verwendet

