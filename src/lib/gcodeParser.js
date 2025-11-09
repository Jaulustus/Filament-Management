import fs from 'fs';
import readline from 'readline';

const HEADER_REGEX = {
  filamentUsedM: /;\s*filament\s+used\s*=\s*([0-9.+-eE]+)/i,
  filamentUsedG: /;\s*filament\s+used\s*\[g\]\s*=\s*([0-9.+-eE]+)/i,
  materialUsedMm: /;?\s*MATERIAL_USED_MM\s*:\s*([0-9.+-eE]+)/i
};

const EXTRUSION_REGEX = /E(-?\d*\.?\d+(?:[eE][+-]?\d+)?)/;

export async function parseGcode(filePath) {
  const stream = fs.createReadStream(filePath, { encoding: 'utf8' });
  const rl = readline.createInterface({ input: stream, crlfDelay: Infinity });

  const header = {
    filamentUsedM: null,
    filamentUsedG: null,
    materialUsedMm: null
  };

  let absoluteExtrusion = true;
  let volumetric = false;
  let lastE = 0;
  let totalExtrusion = 0;
  let hasExtrusion = false;

  for await (const rawLine of rl) {
    const line = rawLine.trim();

    if (line.length === 0) {
      continue;
    }

    if (line.startsWith(';')) {
      if (header.filamentUsedM === null) {
        const match = line.match(HEADER_REGEX.filamentUsedM);
        if (match) {
          header.filamentUsedM = parseFloat(match[1]);
        }
      }
      if (header.filamentUsedG === null) {
        const match = line.match(HEADER_REGEX.filamentUsedG);
        if (match) {
          header.filamentUsedG = parseFloat(match[1]);
        }
      }
      if (header.materialUsedMm === null) {
        const match = line.match(HEADER_REGEX.materialUsedMm);
        if (match) {
          header.materialUsedMm = parseFloat(match[1]);
        }
      }
    }

    if (/^M82\b/i.test(line)) {
      absoluteExtrusion = true;
    }
    if (/^M83\b/i.test(line)) {
      absoluteExtrusion = false;
    }
    if (/^M200\b/i.test(line)) {
      const sMatch = line.match(/S(-?\d*\.?\d+(?:[eE][+-]?\d+)?)/i);
      if (!sMatch) {
        volumetric = true;
      } else {
        const val = parseFloat(sMatch[1]);
        volumetric = val > 0;
      }
    }

    if (/^G0?1\b/i.test(line) || /\sG0?1\b/i.test(line)) {
      const eMatch = line.match(EXTRUSION_REGEX);
      if (eMatch) {
        const currentE = parseFloat(eMatch[1]);
        if (!Number.isNaN(currentE)) {
          let delta = 0;
          if (absoluteExtrusion) {
            delta = currentE - lastE;
            lastE = currentE;
          } else {
            delta = currentE;
          }
          if (delta > 0) {
            totalExtrusion += delta;
            hasExtrusion = true;
          }
        }
      }
    }
  }

  rl.close();

  return {
    header,
    absoluteExtrusion,
    volumetric,
    totalExtrusion,
    hasExtrusion
  };
}

