import { parseColorConfig, buildColorSwatches } from './colorConfig.js';

export function buildLabelData(filament, { barcodeUrl, qrUrl, dimensions }) {
  if (!filament) {
    return null;
  }

  const colorConfig = parseColorConfig(filament.colorsHex);
  const colors = buildColorSwatches(colorConfig);

  return {
    id: filament.id,
    name: filament.name,
    manufacturer: filament.manufacturer,
    material: filament.material,
    diameterMm: Number(filament.diameterMm),
    colors,
    netWeightG: filament.netWeightG,
    remainingG: Number(filament.remainingG),
    barcodeUrl,
    qrUrl,
    barcodeWidthPx: dimensions?.barcodeWidthPx,
    barcodeHeightPx: dimensions?.barcodeHeightPx,
    barcodeWidthMm: dimensions?.barcodeWidthMm,
    barcodeHeightMm: dimensions?.barcodeHeightMm,
    qrSizePx: dimensions?.qrSizePx,
    qrSizeMm: dimensions?.qrSizeMm
  };
}

