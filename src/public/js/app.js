const T = window.__T__ || {};
const LANG = window.__LANG__ || 'de';
const UNIT_LENGTH = document.body?.dataset?.lengthUnit || 'mm';
const UNIT_WEIGHT = document.body?.dataset?.weightUnit || 'g';
const CURRENCY = document.body?.dataset?.currency || 'EUR';
let codeModalInstance = null;

function t(key) {
  return T[key] || key;
}

function ready(fn) {
  if (document.readyState !== 'loading') {
    fn();
  } else {
    document.addEventListener('DOMContentLoaded', fn);
  }
}

const COLOR_PALETTE = [
  { hex: '#ffffff', name: 'Weiß' },
  { hex: '#f0f0f0', name: 'Hellgrau' },
  { hex: '#c0c0c0', name: 'Silber' },
  { hex: '#000000', name: 'Schwarz' },
  { hex: '#ff0000', name: 'Rot' },
  { hex: '#ff7f00', name: 'Orange' },
  { hex: '#ffff00', name: 'Gelb' },
  { hex: '#00ff00', name: 'Grün' },
  { hex: '#00ffff', name: 'Cyan' },
  { hex: '#0000ff', name: 'Blau' },
  { hex: '#8000ff', name: 'Violett' },
  { hex: '#ff00ff', name: 'Magenta' },
  { hex: '#8b4513', name: 'Braun' },
  { hex: '#ffb347', name: 'Apricot' },
  { hex: '#ffd1dc', name: 'Pastell Rosa' }
];

const NEON_COLORS = [
  { hex: '#ff073a', labelKey: 'color_neon_red' },
  { hex: '#ff1493', labelKey: 'color_neon_pink' },
  { hex: '#39ff14', labelKey: 'color_neon_green' },
  { hex: '#ffff33', labelKey: 'color_neon_yellow' },
  { hex: '#ff5f1f', labelKey: 'color_neon_orange' },
  { hex: '#7df9ff', labelKey: 'color_neon_turquoise' },
  { hex: '#9400d3', labelKey: 'color_neon_violet' }
];

function sanitizeHex(value) {
  if (!value) {
    return '';
  }
  let hex = value.toString().trim();
  if (!hex) {
    return '';
  }
  if (!hex.startsWith('#')) {
    hex = `#${hex}`;
  }
  if (/^#[0-9a-fA-F]{3}$/.test(hex)) {
    hex = `#${hex[1]}${hex[1]}${hex[2]}${hex[2]}${hex[3]}${hex[3]}`;
  }
  if (!/^#[0-9a-fA-F]{6}$/.test(hex)) {
    return '';
  }
  return hex.toLowerCase();
}

function escapeHtml(value) {
  if (!value) {
    return '';
  }
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function bindClick(button, handler) {
  if (!button) {
    return;
  }
  if (button.__boundHandler) {
    button.removeEventListener('click', button.__boundHandler);
  }
  const wrapped = (event) => {
    event.preventDefault();
    handler(event);
  };
  button.__boundHandler = wrapped;
  button.hidden = false;
  button.addEventListener('click', wrapped);
}

function getContrastColor(hex) {
  const sanitized = sanitizeHex(hex).replace('#', '');
  const r = parseInt(sanitized.slice(0, 2), 16);
  const g = parseInt(sanitized.slice(2, 4), 16);
  const b = parseInt(sanitized.slice(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.6 ? '#111111' : '#ffffff';
}

function normaliseColorConfig(config) {
  const base = {
    transparent: Boolean(config?.transparent),
    normal: {
      enabled: Boolean(config?.normal?.enabled),
      baseHex: sanitizeHex(config?.normal?.baseHex)
    },
    glow: {
      enabled: Boolean(config?.glow?.enabled),
      baseHex: sanitizeHex(config?.glow?.baseHex),
      glowHex: sanitizeHex(config?.glow?.glowHex)
    },
    multicolor: {
      enabled: Boolean(config?.multicolor?.enabled),
      colors: Array.isArray(config?.multicolor?.colors)
        ? config.multicolor.colors.map((hex) => sanitizeHex(hex)).filter(Boolean)
        : []
    },
    neon: {
      enabled: Boolean(config?.neon?.enabled),
      colors: Array.isArray(config?.neon?.colors)
        ? config.neon.colors.map((hex) => sanitizeHex(hex)).filter(Boolean)
        : []
    }
  };

  if (!base.glow.glowHex || base.glow.glowHex === base.glow.baseHex) {
    base.glow.glowHex = '';
  }

  if (!base.normal.enabled || !base.normal.baseHex) {
    base.normal.enabled = false;
    base.normal.baseHex = '';
  }
  if (!base.glow.enabled || !base.glow.baseHex) {
    base.glow.enabled = false;
    base.glow.baseHex = '';
    base.glow.glowHex = '';
  }
  if (!base.multicolor.enabled || !base.multicolor.colors.length) {
    base.multicolor.enabled = false;
    base.multicolor.colors = [];
  }
  if (!base.neon.enabled || !base.neon.colors.length) {
    base.neon.enabled = false;
    base.neon.colors = [];
  }

  return base;
}

function buildColorSwatchesFromConfig(config) {
  const normalised = normaliseColorConfig(config);
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

function hasSelectedColors(config) {
  const normalised = normaliseColorConfig(config);
  if (normalised.transparent) {
    return true;
  }
  if (normalised.normal.enabled && normalised.normal.baseHex) {
    return true;
  }
  if (normalised.glow.enabled && normalised.glow.baseHex) {
    return true;
  }
  if (normalised.multicolor.enabled && normalised.multicolor.colors.length) {
    return true;
  }
  if (normalised.neon.enabled && normalised.neon.colors.length) {
    return true;
  }
  return false;
}

function renderColorVariants(variants = []) {
  if (!Array.isArray(variants) || variants.length === 0) {
    return '';
  }
  return `<div class="color-swatches">${variants
    .map((variant) => {
      if (!variant) {
        return '';
      }
      const label = variant.labelKey ? `<span class="color-variant__label">${t(variant.labelKey)}</span>` : '';
      const swatches = Array.isArray(variant.swatches)
        ? variant.swatches
            .map((swatch) => {
              if (!swatch || !swatch.hex) {
                return '';
              }
              const glowTag = swatch.glow ? `<span class="color-tag color-tag--glow">${t('color_glow')}</span>` : '';
              return `<span class="color-swatch-group"><span class="color-swatch ${swatch.glow ? 'color-swatch--glow' : ''}" style="--color: ${
                swatch.hex
              }" title="${swatch.hex}"></span><span class="color-swatch__hex">${swatch.hex}</span>${glowTag}</span>`;
            })
            .join('')
        : '';
      const transparent = variant.transparent
        ? `<span class="color-tag color-tag--transparent">${t('color_transparent')}</span>`
        : '';
      const count = variant.count ? `<span class="color-variant__meta">×${variant.count}</span>` : '';
      return `<span class="color-variant">${label}${swatches}${transparent}${count}</span>`;
    })
    .join('')}</div>`;
}

function formatLengthValue(value) {
  const num = Number(value);
  if (!Number.isFinite(num)) {
    return value;
  }
  if (UNIT_LENGTH === 'inch') {
    return (num / 25.4).toFixed(3);
  }
  return num.toFixed(2);
}

function formatWeightValue(value) {
  const num = Number(value);
  if (!Number.isFinite(num)) {
    return value;
  }
  if (UNIT_WEIGHT === 'oz') {
    return (num / 28.349523125).toFixed(2);
  }
  if (UNIT_WEIGHT === 'lb') {
    return (num / 453.59237).toFixed(2);
  }
  return num.toFixed(0);
}

function initListPage() {
  const table = document.getElementById('filament-table');
  if (!table) {
    return;
  }

  const tbody = table.querySelector('tbody');
  const searchInput = document.getElementById('search-input');
  const showArchived = document.getElementById('show-archived');

  let currentData = [];

  async function fetchData() {
    const params = new URLSearchParams();
    if (showArchived.checked) {
      params.set('archived', '1');
    }
    if (searchInput.value.trim()) {
      params.set('search', searchInput.value.trim());
    }
    const res = await fetch(`/api/filaments?${params.toString()}`);
    if (!res.ok) {
      console.error('Failed to fetch filaments');
      return;
    }
    const data = await res.json();
    currentData = data.filaments || [];
    renderRows();
  }

  function renderRows() {
    tbody.innerHTML = '';
    let totalQty = 0;
    currentData.forEach((filament) => {
      const row = document.createElement('tr');
      row.dataset.id = filament.id;
      if (filament.archived) {
        row.classList.add('archived');
      }
      const colorMarkup = renderColorVariants(filament.colorsHex);
      const quantity = Number(filament.quantity) || 0;
      totalQty += quantity;
      row.innerHTML = `
        <td><a href="/filaments/${filament.id}">${filament.name}</a></td>
        <td>${filament.material || ''}</td>
        <td>${formatLengthValue(filament.diameterMm)} ${UNIT_LENGTH}</td>
        <td>${colorMarkup}</td>
        <td>${formatWeightValue(filament.netWeightG)} ${UNIT_WEIGHT}</td>
        <td data-remaining>${formatWeightValue(filament.remainingG)} ${UNIT_WEIGHT}</td>
        <td>${quantity}</td>
        <td>
          <div class="id-block">
            <span class="id-text">${filament.id}</span>
            <div class="id-actions">
              <a href="/api/codes/barcode.svg?id=${filament.id}" target="_blank" title="${t('barcode')}">📦</a>
              <a href="/api/codes/qr.png?text=${encodeURIComponent(`/filaments/${filament.id}`)}" target="_blank" title="${t('qrcode')}">🔳</a>
            </div>
          </div>
        </td>
        <td>${filament.priceNewEUR ? `${CURRENCY} ${formatDecimal(filament.priceNewEUR, 2)}` : ''}</td>
        <td>${filament.productUrl ? `<a href="${filament.productUrl}" target="_blank" rel="noopener">Link</a>` : ''}</td>
        <td>
          <button class="btn" data-action="restock">${t('restock')}</button>
          ${filament.archived
            ? `<button class="btn" data-action="unarchive">${t('unarchive')}</button>`
            : `<button class="btn btn--danger" data-action="archive">${t('archive')}</button>`}
          <button class="btn btn--ghost" data-action="codes">${t('modal_codes_button')}</button>
          <button class="btn btn--danger" data-action="delete">${t('delete')}</button>
        </td>
      `;
      tbody.appendChild(row);
    });
    const totalEl = document.getElementById('total-quantity-value');
    if (totalEl) {
      totalEl.textContent = totalQty;
    }
  }

  function formatDecimal(value, decimals = 2) {
    if (value === null || value === undefined) {
      return '';
    }
    return Number(value).toFixed(decimals);
  }

  const debouncedFetch = debounce(fetchData, 250);

  searchInput?.addEventListener('input', debouncedFetch);
  showArchived?.addEventListener('change', fetchData);

  tbody.addEventListener('click', async (event) => {
    const button = event.target.closest('button[data-action]');
    if (!button) {
      return;
    }
    const action = button.dataset.action;
    const row = button.closest('tr');
    const id = row?.dataset.id;
    if (!id) {
      return;
    }
    if (action === 'codes') {
      if (!codeModalInstance) {
        return;
      }
      const label = row.querySelector('td a')?.textContent?.trim() || id;
      const origin = window.location.origin || `${window.location.protocol}//${window.location.host}`;
      codeModalInstance.open({
        label,
        barcodeValue: id,
        qrValue: `${origin}/filaments/${id}`
      });
    } else if (action === 'restock') {
      await fetch(`/api/filaments/${id}/restock`, { method: 'POST' });
      window.open(`/print/label/${id}`, '_blank');
      await fetchData();
    } else if (action === 'archive' || action === 'unarchive') {
      await fetch(`/api/filaments/${id}/${action}`, { method: 'POST' });
      await fetchData();
    } else if (action === 'delete') {
      if (!confirm(t('confirm_delete'))) {
        return;
      }
      button.disabled = true;
      try {
        const res = await fetch(`/api/filaments/${id}`, { method: 'DELETE' });
        if (!res.ok) {
          throw new Error(`Delete failed: ${res.status}`);
        }
        await fetchData();
      } catch (error) {
        console.error(error);
        alert(t('delete_failed'));
      } finally {
        button.disabled = false;
      }
    }
  });

  fetchData().catch(console.error);
}

function renderPalette(container, onSelect, isEnabled = () => true) {
  if (!container) {
    return;
  }
  container.innerHTML = '';
  COLOR_PALETTE.forEach(({ hex, name }) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'color-swatch-btn';
    btn.style.setProperty('--swatch-color', hex);
    btn.title = name;
    btn.addEventListener('click', () => {
      if (!isEnabled()) {
        return;
      }
      onSelect(hex);
    });
    container.append(btn);
  });
}

function setupColorControls(form, initialConfig = {}, onChange) {
  if (!form) {
    const fallback = normaliseColorConfig(initialConfig);
    return {
      colorConfig: fallback,
      getConfig: () => normaliseColorConfig(fallback),
      updatePreview: () => {}
    };
  }

  const changeCallback = typeof onChange === 'function' ? onChange : null;

  const colorConfig = normaliseColorConfig(initialConfig);
  const select = (selector) => form.querySelector(selector);

  const colorOptions = {
    normal: select('#color-option-normal'),
    glow: select('#color-option-glow'),
    multicolor: select('#color-option-multicolor'),
    neon: select('#color-option-neon'),
    transparent: select('#color-option-transparent')
  };

  const hasControls = Object.values(colorOptions).some(Boolean);
  if (!hasControls) {
    return {
      colorConfig,
      getConfig: () => normaliseColorConfig(colorConfig),
      updatePreview: () => {}
    };
  }

  const panels = {
    normal: select('#color-panel-normal'),
    glow: select('#color-panel-glow'),
    multicolor: select('#color-panel-multicolor'),
    neon: select('#color-panel-neon')
  };

  Object.entries(panels).forEach(([key, panel]) => {
    panel?.addEventListener('mousedown', () => {
      const checkbox = colorOptions[key];
      if (checkbox && !checkbox.checked) {
        checkbox.checked = true;
        colorConfig[key] = colorConfig[key] || {};
        colorConfig[key].enabled = true;
        updatePanelVisibility();
      }
    });
  });

  const inputs = {
    normalText: select('#normal-hex-text'),
    normalColor: select('#normal-hex-color'),
    glowBaseText: select('#glow-base-text'),
    glowBaseColor: select('#glow-base-color'),
    glowHexText: select('#glow-hex-text'),
    glowHexColor: select('#glow-hex-color'),
    multicolorCount: select('#multicolor-count'),
    multicolorInputs: select('#multicolor-inputs'),
    neonPalette: select('#neon-palette'),
    previewWrapper: select('#color-preview'),
    previewList: select('#color-preview-list')
  };

  const paletteContainers = {
    normal: select('#normal-palette'),
    glowBase: select('#glow-base-palette'),
    glowGlow: select('#glow-glow-palette')
  };

  const DEFAULT_NORMAL = '#ff6600';
  const DEFAULT_GLOW_BASE = '#2f2f2f';
  const DEFAULT_GLOW_GLOW = '#39ff14';

  function updatePreview() {
    if (!inputs.previewWrapper || !inputs.previewList) {
      return;
    }
    const swatches = buildColorSwatchesFromConfig(colorConfig);
    if (!swatches.length) {
      inputs.previewWrapper.hidden = true;
      inputs.previewList.innerHTML = '';
    } else {
      inputs.previewWrapper.hidden = false;
      inputs.previewList.innerHTML = renderColorVariants(swatches);
    }
    if (changeCallback) {
      changeCallback(normaliseColorConfig(colorConfig));
    }
  }

  function updatePanelVisibility() {
    let visiblePanel = false;
    ['normal', 'glow', 'multicolor', 'neon'].forEach((key) => {
      const checkbox = colorOptions[key];
      const panel = panels[key];
      if (!checkbox || !panel) {
        return;
      }
      const enabled = checkbox.checked;
      colorConfig[key] = colorConfig[key] || {};
      colorConfig[key].enabled = enabled;
      panel.hidden = !enabled;
      if (enabled) {
        visiblePanel = true;
      }
    });
    if (inputs.previewWrapper) {
      inputs.previewWrapper.hidden = !visiblePanel;
    }
    updatePreview();
  }

  function attachHexSync(textInput, colorInput, setter, defaultHex = '#ffffff') {
    let current = sanitizeHex(colorInput?.value) || sanitizeHex(textInput?.value) || defaultHex;
    if (colorInput) {
      colorInput.value = current;
    }
    if (textInput) {
      textInput.value = current;
    }
    setter(current);

    const apply = (hex) => {
      if (hex) {
        current = hex;
        setter(hex);
      }
      updatePreview();
    };

    if (colorInput) {
      colorInput.addEventListener('input', () => {
        const hex = sanitizeHex(colorInput.value);
        if (hex) {
          if (textInput) {
            textInput.value = hex;
          }
          apply(hex);
        } else {
          colorInput.value = current;
        }
      });
    }

    if (textInput) {
      const handleText = () => {
        const hex = sanitizeHex(textInput.value);
        if (hex) {
          if (colorInput) {
            colorInput.value = hex;
          }
          apply(hex);
        } else {
          textInput.value = current;
          updatePreview();
        }
      };
      textInput.addEventListener('change', handleText);
      textInput.addEventListener('blur', handleText);
    }

    updatePreview();

    return (hex) => {
      const sanitized = sanitizeHex(hex);
      if (!sanitized) {
        return;
      }
      current = sanitized;
      if (colorInput) {
        colorInput.value = sanitized;
      }
      if (textInput) {
        textInput.value = sanitized;
      }
      setter(sanitized);
      updatePreview();
    };
  }

  function ensureMulticolorColors(count) {
    const defaults = ['#ff6b6b', '#ffd93d', '#6bc2ff', '#a16eff', '#4ade80', '#f97316', '#facc15'];
    const currentColors = colorConfig.multicolor.colors || [];
    const result = Array.from({ length: count }, (_, index) => currentColors[index] || defaults[index % defaults.length]);
    colorConfig.multicolor.colors = result.map((hex, index) => sanitizeHex(hex) || defaults[index % defaults.length]);
  }

  function renderMulticolorInputs() {
    if (!inputs.multicolorInputs) {
      return;
    }
    const colors = colorConfig.multicolor.colors || [];
    inputs.multicolorInputs.innerHTML = '';
    colors.forEach((hex, index) => {
      const row = document.createElement('div');
      row.className = 'color-multicolor-row';

      const textLabel = document.createElement('label');
      const textSpan = document.createElement('span');
      textSpan.textContent = `${t('color_hex')} ${index + 1}`;
      const textInput = document.createElement('input');
      textInput.type = 'text';
      textInput.className = 'hex-input';
      textInput.value = hex || '';
      textLabel.append(textSpan, textInput);

      const colorLabel = document.createElement('label');
      const colorSpan = document.createElement('span');
      colorSpan.textContent = t('color_base');
      const colorInput = document.createElement('input');
      colorInput.type = 'color';
      colorInput.value = hex || '#ffffff';
      colorLabel.append(colorSpan, colorInput);

      const setHex = attachHexSync(textInput, colorInput, (value) => {
        colorConfig.multicolor.colors[index] = value;
      }, hex || '#ffffff');

      const palette = document.createElement('div');
      palette.className = 'color-palette color-palette--compact';
      renderPalette(palette, (value) => {
        setHex(value);
      }, () => colorOptions.multicolor?.checked);

      row.append(textLabel, colorLabel, palette);
      inputs.multicolorInputs.append(row);
    });
  }

  function renderNeonPalette() {
    if (!inputs.neonPalette) {
      return;
    }
    inputs.neonPalette.innerHTML = '';
  NEON_COLORS.forEach(({ hex, labelKey }) => {
    const labelText = t(labelKey);
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'color-neon-option';
      button.dataset.hex = hex;
      const contrast = getContrastColor(hex);
      button.style.setProperty('--neon-bg', hex);
      button.style.setProperty('--neon-text', contrast);
      button.style.background = hex;
      button.style.backgroundColor = hex;
      button.style.color = contrast;
      button.style.borderColor = hex;
      button.style.boxShadow = `0 0 12px ${hex}66`;
      if (colorConfig.neon.colors.includes(hex)) {
        button.classList.add('selected');
      }
      const swatch = document.createElement('span');
      swatch.className = 'color-neon-swatch';
      swatch.style.backgroundColor = hex;
      swatch.style.boxShadow = `0 0 10px ${hex}`;
      const label = document.createElement('span');
    label.textContent = labelText;
    button.setAttribute('aria-label', labelText);
      button.append(swatch, label);
      button.addEventListener('click', () => {
        if (!colorOptions.neon?.checked) {
          return;
        }
        const idx = colorConfig.neon.colors.indexOf(hex);
        if (idx >= 0) {
          colorConfig.neon.colors.splice(idx, 1);
          button.classList.remove('selected');
        } else {
          colorConfig.neon.colors.push(hex);
          button.classList.add('selected');
        }
        updatePreview();
      });

      inputs.neonPalette.append(button);
    });
  }

  colorOptions.normal?.addEventListener('change', () => {
    if (colorOptions.normal.checked) {
      if (!sanitizeHex(colorConfig.normal.baseHex)) {
        colorConfig.normal.baseHex = DEFAULT_NORMAL;
      }
      const current = sanitizeHex(colorConfig.normal.baseHex) || DEFAULT_NORMAL;
      if (inputs.normalText) {
        inputs.normalText.value = current;
      }
      if (inputs.normalColor) {
        inputs.normalColor.value = current;
      }
      colorConfig.normal.enabled = true;
    } else {
      colorConfig.normal.enabled = false;
    }
    updatePanelVisibility();
  });

  colorOptions.glow?.addEventListener('change', () => {
    const enabled = colorOptions.glow.checked;
    colorConfig.glow.enabled = enabled;
    if (panels.glow) {
      panels.glow.hidden = !enabled;
    }
    if (enabled) {
      if (!sanitizeHex(colorConfig.glow.baseHex)) {
        const baseFallback = sanitizeHex(inputs.glowBaseText?.value) || sanitizeHex(inputs.glowBaseColor?.value) || DEFAULT_GLOW_BASE;
        colorConfig.glow.baseHex = baseFallback;
        if (inputs.glowBaseText) {
          inputs.glowBaseText.value = baseFallback;
        }
        if (inputs.glowBaseColor) {
          inputs.glowBaseColor.value = baseFallback;
        }
      }
      if (!sanitizeHex(colorConfig.glow.glowHex)) {
        const glowFallback = sanitizeHex(inputs.glowHexText?.value) || sanitizeHex(inputs.glowHexColor?.value) || DEFAULT_GLOW_GLOW;
        colorConfig.glow.glowHex = glowFallback;
        if (inputs.glowHexText) {
          inputs.glowHexText.value = glowFallback;
        }
        if (inputs.glowHexColor) {
          inputs.glowHexColor.value = glowFallback;
        }
      }
    } else {
      colorConfig.glow.baseHex = '';
      colorConfig.glow.glowHex = '';
    }
    renderNeonPalette();
    updatePanelVisibility();
  });

  colorOptions.multicolor?.addEventListener('change', () => {
    const enabled = colorOptions.multicolor.checked;
    colorConfig.multicolor.enabled = enabled;
    if (panels.multicolor) {
      panels.multicolor.hidden = !enabled;
    }
    if (enabled) {
      const count = Number(inputs.multicolorCount?.value) || colorConfig.multicolor.colors.length || 2;
      ensureMulticolorColors(count);
      renderMulticolorInputs();
    } else if (inputs.multicolorInputs) {
      colorConfig.multicolor.colors = [];
      inputs.multicolorInputs.innerHTML = '';
    }
    updatePanelVisibility();
  });

  colorOptions.neon?.addEventListener('change', () => {
    const enabled = colorOptions.neon.checked;
    colorConfig.neon.enabled = enabled;
    if (panels.neon) {
      panels.neon.hidden = !enabled;
    }
    if (!enabled) {
      colorConfig.neon.colors = [];
    }
    renderNeonPalette();
    updatePanelVisibility();
  });

  colorOptions.transparent?.addEventListener('change', () => {
    colorConfig.transparent = colorOptions.transparent.checked;
    updatePreview();
  });

  inputs.multicolorCount?.addEventListener('change', () => {
    if (!colorOptions.multicolor?.checked) {
      return;
    }
    const count = Number(inputs.multicolorCount.value) || 2;
    ensureMulticolorColors(count);
    renderMulticolorInputs();
    updatePreview();
  });

  const setNormalHex = attachHexSync(inputs.normalText, inputs.normalColor, (hex) => {
    colorConfig.normal.baseHex = hex;
  }, DEFAULT_NORMAL);

  const setGlowBaseHex = attachHexSync(inputs.glowBaseText, inputs.glowBaseColor, (hex) => {
    colorConfig.glow.baseHex = hex;
  }, DEFAULT_GLOW_BASE);

  const setGlowGlowHex = attachHexSync(inputs.glowHexText, inputs.glowHexColor, (hex) => {
    colorConfig.glow.glowHex = hex;
  }, DEFAULT_GLOW_GLOW);

  renderPalette(paletteContainers.normal, (hex) => {
    setNormalHex(hex);
  }, () => colorOptions.normal?.checked);

  renderPalette(paletteContainers.glowBase, (hex) => {
    setGlowBaseHex(hex);
  }, () => colorOptions.glow?.checked);

  renderPalette(paletteContainers.glowGlow, (hex) => {
    setGlowGlowHex(hex);
  }, () => colorOptions.glow?.checked);

  renderNeonPalette();

  if (colorOptions.normal) {
    const baseHex = colorConfig.normal.baseHex || DEFAULT_NORMAL;
    colorOptions.normal.checked = Boolean(colorConfig.normal.enabled && colorConfig.normal.baseHex);
    if (inputs.normalText) {
      inputs.normalText.value = baseHex;
    }
    if (inputs.normalColor) {
      inputs.normalColor.value = baseHex;
    }
  }

  if (colorOptions.glow) {
    const baseHex = colorConfig.glow.baseHex || DEFAULT_GLOW_BASE;
    const glowHex = colorConfig.glow.glowHex || DEFAULT_GLOW_GLOW;
    colorOptions.glow.checked = Boolean(colorConfig.glow.enabled && colorConfig.glow.baseHex);
    if (inputs.glowBaseText) {
      inputs.glowBaseText.value = baseHex;
    }
    if (inputs.glowBaseColor) {
      inputs.glowBaseColor.value = baseHex;
    }
    if (inputs.glowHexText) {
      inputs.glowHexText.value = glowHex;
    }
    if (inputs.glowHexColor) {
      inputs.glowHexColor.value = glowHex;
    }
  }

  if (colorOptions.multicolor) {
    const existingCount = colorConfig.multicolor.colors.length || Number(inputs.multicolorCount?.value) || 2;
    if (inputs.multicolorCount) {
      const options = Array.from(inputs.multicolorCount.options || []);
      if (!options.some((opt) => Number(opt.value) === existingCount)) {
        const opt = document.createElement('option');
        opt.value = String(existingCount);
        opt.textContent = existingCount;
        inputs.multicolorCount.append(opt);
      }
      inputs.multicolorCount.value = String(existingCount);
    }
    colorOptions.multicolor.checked = Boolean(colorConfig.multicolor.enabled && colorConfig.multicolor.colors.length);
    if (colorOptions.multicolor.checked) {
      ensureMulticolorColors(Number(inputs.multicolorCount?.value) || existingCount);
      renderMulticolorInputs();
    } else if (inputs.multicolorInputs) {
      inputs.multicolorInputs.innerHTML = '';
    }
  }

  if (colorOptions.neon) {
    colorOptions.neon.checked = Boolean(colorConfig.neon.enabled && colorConfig.neon.colors.length);
    renderNeonPalette();
  }

  if (colorOptions.transparent) {
    colorOptions.transparent.checked = Boolean(colorConfig.transparent);
    colorConfig.transparent = colorOptions.transparent.checked;
  }

  updatePanelVisibility();

  return {
    colorConfig,
    getConfig: () => normaliseColorConfig(colorConfig),
    updatePreview
  };
}

function createCodeModal() {
  const modal = document.getElementById('code-modal');
  const backdrop = document.getElementById('code-modal-backdrop');
  if (!modal || !backdrop) {
    return null;
  }
  const titleEl = modal.querySelector('#code-modal-title');
  const subtitleEl = modal.querySelector('.modal__subtitle');
  const barcodeImg = modal.querySelector('[data-barcode]');
  const qrImg = modal.querySelector('[data-qr]');
  const closeBtn = modal.querySelector('[data-modal-close]');
  const printBtn = modal.querySelector('[data-modal-print]');
  const filterButtons = Array.from(modal.querySelectorAll('[data-code-filter]'));
  const barcodeBlock = modal.querySelector('[data-code-block="barcode"]');
  const qrBlock = modal.querySelector('[data-code-block="qr"]');
  let currentBarcode = '';
  let currentQr = '';
  let currentFilter = 'both';
  let currentIncludeText = false;
  let closeTimer = null;

  const show = () => {
    if (closeTimer) {
      clearTimeout(closeTimer);
      closeTimer = null;
    }
    backdrop.hidden = false;
    modal.hidden = false;
    requestAnimationFrame(() => {
      backdrop.classList.add('is-visible');
      modal.classList.add('is-visible');
    });
  };

  const hide = () => {
    backdrop.classList.remove('is-visible');
    modal.classList.remove('is-visible');
    closeTimer = setTimeout(() => {
      backdrop.hidden = true;
      modal.hidden = true;
    }, 200);
  };

  const setSubtitle = (label) => {
    if (!subtitleEl) {
      return;
    }
    const template = t('modal_codes_subtitle_template') || '';
    subtitleEl.textContent = template.replace('{label}', label || '');
  };

  const applyFilter = (value = 'both') => {
    currentFilter = value;
    const showBarcode = value === 'both' || value === 'barcode';
    const showQr = value === 'both' || value === 'qr';
    filterButtons.forEach((button) => {
      button.classList.toggle('is-active', button.dataset.codeFilter === value);
    });
    if (barcodeBlock) {
      barcodeBlock.hidden = !showBarcode;
    }
    if (qrBlock) {
      qrBlock.hidden = !showQr;
    }
  };

  const open = ({ label, barcodeValue, qrValue, includeText = false }) => {
    currentBarcode = barcodeValue || '';
    currentQr = qrValue || barcodeValue || '';
    currentIncludeText = includeText;
    applyFilter('both');
    if (titleEl) {
      titleEl.textContent = t('modal_codes_title');
    }
    setSubtitle(label || '');
    const textParam = includeText ? '&includetext=true' : '';
    if (barcodeImg) {
      barcodeImg.src = `/api/codes/barcode.png?id=${encodeURIComponent(currentBarcode)}${textParam}`;
    }
    if (qrImg) {
      qrImg.src = `/api/codes/qr.png?text=${encodeURIComponent(currentQr)}`;
    }
    show();
  };

  // Hilfsfunktion: Konvertiert mm zu TWIPS (1 TWIP = 1/1440 inch, 1 inch = 25.4mm)
  const mmToTwips = (mm) => Math.round((mm / 25.4) * 1440);

  // Hilfsfunktion: Lädt Bild als Base64
  const imageToBase64 = async (url) => {
    try {
      // Versuche zuerst über fetch (funktioniert auch mit CORS)
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const blob = await response.blob();
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    } catch (error) {
      // Fallback: Canvas-Methode
      return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
          const canvas = document.createElement('canvas');
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0);
          try {
            const base64 = canvas.toDataURL('image/png');
            resolve(base64);
          } catch (err) {
            reject(err);
          }
        };
        img.onerror = reject;
        img.src = url;
      });
    }
  };

  // Drucken mit DYMO Label Framework
  const printWithDymo = async (shouldPrintBarcode, shouldPrintQr) => {
    // Prüfe ob DYMO Framework verfügbar ist
    if (typeof window.dymo === 'undefined' || !window.dymo.label.framework) {
      console.log('DYMO Framework nicht verfügbar, verwende Browser-Druck');
      return false;
    }

    try {
      const framework = window.dymo.label.framework;
      await framework.init();

      // Finde LabelWriter Drucker
      const printers = framework.getPrinters();
      if (!printers || printers.length === 0) {
        console.log('Kein DYMO Drucker gefunden, verwende Browser-Druck');
        return false;
      }

      // Verwende ersten LabelWriter (normalerweise LabelWriter 550)
      const printerName = printers.find(p => p.includes('LabelWriter')) || printers[0];
      if (!printerName) {
        console.log('Kein LabelWriter gefunden, verwende Browser-Druck');
        return false;
      }

      // Lade Druckprofil
      const profile = window.__PRINT_PROFILE__ || null;
      const labelWidth = profile?.labelWidth || 57; // mm
      const labelHeight = profile?.labelHeight || 32; // mm

      // Konvertiere mm zu TWIPS für DYMO
      const widthTwips = mmToTwips(labelWidth);
      const heightTwips = mmToTwips(labelHeight);

      // Lade Bilder als Base64
      const safeBarcode = encodeURIComponent(currentBarcode);
      const safeQr = encodeURIComponent(currentQr || currentBarcode);
      const isEan = currentIncludeText || /^[0-9]{8,}$/.test(currentBarcode);
      const textParam = isEan ? '&includetext=true' : '';

      let barcodeBase64 = null;
      let qrBase64 = null;

      if (shouldPrintBarcode) {
        try {
          barcodeBase64 = await imageToBase64(`/api/codes/barcode.png?id=${safeBarcode}${textParam}`);
        } catch (error) {
          console.error('Fehler beim Laden des Barcodes:', error);
          return false;
        }
      }

      if (shouldPrintQr) {
        try {
          qrBase64 = await imageToBase64(`/api/codes/qr.png?text=${safeQr}`);
        } catch (error) {
          console.error('Fehler beim Laden des QR-Codes:', error);
          return false;
        }
      }

      // Erstelle Label-XML
      const labelXml = `<?xml version="1.0" encoding="utf-8"?>
<DieCutLabel Version="8.0" Units="twips" XDim="${widthTwips}" YDim="${heightTwips}">
  <PaperOrientation>Landscape</PaperOrientation>
  <Id>LW 32x57mm</Id>
  <PaperName>LW 32x57mm</PaperName>
  <DrawCommands>
    <RoundRectangle X="0" Y="0" Width="${widthTwips}" Height="${heightTwips}" Rx="0" Ry="0"/>
    ${shouldPrintBarcode && barcodeBase64 ? `
    <ImageObject X="0" Y="0" Width="${widthTwips}" Height="${heightTwips}">
      <ImageData>${barcodeBase64}</ImageData>
      <SizeMode>Fit</SizeMode>
      <HorizontalAlignment>Center</HorizontalAlignment>
      <VerticalAlignment>Middle</VerticalAlignment>
    </ImageObject>
    ` : ''}
    ${shouldPrintQr && qrBase64 && shouldPrintBarcode ? `
    <ImageObject X="${Math.round(widthTwips / 2)}" Y="0" Width="${Math.round(widthTwips / 2)}" Height="${heightTwips}">
      <ImageData>${qrBase64}</ImageData>
      <SizeMode>Fit</SizeMode>
      <HorizontalAlignment>Center</HorizontalAlignment>
      <VerticalAlignment>Middle</VerticalAlignment>
    </ImageObject>
    ` : shouldPrintQr && qrBase64 ? `
    <ImageObject X="0" Y="0" Width="${widthTwips}" Height="${heightTwips}">
      <ImageData>${qrBase64}</ImageData>
      <SizeMode>Fit</SizeMode>
      <HorizontalAlignment>Center</HorizontalAlignment>
      <VerticalAlignment>Middle</VerticalAlignment>
    </ImageObject>
    ` : ''}
  </DrawCommands>
</DieCutLabel>`;

      // Drucke Label
      framework.printLabel(printerName, '', labelXml);
      console.log('Label erfolgreich mit DYMO gedruckt');
      return true;
    } catch (error) {
      console.error('Fehler beim Drucken mit DYMO:', error);
      return false;
    }
  };

  const printCodes = async () => {
    if (!currentBarcode) {
      return;
    }
    const shouldPrintBarcode = currentFilter === 'both' || currentFilter === 'barcode';
    const shouldPrintQr = currentFilter === 'both' || currentFilter === 'qr';
    if (!shouldPrintBarcode && !shouldPrintQr) {
      return;
    }

    // Versuche zuerst mit DYMO zu drucken
    const dymoSuccess = await printWithDymo(shouldPrintBarcode, shouldPrintQr);
    if (dymoSuccess) {
      return;
    }

    // Fallback: Browser-Druck
    const printWindow = window.open('', '_blank', 'width=720,height=480');
    if (!printWindow) {
      return;
    }
    const safeBarcode = encodeURIComponent(currentBarcode);
    const safeQr = encodeURIComponent(currentQr || currentBarcode);
    // Verwende die gespeicherte includeText-Option oder prüfe ob es ein EAN ist (nur Zahlen, mindestens 8 Zeichen)
    const isEan = currentIncludeText || /^[0-9]{8,}$/.test(currentBarcode);
    const textParam = isEan ? '&includetext=true' : '';
    
    // Lade Druckprofil aus globaler Variable
    const profile = window.__PRINT_PROFILE__ || null;
    const labelWidth = profile?.labelWidth || 57;
    const labelHeight = profile?.labelHeight || 32;
    const orientation = profile?.orientation || 'landscape';
    const cssSettings = profile?.css || {};
    const padding = cssSettings.padding || '0.5mm';
    const maxWidth = cssSettings.maxWidth || '25mm';
    const maxHeight = cssSettings.maxHeight || '55mm';
    
    const codeFragments = [];
    if (shouldPrintBarcode) {
      codeFragments.push(`
            <div class="code-block">
              <img src="/api/codes/barcode.png?id=${safeBarcode}${textParam}" alt="${escapeHtml(t('modal_barcode_alt'))}">
            </div>
      `);
    }
    if (shouldPrintQr) {
      codeFragments.push(`
            <div class="code-block">
              <img src="/api/codes/qr.png?text=${safeQr}" alt="${escapeHtml(t('modal_qr_alt'))}">
            </div>
      `);
    }
    const codesClass = codeFragments.length > 1 ? 'codes codes--multiple' : 'codes codes--single';
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title></title>
          <style>
            /* Label: ${labelHeight}mm Höhe × ${labelWidth}mm Breite (${orientation}) */
            @page {
              size: ${labelWidth}mm ${labelHeight}mm; /* CSS: width × height */
              margin: 0;
              padding: 0;
            }
            * {
              box-sizing: border-box;
            }
            html, body {
              width: ${labelWidth}mm; /* Breite */
              height: ${labelHeight}mm; /* Höhe */
              margin: 0;
              padding: 0;
              background: #fff;
              color: #000;
              overflow: hidden;
            }
            body {
              font-family: Arial, sans-serif;
              display: flex;
              align-items: center;
              justify-content: center;
            }
            .codes {
              width: ${labelWidth}mm; /* Breite */
              height: ${labelHeight}mm; /* Höhe */
              max-width: ${labelWidth}mm;
              max-height: ${labelHeight}mm;
              display: flex;
              gap: 0;
              justify-content: center;
              align-items: center;
              padding: ${padding};
              page-break-after: always;
              page-break-inside: avoid;
              overflow: hidden;
            }
            .codes--single {
              justify-content: center;
            }
            .codes--multiple {
              flex-direction: row;
              gap: 0.5mm;
            }
            .code-block {
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              page-break-inside: avoid;
              width: 100%;
              height: 100%;
            }
            .codes--multiple .code-block {
              width: 50%;
            }
            .codes img {
              max-width: ${maxWidth}; /* Breite nach Rotation (vertikaler Barcode) */
              max-height: ${maxHeight}; /* Höhe nach Rotation (vertikaler Barcode) */
              width: auto;
              height: auto;
              object-fit: contain;
              display: block;
            }
            /* Sicherstellen, dass nichts über die Label-Grenzen hinausgeht */
            .codes,
            .code-block,
            .codes img {
              box-sizing: border-box;
            }
          </style>
        </head>
        <body>
          <div class="${codesClass}">
            ${codeFragments.join('')}
          </div>
          <script>window.onload = () => { window.print(); };</script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  closeBtn?.addEventListener('click', hide);
  backdrop?.addEventListener('click', hide);
  printBtn?.addEventListener('click', printCodes);
  filterButtons.forEach((button) => {
    button.addEventListener('click', () => applyFilter(button.dataset.codeFilter || 'both'));
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !modal.hidden) {
      hide();
    }
  });

  return { open, close: hide };
}

function initLandingPage() {
  const landing = document.querySelector('[data-page="landing"]');
  if (!landing) {
    return;
  }
  landing.querySelectorAll('[data-egg]').forEach((wrapper) => {
    const button = wrapper.querySelector('button');
    const text = wrapper.querySelector('p');
    if (!button || !text) {
      return;
    }
    button.addEventListener('click', () => {
      if (text.hasAttribute('hidden')) {
        text.removeAttribute('hidden');
      } else {
        text.setAttribute('hidden', '');
      }
    });
  });
}

function initInventoryPage() {
  const table = document.getElementById('inventory-table');
  if (!table) {
    return;
  }
  const rows = Array.from(table.querySelectorAll('tbody tr[data-id]'));
  const totalExpectedEl = document.getElementById('inventory-total-expected');
  const totalCountedEl = document.getElementById('inventory-total-counted');
  const totalDiffEl = document.getElementById('inventory-total-diff');
  const exportBtn = document.getElementById('inventory-export-btn');

  function parseNumber(value) {
    const num = Number(value);
    return Number.isFinite(num) ? num : 0;
  }

  function updateRow(row) {
    const expected = parseNumber(row.dataset.expected);
    const input = row.querySelector('.inventory-count-input');
    let counted = parseNumber(input?.value);
    if (counted < 0) {
      counted = 0;
    }
    if (input) {
      input.value = counted;
    }
    row.dataset.counted = counted;
    const diff = counted - expected;
    const diffCell = row.querySelector('.inventory-diff');
    if (diffCell) {
      diffCell.textContent = diff > 0 ? `+${diff}` : diff.toString();
      diffCell.classList.toggle('is-negative', diff < 0);
      diffCell.classList.toggle('is-positive', diff > 0);
    }
  }

  function updateTotals() {
    let expectedTotal = 0;
    let countedTotal = 0;
    rows.forEach((row) => {
      const expected = parseNumber(row.dataset.expected);
      const counted = parseNumber(row.dataset.counted ?? row.dataset.expected);
      expectedTotal += expected;
      countedTotal += counted;
    });
    const diff = countedTotal - expectedTotal;
    if (totalExpectedEl) {
      totalExpectedEl.textContent = expectedTotal.toString();
    }
    if (totalCountedEl) {
      totalCountedEl.textContent = countedTotal.toString();
    }
    if (totalDiffEl) {
      totalDiffEl.textContent = diff > 0 ? `+${diff}` : diff.toString();
      totalDiffEl.classList.toggle('is-negative', diff < 0);
      totalDiffEl.classList.toggle('is-positive', diff > 0);
    }
  }

  rows.forEach((row) => {
    updateRow(row);
    const input = row.querySelector('.inventory-count-input');
    if (input) {
      input.addEventListener('input', () => {
        updateRow(row);
        updateTotals();
      });
      input.addEventListener('change', () => {
        updateRow(row);
        updateTotals();
      });
    }
  });

  updateTotals();

  exportBtn?.addEventListener('click', async () => {
    if (exportBtn.disabled) {
      return;
    }
    exportBtn.disabled = true;
    const counts = {};
    rows.forEach((row) => {
      const id = row.dataset.id;
      if (!id) {
        return;
      }
      counts[id] = parseNumber(row.dataset.counted ?? row.dataset.expected);
    });

    try {
      const res = await fetch('/inventory/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ counts })
      });
      if (!res.ok) {
        throw new Error(`Export failed: ${res.status}`);
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      const today = new Date().toISOString().slice(0, 10);
      link.href = url;
      link.download = `inventur_${today}.pdf`;
      document.body.append(link);
      link.click();
      requestAnimationFrame(() => {
        URL.revokeObjectURL(url);
        link.remove();
      });
    } catch (error) {
      console.error(error);
      alert(t('inventory_export_failed'));
    } finally {
      exportBtn.disabled = false;
    }
  });
}

function initInventoryManagerOverview() {
  const table = document.getElementById('inventory-products-table');
  if (!table) {
    return;
  }
  const currency = table.dataset.currency || document.body?.dataset?.currency || '';
  const totalQuantityEl = document.getElementById('inventory-total-quantity');
  const totalValueEl = document.getElementById('inventory-total-value');

  function formatInventoryDecimal(value, decimals = 2) {
    if (value === null || value === undefined) {
      return '';
    }
    const num = Number(value);
    if (!Number.isFinite(num)) {
      return '';
    }
    return num.toFixed(decimals);
  }

  function refreshTotals() {
    const rows = Array.from(table.querySelectorAll('tbody tr[data-id]'));
    let totalQuantity = 0;
    let totalValue = 0;
    rows.forEach((row) => {
      const qty = Number(row.dataset.quantity || 0);
      const price = Number(row.dataset.price || 0);
      totalQuantity += qty;
      totalValue += price * qty;
    });
    if (totalQuantityEl) {
      totalQuantityEl.textContent = totalQuantity;
    }
    if (totalValueEl) {
      totalValueEl.textContent = `${formatInventoryDecimal(totalValue, 2)} ${currency}`.trim();
    }
  }

  table.addEventListener('click', async (event) => {
    const button = event.target.closest('button[data-action]');
    if (!button) {
      return;
    }
    const row = button.closest('tr');
    const id = row?.dataset.id;
    if (!id) {
      return;
    }
    const action = button.dataset.action;
    if (action === 'codes') {
      if (!codeModalInstance) {
        return;
      }
      const label = row.querySelector('.inventory-name')?.textContent?.trim() || button.dataset.internal || '';
      const internal = button.dataset.internal || label || '';
      const ean = button.dataset.ean || '';
      // Wenn ein EAN vorhanden ist und der interne Code dem EAN entspricht (nur Zahlen), Text anzeigen
      const isEan = ean && ean.length >= 8 && /^[0-9]+$/.test(ean) && internal === ean;
      codeModalInstance.open({
        label,
        barcodeValue: internal,
        qrValue: internal,
        includeText: isEan
      });
    } else if (action === 'quantity') {
      const currentQuantity = Number(row.dataset.quantity || 0);
      const input = prompt(t('inventory_quantity_prompt'), currentQuantity);
      if (input === null) {
        return;
      }
      const nextValue = Number(input);
      if (!Number.isFinite(nextValue) || nextValue < 0) {
        alert(t('invalid_remaining'));
        return;
      }
      try {
        const res = await fetch(`/api/inventory/products/${id}/quantity`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ quantity: nextValue })
        });
        if (!res.ok) {
          throw new Error(`Failed with status ${res.status}`);
        }
        const data = await res.json();
        const qty = Number(data?.item?.quantity ?? nextValue);
        row.dataset.quantity = qty;
        const quantityCell = row.querySelector('.inventory-quantity-cell');
        if (quantityCell) {
          quantityCell.textContent = qty;
        }
        const price = Number(row.dataset.price || 0);
        const totalCell = row.children[3];
        if (totalCell) {
          totalCell.textContent = `${formatInventoryDecimal(price * qty, 2)} ${currency}`.trim();
        }
        refreshTotals();
      } catch (error) {
        console.error(error);
        alert(t('update_failed'));
      }
    } else if (action === 'archive' || action === 'unarchive') {
      try {
        await fetch(`/api/inventory/products/${id}/${action}`, { method: 'POST' });
        window.location.reload();
      } catch (error) {
        console.error(error);
        alert(t('update_failed'));
      }
    } else if (action === 'delete') {
      if (!confirm(t('confirm_delete'))) {
        return;
      }
      try {
        const res = await fetch(`/api/inventory/products/${id}`, { method: 'DELETE' });
        if (!res.ok) {
          throw new Error(`Delete failed: ${res.status}`);
        }
        row.remove();
        refreshTotals();
      } catch (error) {
        console.error(error);
        alert(t('delete_failed'));
      }
    }
  });

  refreshTotals();
}

function initInventoryManagerAudit() {
  const table = document.getElementById('inventory-audit-table');
  if (!table) {
    return;
  }
  const rows = Array.from(table.querySelectorAll('tbody tr[data-id]'));
  const totalExpectedEl = document.getElementById('inventory-total-expected');
  const totalCountedEl = document.getElementById('inventory-total-counted');
  const totalDiffEl = document.getElementById('inventory-total-diff');
  const exportBtn = document.getElementById('inventory-audit-export');
  const scanInput = document.getElementById('inventory-scan-input');

  function normaliseCode(value) {
    if (!value) {
      return '';
    }
    return value.toString().trim().replace(/\s+/g, '');
  }

  function setActiveRow(targetRow) {
    rows.forEach((row) => row.classList.remove('inventory-row--active'));
    if (!targetRow) {
      return;
    }
    targetRow.classList.add('inventory-row--active');
    const input = targetRow.querySelector('.inventory-count-input');
    if (input) {
      input.focus();
      input.select();
    }
    targetRow.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  function focusRowByCode(code) {
    const normalized = normaliseCode(code);
    if (!normalized) {
      return false;
    }
    const targetRow = rows.find((row) => {
      const ean = normaliseCode(row.dataset.ean);
      const internal = normaliseCode(row.dataset.internal);
      return normalized === ean || normalized === internal;
    });
    if (targetRow) {
      setActiveRow(targetRow);
      return true;
    }
    return false;
  }

  function updateRow(row) {
    const input = row.querySelector('.inventory-count-input');
    if (!input) {
      return;
    }
    input.classList.remove('stock-high', 'stock-medium', 'stock-low', 'stock-empty');
    row.classList.remove('inventory-row--empty');
    let counted = Number(input.value);
    if (!Number.isFinite(counted) || counted < 0) {
      counted = 0;
    }
    input.value = counted;
    row.dataset.counted = counted;
    const expected = Number(row.dataset.expected || 0);
    const diffCell = row.querySelector('.inventory-diff');
    if (diffCell) {
      const diff = counted - expected;
      diffCell.textContent = diff > 0 ? `+${diff}` : diff.toString();
      diffCell.classList.toggle('is-negative', diff < 0);
      diffCell.classList.toggle('is-positive', diff > 0);
    }
    if (counted === 0) {
      input.classList.add('stock-empty');
      row.classList.add('inventory-row--empty');
    } else if (counted <= 3) {
      input.classList.add('stock-low');
    } else if (counted <= 7) {
      input.classList.add('stock-medium');
    } else if (counted > 7) {
      input.classList.add('stock-high');
    }
  }

  function updateTotals() {
    let expectedTotal = 0;
    let countedTotal = 0;
    rows.forEach((row) => {
      const expected = Number(row.dataset.expected || 0);
      const counted = Number(row.dataset.counted ?? expected);
      expectedTotal += expected;
      countedTotal += counted;
    });
    const diff = countedTotal - expectedTotal;
    if (totalExpectedEl) {
      totalExpectedEl.textContent = expectedTotal.toString();
    }
    if (totalCountedEl) {
      totalCountedEl.textContent = countedTotal.toString();
    }
    if (totalDiffEl) {
      totalDiffEl.textContent = diff > 0 ? `+${diff}` : diff.toString();
      totalDiffEl.classList.toggle('is-negative', diff < 0);
      totalDiffEl.classList.toggle('is-positive', diff > 0);
    }
  }

  rows.forEach((row) => {
    updateRow(row);
    const input = row.querySelector('.inventory-count-input');
    input?.addEventListener('input', () => {
      updateRow(row);
      updateTotals();
    });
    input?.addEventListener('change', () => {
      updateRow(row);
      updateTotals();
    });
    input?.addEventListener('focus', () => {
      setActiveRow(row);
    });
  });

  updateTotals();

  scanInput?.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter') {
      return;
    }
    event.preventDefault();
    const value = scanInput.value;
    const found = focusRowByCode(value);
    scanInput.classList.toggle('input-not-found', !found);
    if (found) {
      scanInput.select();
    }
  });

  scanInput?.addEventListener('input', () => {
    scanInput.classList.remove('input-not-found');
  });

  exportBtn?.addEventListener('click', async () => {
    if (exportBtn.disabled) {
      return;
    }
    exportBtn.disabled = true;
    const counts = {};
    rows.forEach((row) => {
      const id = row.dataset.id;
      if (!id) {
        return;
      }
      const counted = Number(row.dataset.counted ?? row.dataset.expected);
      counts[id] = counted;
    });
    try {
      const res = await fetch('/inventory/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ counts })
      });
      if (!res.ok) {
        throw new Error(`Export failed: ${res.status}`);
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      const today = new Date().toISOString().slice(0, 10);
      link.href = url;
      link.download = `inventur_${today}.pdf`;
      document.body.append(link);
      link.click();
      requestAnimationFrame(() => {
        URL.revokeObjectURL(url);
        link.remove();
      });
    } catch (error) {
      console.error(error);
      alert(t('inventory_export_failed'));
    } finally {
      exportBtn.disabled = false;
    }
  });
}

function initInventoryManagerForms() {
  const forms = document.querySelectorAll('[data-inventory-form]');
  if (!forms.length) {
    return;
  }
  forms.forEach((form) => {
    const autoFetchCheckbox = form.querySelector('input[name="autoFetchImage"]');
    const eanInput = form.querySelector('input[name="ean"]');
    eanInput?.addEventListener('input', () => {
      if (autoFetchCheckbox && !autoFetchCheckbox.disabled) {
        autoFetchCheckbox.checked = true;
      }
    });

    form.addEventListener('keydown', (event) => {
      if (event.key !== 'Enter') {
        return;
      }
      const target = event.target;
      if (!(target instanceof HTMLElement)) {
        return;
      }
      const tagName = target.tagName.toLowerCase();
      if (tagName === 'textarea') {
        return; // allow line breaks in textareas
      }
      if (target.getAttribute('type') === 'submit' || target.getAttribute('type') === 'button') {
        return;
      }

      const focusable = Array.from(
        form.querySelectorAll(
          [
            'input:not([type="hidden"]):not([type="submit"]):not([type="button"])',
            'select',
            'textarea'
          ].join(',')
        )
      ).filter((element) => {
        if (!(element instanceof HTMLElement)) {
          return false;
        }
        if (element.hasAttribute('disabled') || element.getAttribute('aria-hidden') === 'true') {
          return false;
        }
        if (element.getAttribute('type') === 'hidden') {
          return false;
        }
        if (!element.offsetParent && element !== document.activeElement) {
          return false;
        }
        return true;
      });

      const index = focusable.indexOf(target);
      if (index === -1) {
        return;
      }

      event.preventDefault();
      const next = focusable[index + 1];
      if (next && typeof next.focus === 'function') {
        next.focus();
        if ('select' in next && typeof next.select === 'function' && next.tagName.toLowerCase() !== 'select') {
          next.select();
        }
      }
    });
  });
}

function initCreateForm() {
  const form = document.getElementById('filament-form');
  if (!form) {
    return;
  }

  const colorControls = setupColorControls(form, {}, null);
  const colorsRequired = form.dataset.colorsRequired === 'true';
  const resinCheckbox = form.querySelector('#resin-checkbox');
  const diameterField = form.querySelector('[data-field="diameter"]');
  const diameterSelect = form.querySelector('#diameter-select');
  const densityHidden = form.querySelector('#density-hidden');
  const diameterRequired = diameterSelect?.dataset.required === 'true';
  const weightUnit = form?.dataset.weightUnit || 'g';

  const printLink = document.getElementById('print-label-link');
  const previewBtn = document.getElementById('preview-label');
  const labelOptions = document.getElementById('label-options');

  let latestFilamentId = null;

  if (printLink) {
    printLink.hidden = true;
  }
  if (previewBtn) {
    previewBtn.hidden = true;
  }
  if (labelOptions) {
    labelOptions.hidden = true;
  }

  function updateResinUI() {
    const isResin = resinCheckbox?.checked;
    if (diameterField) {
      diameterField.style.display = isResin ? 'none' : '';
    }
    if (diameterSelect) {
      diameterSelect.required = !isResin && diameterRequired;
    }
    if (densityHidden) {
      densityHidden.value = isResin ? '1.10' : '1.24';
    }
  }

  resinCheckbox?.addEventListener('change', updateResinUI);
  updateResinUI();

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const formData = new FormData(form);
    const payload = Object.fromEntries(formData.entries());

    const colorConfig = colorControls.getConfig();
    if (colorsRequired && !hasSelectedColors(colorConfig)) {
      alert(t('colors_required'));
      return;
    }
    payload.colorsHex = colorConfig;

    if (weightUnit !== 'g') {
      const factor = weightUnit === 'oz' ? 28.349523125 : 453.59237;
      ['netWeightG', 'remainingG'].forEach((field) => {
        if (payload[field]) {
          const val = Number(payload[field]);
          if (Number.isFinite(val)) {
            payload[field] = (val * factor).toFixed(2);
          }
        }
      });
    }

    const res = await fetch('/api/filaments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      let messageShown = false;
      try {
        const problem = await res.json();
        if (problem?.error === 'colors_required') {
          alert(t('colors_required'));
          messageShown = true;
        }
      } catch (error) {
        /** noop */
      }
      if (!messageShown) {
        alert('Fehler beim Speichern');
      }
      return;
    }

    const data = await res.json();
    const filament = data.filament;
    if (filament) {
      latestFilamentId = filament.id;
      if (printLink) {
        printLink.href = `/print/label/${filament.id}`;
        printLink.hidden = false;
        printLink.textContent = t('print_label');
      }
      if (previewBtn) {
        previewBtn.hidden = false;
        previewBtn.dataset.id = filament.id;
      }
      if (labelOptions) {
        labelOptions.hidden = false;
      }
    }
    alert('Gespeichert');
  });

  previewBtn?.addEventListener('click', () => {
    const filamentId = previewBtn.dataset.id || latestFilamentId;
    if (!filamentId) {
      return;
    }
    const selectedType = form.querySelector('input[name="labelType"]:checked')?.value || 'both';
    const url = `/print/label/${filamentId}?type=${selectedType}`;
    window.open(url, '_blank');
  });

  printLink?.addEventListener('click', (event) => {
    const filamentId = previewBtn?.dataset.id || latestFilamentId;
    if (!filamentId) {
      event.preventDefault();
      return;
    }
    printLink.href = `/print/label/${filamentId}`;
  });
}

function convertWeightToGrams(value, unit) {
  if (value === null || value === undefined) {
    return null;
  }
  const normalized = value.toString().trim().replace(',', '.');
  if (normalized === '') {
    return null;
  }
  const num = Number(normalized);
  if (!Number.isFinite(num) || num < 0) {
    return null;
  }
  if (unit === 'oz') {
    return Number((num * 28.349523125).toFixed(2));
  }
  if (unit === 'lb') {
    return Number((num * 453.59237).toFixed(2));
  }
  return Number(num.toFixed(2));
}

function initEditForm() {
  const form = document.getElementById('filament-edit-form');
  if (!form) {
    return;
  }
  const filamentId = form.dataset.id;
  const weightUnit = document.body?.dataset?.weightUnit || 'g';
  let initialColorConfig = {};
  const rawConfig = form.dataset.colorConfig;
  if (rawConfig) {
    try {
      initialColorConfig = JSON.parse(rawConfig);
    } catch (error) {
      initialColorConfig = {};
    }
  }
  const debugTarget = document.getElementById('color-debug-json');
  const updateDebug = (config) => {
    if (!debugTarget) {
      return;
    }
    debugTarget.textContent = JSON.stringify(config, null, 2);
  };

  const colorControls = setupColorControls(form, initialColorConfig, updateDebug);
  if (debugTarget) {
    updateDebug(colorControls.getConfig());
  }
  const colorsRequired = form.dataset.colorsRequired === 'true';

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const formData = new FormData(form);
    const payload = {};

    const price = formData.get('priceNewEUR');
    if (price !== null) {
      const normalized = price.toString().trim().replace(',', '.');
      if (normalized === '') {
        payload.priceNewEUR = null;
      } else {
        const num = Number(normalized);
        if (!Number.isFinite(num)) {
          alert(t('update_failed'));
          return;
        }
        payload.priceNewEUR = Number(num.toFixed(2));
      }
    }

    const netWeight = formData.get('netWeightG');
    if (netWeight !== null) {
      const grams = convertWeightToGrams(netWeight, weightUnit);
      if (grams === null) {
        alert(t('invalid_remaining'));
        return;
      }
      payload.netWeightG = grams;
    }

    const remaining = formData.get('remainingG');
    if (remaining !== null) {
      const grams = convertWeightToGrams(remaining, weightUnit);
      if (grams === null) {
        alert(t('invalid_remaining'));
        return;
      }
      payload.remainingG = grams;
    }

    const notes = formData.get('notes');
    if (notes !== null) {
      payload.notes = notes;
    }

    const colorConfig = colorControls.getConfig();
    if (colorsRequired && !hasSelectedColors(colorConfig)) {
      alert(t('colors_required'));
      return;
    }
    payload.colorsHex = colorConfig;

    const res = await fetch(`/api/filaments/${filamentId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      let messageShown = false;
      try {
        const problem = await res.json();
        if (problem?.error === 'colors_required') {
          alert(t('colors_required'));
          messageShown = true;
        }
      } catch (error) {
        /** noop */
      }
      if (!messageShown) {
        alert(t('update_failed'));
      }
      return;
    }

    alert(t('update_success'));
    window.location.href = `/filaments/${filamentId}`;
  });
}

function initDetailPage() {
  const container = document.querySelector('.filament-detail');
  if (!container) {
    return;
  }
  const id = container.dataset.id;
  const usageForm = document.getElementById('usage-form');
  const remainingDisplay = document.getElementById('remaining-display');

  usageForm?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const formData = new FormData(usageForm);
    const payload = Object.fromEntries(formData.entries());
    const res = await fetch(`/api/filaments/${id}/consume`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      alert('Fehler beim Buchen');
      return;
    }
    location.reload();
  });

  container.addEventListener('click', async (event) => {
    const button = event.target.closest('button[data-action]');
    if (!button) {
      return;
    }
    const action = button.dataset.action;
    if (action === 'codes') {
      if (!codeModalInstance) {
        return;
      }
      const title = document.querySelector('.panel__title h1')?.textContent?.trim() || id;
      const origin = window.location.origin || `${window.location.protocol}//${window.location.host}`;
      codeModalInstance.open({
        label: title,
        barcodeValue: id,
        qrValue: `${origin}/filaments/${id}`
      });
    } else if (action === 'restock') {
      await fetch(`/api/filaments/${id}/restock`, { method: 'POST' });
      window.open(`/print/label/${id}`, '_blank');
      location.reload();
    } else if (action === 'duplicate') {
      const response = await fetch(`/api/filaments/${id}/duplicate`, { method: 'POST' });
      if (!response.ok) {
        alert(t('duplicate_failed'));
        return;
      }
      const data = await response.json();
      const newId = data.filament?.id;
      if (newId) {
        window.open(`/filaments/${newId}`, '_blank');
      }
      alert(t('duplicate_success'));
    } else if (action === 'edit-remaining') {
      const currentValue = remainingDisplay?.dataset.remaining || '';
      const input = prompt(t('edit_remaining_prompt'), currentValue);
      if (input === null) {
        return;
      }
      const normalized = input.replace(',', '.');
      const nextValue = Number(normalized);
      if (!Number.isFinite(nextValue) || nextValue < 0) {
        alert(t('invalid_remaining'));
        return;
      }

      const response = await fetch(`/api/filaments/${id}/remaining`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ remainingG: nextValue })
      });

      if (!response.ok) {
        alert(t('update_failed'));
        return;
      }

      const data = await response.json();
      if (data.filament && remainingDisplay) {
        const displayValue = formatNumber(data.filament.remainingG);
        remainingDisplay.dataset.remaining = displayValue;
        remainingDisplay.textContent = `${displayValue} g`;
      }
    } else if (action === 'archive' || action === 'unarchive') {
      await fetch(`/api/filaments/${id}/${action}`, { method: 'POST' });
      location.reload();
    }
  });
}

function initGcodePage() {
  const form = document.getElementById('gcode-form');
  if (!form) {
    return;
  }
  const resultBox = document.getElementById('gcode-result');
  const sourceEl = document.getElementById('gcode-source');
  const gramsEl = document.getElementById('gcode-grams');
  const metersEl = document.getElementById('gcode-meters');
  const totalEl = document.getElementById('gcode-total');
  const filamentBox = document.getElementById('gcode-filament');
  const filamentName = document.getElementById('gcode-filament-name');
  const filamentRemaining = document.getElementById('gcode-filament-remaining');
  const printLabel = document.getElementById('gcode-print-label');

  if (printLabel) {
    printLabel.hidden = true;
  }

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const formData = new FormData(form);
    const filamentId = formData.get('filamentId');
    const params = new URLSearchParams();
    if (filamentId) {
      params.set('filamentId', filamentId);
    }
    const res = await fetch(`/api/parse-gcode?${params.toString()}`, {
      method: 'POST',
      body: formData
    });
    if (!res.ok) {
      alert('Analyse fehlgeschlagen');
      return;
    }
    const data = await res.json();
    const analysis = data.analysis;
    resultBox.hidden = false;
    sourceEl.textContent = analysis.source;
    gramsEl.textContent = formatNumber(analysis.grams);
    metersEl.textContent = formatNumber(analysis.meters);
    totalEl.textContent = formatNumber(analysis.totalExtrusion);

    if (data.filament) {
      filamentBox.hidden = false;
      filamentName.textContent = data.filament.name;
      filamentRemaining.textContent = formatNumber(data.filament.remainingG);
      if (codeModalInstance && printLabel) {
        const origin = window.location.origin || `${window.location.protocol}//${window.location.host}`;
        bindClick(printLabel, () => {
          codeModalInstance.open({
            label: data.filament.name,
            barcodeValue: data.filament.id,
            qrValue: `${origin}/filaments/${data.filament.id}`
          });
        });
      } else if (printLabel) {
        printLabel.hidden = true;
      }
    } else {
      filamentBox.hidden = true;
      if (printLabel) {
        if (printLabel.__boundHandler) {
          printLabel.removeEventListener('click', printLabel.__boundHandler);
          printLabel.__boundHandler = null;
        }
        printLabel.hidden = true;
      }
    }
  });
}

function debounce(fn, delay) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

function formatNumber(value) {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return '';
  }
  return Number(value).toFixed(2);
}

function initSettingsPage() {
  const form = document.querySelector('[data-settings-form]');
  if (!form) {
    return;
  }
  initSettingsAreaManager(form);
  const searchInput = form.querySelector('[data-settings-search]');
  const cards = Array.from(form.querySelectorAll('[data-settings-card]'));
  const groups = Array.from(form.querySelectorAll('[data-settings-group]'));
  const warning = form.querySelector('[data-settings-warning]');
  const cardTextMap = new Map();
  cards.forEach((card) => {
    cardTextMap.set(card, card.textContent.toLowerCase());
  });

  function toggleWarning(hasChanges) {
    if (!warning) {
      return;
    }
    warning.hidden = !hasChanges;
  }

  let hasChanges = false;
  const markChanged = () => {
    if (!hasChanges) {
      hasChanges = true;
      toggleWarning(true);
    }
  };

  form.addEventListener('input', (event) => {
    const target = event.target;
    if (target instanceof HTMLElement && target.closest('[data-settings-form]')) {
      if (target.matches('[data-area-input], [data-area-add], [data-area-remove]')) {
        markChanged();
        return;
      }
      if (target.closest('[data-settings-card]')) {
        markChanged();
      }
    }
  });

  window.addEventListener('beforeunload', (event) => {
    if (!hasChanges) {
      return;
    }
    const message = form.dataset.leaveWarning || 'Unsaved changes';
    event.preventDefault();
    event.returnValue = message;
    return message;
  });

  form.addEventListener('submit', () => {
    hasChanges = false;
    toggleWarning(false);
  });
}

function initSettingsAreaManager(form) {
  const manager = form.querySelector('[data-area-manager]');
  if (!manager) {
    return;
  }
  const input = manager.querySelector('[data-area-input]');
  const addButton = manager.querySelector('[data-area-add]');
  const list = manager.querySelector('[data-area-list]');
  const hidden = manager.querySelector('[data-area-hidden]');
  const emptyText = list?.dataset.emptyText || '';

  const normalise = (value) => value?.toString().trim() || '';
  let areas = (hidden?.value || '')
    .split(/\r?\n/)
    .map(normalise)
    .filter(Boolean);

  areas = Array.from(new Set(areas.map((value) => value.trim())));

  function render() {
    if (!list) {
      return;
    }
    list.innerHTML = '';
    if (!areas.length) {
      if (emptyText) {
        const emptyEl = document.createElement('p');
        emptyEl.className = 'settings-area-empty';
        emptyEl.textContent = emptyText;
        list.append(emptyEl);
      }
      return;
    }
    areas.forEach((area) => {
      const chip = document.createElement('span');
      chip.className = 'settings-area-chip';
      chip.dataset.areaItem = '1';

      const label = document.createElement('span');
      label.className = 'settings-area-chip__label';
      label.textContent = area;
      chip.append(label);

      const remove = document.createElement('button');
      remove.type = 'button';
      remove.className = 'settings-area-chip__remove';
      remove.dataset.areaRemove = '1';
      remove.textContent = '×';
      remove.setAttribute('aria-label', 'remove area');
      remove.addEventListener('click', () => {
        areas = areas.filter((value) => value !== area);
        render();
      });
      chip.append(remove);
      list.append(chip);
    });
  }

  function addArea(value) {
    const name = normalise(value);
    if (!name || areas.includes(name)) {
      return;
    }
    areas.push(name);
    areas.sort((a, b) => a.localeCompare(b));
    render();
  }

  addButton?.addEventListener('click', () => {
    addArea(input?.value || '');
    if (input) {
      input.value = '';
      input.focus();
    }
  });

  input?.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter') {
      return;
    }
    event.preventDefault();
    addArea(input.value);
    input.value = '';
  });

  form.addEventListener('submit', () => {
    if (hidden) {
      hidden.value = areas.join('\n');
    }
  });

  render();
}

ready(() => {
  codeModalInstance = createCodeModal();
  initLandingPage();
  initListPage();
  initCreateForm();
  initEditForm();
  initDetailPage();
  initGcodePage();
  initInventoryPage();
  initInventoryManagerOverview();
  initInventoryManagerAudit();
  initInventoryManagerForms();
  initSettingsPage();
  initSettingsAreaManager(document.querySelector('[data-settings-form]'));
});

