export function buildLabelData(filament, { barcodeUrl, qrUrl }) {
  if (!filament) {
    return null;
  }

  let colors = [];
  if (Array.isArray(filament.colorsHex)) {
    colors = filament.colorsHex;
  } else if (typeof filament.colorsHex === 'string') {
    try {
      const parsed = JSON.parse(filament.colorsHex);
      colors = Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      colors = [];
    }
  }

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
    qrUrl
  };
}

