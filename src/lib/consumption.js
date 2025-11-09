import { parseGcode } from './gcodeParser.js';

export function calculateGramsPerMeter(diameterMm, density) {
  if (!diameterMm || !density) {
    return 0;
  }
  const diameterCm = diameterMm / 10;
  const radiusCm = diameterCm / 2;
  const crossSectionArea = Math.PI * radiusCm * radiusCm;
  const volumePerMeterCm3 = crossSectionArea * 100; // 100 cm in 1 m
  return volumePerMeterCm3 * density;
}

export function gramsFromLength(meters, gramsPerMeter) {
  if (!meters || !gramsPerMeter) {
    return 0;
  }
  return meters * gramsPerMeter;
}

export async function analyseGcode(filePath, filament) {
  const parseResult = await parseGcode(filePath);
  const { header, volumetric, totalExtrusion } = parseResult;

  const gramsPerMeter = filament?.gramsPerMeter ?? calculateGramsPerMeter(filament?.diameterMm, filament?.density);

  // Header-first logic
  if (header.filamentUsedG && header.filamentUsedG > 0) {
    const meters = gramsPerMeter ? header.filamentUsedG / gramsPerMeter : null;
    return {
      grams: header.filamentUsedG,
      meters,
      source: 'header_g',
      parse: parseResult
    };
  }

  if (header.filamentUsedM && header.filamentUsedM > 0) {
    const grams = gramsFromLength(header.filamentUsedM, gramsPerMeter);
    return {
      grams,
      meters: header.filamentUsedM,
      source: 'header_m',
      parse: parseResult
    };
  }

  if (header.materialUsedMm && header.materialUsedMm > 0) {
    const meters = header.materialUsedMm / 1000;
    const grams = gramsFromLength(meters, gramsPerMeter);
    return {
      grams,
      meters,
      source: 'header_mm',
      parse: parseResult
    };
  }

  // Fallbacks
  if (volumetric) {
    const volumeMm3 = totalExtrusion;
    const volumeCm3 = volumeMm3 / 1000;
    const density = filament?.density ?? 1.24; // PLA default
    const grams = volumeCm3 * density;
    return {
      grams,
      meters: gramsPerMeter ? grams / gramsPerMeter : null,
      source: 'fallback_volumetric',
      parse: parseResult
    };
  }

  const lengthMm = totalExtrusion;
  const meters = lengthMm / 1000;
  const grams = gramsFromLength(meters, gramsPerMeter);

  return {
    grams,
    meters,
    source: 'fallback_length',
    parse: parseResult
  };
}

