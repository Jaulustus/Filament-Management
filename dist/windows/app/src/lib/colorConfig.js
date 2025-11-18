function sanitizeHex(value) {
  if (!value) {
    return null;
  }
  let hex = value.toString().trim();
  if (!hex) {
    return null;
  }
  if (!hex.startsWith('#')) {
    hex = `#${hex}`;
  }
  if (hex.length === 4) {
    hex = `#${hex[1]}${hex[1]}${hex[2]}${hex[2]}${hex[3]}${hex[3]}`;
  }
  if (!/^#[0-9a-fA-F]{6}$/.test(hex)) {
    return null;
  }
  return hex.toLowerCase();
}

function defaultColorConfig() {
  return {
    transparent: false,
    normal: { enabled: false, baseHex: null },
    glow: { enabled: false, baseHex: null, glowHex: null },
    multicolor: { enabled: false, colors: [] },
    neon: { enabled: false, colors: [] }
  };
}

function parseLegacyArray(value) {
  const config = defaultColorConfig();
  value.forEach((item) => {
    if (!item) {
      return;
    }
    if (typeof item === 'string') {
      const baseHex = sanitizeHex(item);
      if (baseHex) {
        config.normal.enabled = true;
        config.normal.baseHex = baseHex;
      }
      return;
    }
    if (typeof item === 'object') {
      const baseHex = sanitizeHex(item.baseHex || item.base || item.hex);
      const glowHex = sanitizeHex(item.glowHex || item.glow);
      const transparent = Boolean(item.transparent);
      if (baseHex && glowHex) {
        config.glow.enabled = true;
        config.glow.baseHex = baseHex;
        config.glow.glowHex = glowHex !== baseHex ? glowHex : null;
        if (transparent) {
          config.transparent = true;
        }
        return;
      }
      if (Array.isArray(item.colors)) {
        const colors = item.colors.map((hex) => sanitizeHex(hex)).filter(Boolean);
        if (colors.length) {
          config.multicolor.enabled = true;
          config.multicolor.colors = colors;
          if (transparent || item.transparent === true) {
            config.transparent = true;
          }
        }
        return;
      }
      if (baseHex) {
        config.normal.enabled = true;
        config.normal.baseHex = baseHex;
        if (transparent) {
          config.transparent = true;
        }
      }
    }
  });
  return config;
}

export function parseColorConfig(raw) {
  if (!raw) {
    return defaultColorConfig();
  }

  if (typeof raw === 'string') {
    const trimmed = raw.trim();
    if (!trimmed) {
      return defaultColorConfig();
    }
    try {
      const parsed = JSON.parse(trimmed);
      return parseColorConfig(parsed);
    } catch (error) {
      if (trimmed.includes(',')) {
        const colors = trimmed.split(',').map((item) => sanitizeHex(item)).filter(Boolean);
        if (colors.length) {
          const config = defaultColorConfig();
          config.multicolor.enabled = true;
          config.multicolor.colors = colors;
          return config;
        }
        return defaultColorConfig();
      }
      const baseHex = sanitizeHex(trimmed);
      if (baseHex) {
        const config = defaultColorConfig();
        config.normal.enabled = true;
        config.normal.baseHex = baseHex;
        return config;
      }
      return defaultColorConfig();
    }
  }

  if (Array.isArray(raw)) {
    return parseLegacyArray(raw);
  }

  if (typeof raw === 'object') {
    if (raw.normal || raw.glow || raw.multicolor || raw.neon || typeof raw.transparent === 'boolean') {
      const config = defaultColorConfig();
      if (raw.transparent === true) {
        config.transparent = true;
      }
      if (raw.normal && typeof raw.normal === 'object') {
        const baseHex = sanitizeHex(raw.normal.baseHex || raw.normal.base || raw.normal.hex);
        if (baseHex) {
          config.normal.enabled = true;
          config.normal.baseHex = baseHex;
        }
      }
      if (raw.glow && typeof raw.glow === 'object') {
        const baseHex = sanitizeHex(raw.glow.baseHex || raw.glow.base);
        const glowHex = sanitizeHex(raw.glow.glowHex || raw.glow.glow);
        if (baseHex) {
          config.glow.enabled = true;
          config.glow.baseHex = baseHex;
          config.glow.glowHex = glowHex && glowHex !== baseHex ? glowHex : null;
        }
        if (raw.glow.transparent === true) {
          config.transparent = true;
        }
      }
      if (raw.multicolor && typeof raw.multicolor === 'object') {
        const colors = Array.isArray(raw.multicolor.colors)
          ? raw.multicolor.colors.map((hex) => sanitizeHex(hex)).filter(Boolean)
          : [];
        if (colors.length) {
          config.multicolor.enabled = true;
          config.multicolor.colors = colors;
        }
        if (raw.multicolor.transparent === true) {
          config.transparent = true;
        }
      }
      if (raw.neon && typeof raw.neon === 'object') {
        const colors = Array.isArray(raw.neon.colors)
          ? raw.neon.colors.map((hex) => sanitizeHex(hex)).filter(Boolean)
          : [];
        if (colors.length) {
          config.neon.enabled = true;
          config.neon.colors = colors;
        }
      }
      return config;
    }
    if (raw.colorsHex) {
      return parseColorConfig(raw.colorsHex);
    }
  }

  return defaultColorConfig();
}

export function stringifyColorConfig(config) {
  const normalised = parseColorConfig(config);
  const hasData =
    normalised.transparent ||
    (normalised.normal.enabled && normalised.normal.baseHex) ||
    (normalised.glow.enabled && normalised.glow.baseHex) ||
    (normalised.multicolor.enabled && normalised.multicolor.colors.length) ||
    (normalised.neon.enabled && normalised.neon.colors.length);

  if (!hasData) {
    return null;
  }

  return JSON.stringify(normalised);
}

export function buildColorSwatches(config) {
  const normalised = parseColorConfig(config);
  const entries = [];

  if (normalised.normal.enabled && normalised.normal.baseHex) {
    entries.push({
      type: 'normal',
      labelKey: 'color_option_normal',
      swatches: [{ hex: normalised.normal.baseHex, glow: false }],
      transparent: normalised.transparent === true
    });
  }

  if (normalised.glow.enabled && normalised.glow.baseHex) {
    const swatches = [{ hex: normalised.glow.baseHex, glow: false }];
    if (normalised.glow.glowHex) {
      swatches.push({ hex: normalised.glow.glowHex, glow: true });
    }
    entries.push({
      type: 'glow',
      labelKey: 'color_option_glow',
      swatches,
      transparent: normalised.transparent === true
    });
  }

  if (normalised.multicolor.enabled && normalised.multicolor.colors.length) {
    entries.push({
      type: 'multicolor',
      labelKey: 'color_option_multicolor',
      swatches: normalised.multicolor.colors.map((hex) => ({ hex, glow: false })),
      count: normalised.multicolor.colors.length,
      transparent: normalised.transparent === true
    });
  }

  if (normalised.neon.enabled && normalised.neon.colors.length) {
    entries.push({
      type: 'neon',
      labelKey: 'color_option_neon',
      swatches: normalised.neon.colors.map((hex) => ({ hex, glow: true })),
      count: normalised.neon.colors.length,
      transparent: false
    });
  }

  if (!entries.length && normalised.transparent) {
    entries.push({
      type: 'transparent',
      labelKey: 'color_option_transparent',
      swatches: [],
      transparent: true
    });
  }

  return entries;
}

export function sanitizeHexValue(value) {
  return sanitizeHex(value);
}


