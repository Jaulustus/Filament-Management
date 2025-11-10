import fs from 'fs';
import path from 'path';

const CONFIG_PATH = path.resolve(process.cwd(), 'data', 'config.json');

export const defaultConfig = {
  currency: 'EUR',
  lengthUnit: 'mm',
  weightUnit: 'g',
  requiredFields: {
    name: true,
    manufacturer: true,
    material: true,
    diameterMm: true,
    netWeightG: true,
    remainingG: true,
    priceNewEUR: false,
    productUrl: false,
    notes: false,
    colorsHex: false
  },
  labelSizes: {
    barcodeWidthMm: 60,
    barcodeHeightMm: 25,
    qrSizeMm: 25
  }
};

function ensureDirectoryExists() {
  const dir = path.dirname(CONFIG_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

export function loadConfig() {
  ensureDirectoryExists();
  try {
    if (!fs.existsSync(CONFIG_PATH)) {
      fs.writeFileSync(CONFIG_PATH, JSON.stringify(defaultConfig, null, 2), 'utf8');
      return { ...defaultConfig };
    }
    const raw = fs.readFileSync(CONFIG_PATH, 'utf8');
    const parsed = JSON.parse(raw);
    return mergeWithDefaults(parsed);
  } catch (error) {
    console.error('Failed to load config.json, falling back to defaults.', error);
    return { ...defaultConfig };
  }
}

export function saveConfig(config) {
  ensureDirectoryExists();
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2), 'utf8');
}

function mergeWithDefaults(config) {
  const merged = { ...defaultConfig, ...config };
  merged.requiredFields = {
    ...defaultConfig.requiredFields,
    ...(config.requiredFields || {})
  };
  merged.labelSizes = {
    ...defaultConfig.labelSizes,
    ...(config.labelSizes || {})
  };
  return merged;
}

export function buildUiMeta(config, fieldDefs = []) {
  const length = config.lengthUnit === 'inch' ? 'inch' : 'mm';
  const weight =
    config.weightUnit === 'oz' ? 'oz' : config.weightUnit === 'lb' ? 'lb' : 'g';
  const requiredFields = {
    ...defaultConfig.requiredFields,
    ...(config.requiredFields || {})
  };
  const requiredList = [];
  const optionalList = [];
  fieldDefs.forEach((def) => {
    if (!def || !def.key) {
      return;
    }
    if (requiredFields[def.key]) {
      requiredList.push(def);
    } else {
      optionalList.push(def);
    }
  });

  const labelSizes = config.labelSizes || defaultConfig.labelSizes;
  const convertLength = (mm) => {
    if (!Number.isFinite(mm) || mm <= 0) {
      return '';
    }
    if (length === 'inch') {
      return Number((mm / 25.4).toFixed(2));
    }
    return Number(mm.toFixed(1));
  };

  return {
    form: {
      currency: config.currency || defaultConfig.currency,
      units: {
        length,
        weight
      },
      requiredFields,
      lists: {
        required: requiredList,
        optional: optionalList
      },
      labelSizes: {
        barcodeWidth: convertLength(labelSizes.barcodeWidthMm),
        barcodeHeight: convertLength(labelSizes.barcodeHeightMm),
        qrSize: convertLength(labelSizes.qrSizeMm)
      }
    }
  };
}

