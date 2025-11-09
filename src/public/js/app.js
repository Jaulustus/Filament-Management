const T = window.__T__ || {};
const LANG = window.__LANG__ || 'de';

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

ready(() => {
  initListPage();
  initCreateForm();
  initDetailPage();
  initGcodePage();
});

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
    currentData.forEach((filament) => {
      const row = document.createElement('tr');
      row.dataset.id = filament.id;
      if (filament.archived) {
        row.classList.add('archived');
      }
      row.innerHTML = `
        <td><a href="/filaments/${filament.id}">${filament.name}</a></td>
        <td>${filament.material || ''}</td>
        <td>${formatDecimal(filament.diameterMm, 2)}</td>
        <td>${renderColors(filament.colorsHex)}</td>
        <td>${filament.netWeightG} g</td>
        <td data-remaining>${formatDecimal(filament.remainingG, 2)} g</td>
        <td>
          <div class="id-block">
            <span class="id-text">${filament.id}</span>
            <div class="id-actions">
              <a href="/api/codes/barcode.svg?id=${filament.id}" target="_blank" title="${t('barcode')}">📦</a>
              <a href="/api/codes/qr.png?text=${encodeURIComponent(`/filaments/${filament.id}`)}" target="_blank" title="${t('qrcode')}">🔳</a>
            </div>
          </div>
        </td>
        <td>${filament.priceNewEUR ? `€ ${formatDecimal(filament.priceNewEUR, 2)}` : ''}</td>
        <td>${filament.productUrl ? `<a href="${filament.productUrl}" target="_blank" rel="noopener">Link</a>` : ''}</td>
        <td>
          <button class="btn" data-action="restock">${t('restock')}</button>
          <a class="btn" href="/print/label/${filament.id}" target="_blank">${t('reprint_label')}</a>
          ${filament.archived
            ? `<button class="btn" data-action="unarchive">${t('unarchive')}</button>`
            : `<button class="btn btn--danger" data-action="archive">${t('archive')}</button>`}
        </td>
      `;
      tbody.appendChild(row);
    });
  }

  function renderColors(colors = []) {
    if (!Array.isArray(colors) || colors.length === 0) {
      return '';
    }
    return `<div class="color-swatches">${colors
      .map((c) => `<span class="color-swatch" style="--color: ${c}" title="${c}"></span>`)
      .join('')}</div>`;
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
    if (action === 'restock') {
      await fetch(`/api/filaments/${id}/restock`, { method: 'POST' });
      window.open(`/print/label/${id}`, '_blank');
      await fetchData();
    } else if (action === 'archive' || action === 'unarchive') {
      await fetch(`/api/filaments/${id}/${action}`, { method: 'POST' });
      await fetchData();
    }
  });

  fetchData().catch(console.error);
}

function initCreateForm() {
  const form = document.getElementById('filament-form');
  if (!form) {
    return;
  }

  const colorListEl = document.getElementById('color-list');
  const colorPicker = document.getElementById('color-picker');
  const addColorBtn = document.getElementById('add-color');
  const printLink = document.getElementById('print-label-link');
  const colors = [];

  function renderColors() {
    colorListEl.innerHTML = colors
      .map(
        (c, index) => `
        <span class="color-tag">
          <span class="color-swatch" style="--color: ${c}" title="${c}"></span>
          ${c}
          <button type="button" data-index="${index}" aria-label="Remove">×</button>
        </span>`
      )
      .join('');
  }

  addColorBtn?.addEventListener('click', () => {
    const color = colorPicker.value;
    if (!colors.includes(color)) {
      colors.push(color);
      renderColors();
    }
  });

  colorListEl?.addEventListener('click', (event) => {
    const btn = event.target.closest('button[data-index]');
    if (!btn) {
      return;
    }
    const index = Number(btn.dataset.index);
    colors.splice(index, 1);
    renderColors();
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const formData = new FormData(form);
    const payload = Object.fromEntries(formData.entries());

    if (colors.length > 0) {
      payload.colorsHex = [...colors];
    } else {
      delete payload.colorsHex;
    }

    const res = await fetch('/api/filaments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      alert('Fehler beim Speichern');
      return;
    }

    const data = await res.json();
    const filament = data.filament;
    if (filament) {
      printLink.href = `/print/label/${filament.id}`;
      printLink.hidden = false;
      printLink.textContent = t('print_label');
    }
    alert('Gespeichert');
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
    if (action === 'restock') {
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
      printLabel.href = `/print/label/${data.filament.id}`;
    } else {
      filamentBox.hidden = true;
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

