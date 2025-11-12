import { Router } from 'express';
import PDFDocument from 'pdfkit';
import { calculateGramsPerMeter } from '../lib/consumption.js';
import { generateId, sanitizeId } from '../lib/id.js';
import { parseColorConfig, stringifyColorConfig, buildColorSwatches } from '../lib/colorConfig.js';

const router = Router();

function prisma(req) {
  return req.app.get('prisma');
}

function toNumber(value) {
  if (value === null || value === undefined) {
    return null;
  }
  const num = Number(value);
  return Number.isNaN(num) ? null : num;
}

export function serializeFilament(filament, includeLogs = false) {
  const colorConfig = parseColorConfig(filament.colorsHex);
  const colorSwatches = buildColorSwatches(colorConfig);
  const base = {
    id: filament.id,
    name: filament.name,
    manufacturer: filament.manufacturer,
    material: filament.material,
    diameterMm: toNumber(filament.diameterMm),
    density: toNumber(filament.density),
    netWeightG: filament.netWeightG,
    remainingG: toNumber(filament.remainingG),
    gramsPerMeter: toNumber(filament.gramsPerMeter),
    colorsHex: colorSwatches,
    colorConfig,
    priceNewEUR: toNumber(filament.priceNewEUR),
    productUrl: filament.productUrl,
    location: filament.location,
    notes: filament.notes,
    quantity: filament.quantity ?? 1,
    archived: filament.archived,
    createdAt: filament.createdAt,
    updatedAt: filament.updatedAt
  };

  if (includeLogs) {
    base.logs = (filament.logs || []).map((log) => ({
      id: log.id,
      usedG: toNumber(log.usedG),
      source: log.source,
      jobName: log.jobName,
      createdAt: log.createdAt
    }));
  }

  return base;
}

function normaliseColorConfig(body) {
  const value = body.colorsHex ?? body.colorConfig ?? body.colors;
  return parseColorConfig(value);
}

function hasColorSelection(config) {
  if (!config) {
    return false;
  }
  if (config.transparent) {
    return true;
  }
  if (config.normal?.enabled && config.normal.baseHex) {
    return true;
  }
  if (config.glow?.enabled && config.glow.baseHex) {
    return true;
  }
  if (config.multicolor?.enabled && Array.isArray(config.multicolor.colors) && config.multicolor.colors.length) {
    return true;
  }
  if (config.neon?.enabled && Array.isArray(config.neon.colors) && config.neon.colors.length) {
    return true;
  }
  return false;
}

function normaliseCount(value) {
  const num = Number(value);
  if (!Number.isFinite(num) || num < 0) {
    return 0;
  }
  return Math.round(num);
}

router.get('/filament-overview', async (req, res, next) => {
  try {
    const showArchived = req.query.archived === '1';
    const items = await prisma(req).filament.findMany({
      where: showArchived ? {} : { archived: false },
      orderBy: [{ archived: 'asc' }, { name: 'asc' }]
    });
    const filaments = items.map((item) => serializeFilament(item));
    const totalQuantity = filaments.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);
    res.render('filament_overview', {
      filaments,
      showArchived,
      ui: req.app.locals.ui,
      totalQuantity
    });
  } catch (error) {
    next(error);
  }
});

router.get('/inventory', async (req, res, next) => {
  try {
    const items = await prisma(req).filament.findMany({
      where: { archived: false },
      orderBy: { name: 'asc' }
    });
    const filaments = items.map((item) => serializeFilament(item));
    const totals = {
      totalExpected: filaments.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0),
      totalRemaining: filaments.reduce((sum, item) => sum + (Number(item.remainingG) || 0), 0)
    };

    res.render('inventory', {
      filaments,
      totals,
      ui: req.app.locals.ui
    });
  } catch (error) {
    next(error);
  }
});

router.get('/filaments/new', (req, res) => {
  res.render('filament_new', {
    defaultId: generateId(),
    formConfig: req.app.locals.ui.form
  });
});

router.get('/filaments/:id/edit', async (req, res, next) => {
  try {
    const id = sanitizeId(req.params.id);
    const filament = await prisma(req).filament.findUnique({
      where: { id }
    });
    if (!filament) {
      return res.status(404).render('filament_view', { notFound: true });
    }
    res.render('filament_edit', {
      filament: serializeFilament(filament),
      ui: req.app.locals.ui
    });
  } catch (error) {
    next(error);
  }
});

router.get('/filaments/:id', async (req, res, next) => {
  try {
    const id = sanitizeId(req.params.id);
    const filament = await prisma(req).filament.findUnique({
      where: { id },
      include: { logs: { orderBy: { createdAt: 'desc' } } }
    });
    if (!filament) {
      return res.status(404).render('filament_view', { notFound: true });
    }
    res.render('filament_view', {
      filament: serializeFilament(filament, true),
      ui: req.app.locals.ui
    });
  } catch (error) {
    next(error);
  }
});

router.post('/api/filaments', async (req, res, next) => {
  try {
    const data = req.body;
    const id = sanitizeId(data.id) || generateId();
    const diameterMm = Number(data.diameterMm);
    const density = Number(data.density);
    const netWeightG = Number(data.netWeightG);
    const remainingG = data.remainingG ? Number(data.remainingG) : netWeightG;
    const gramsPerMeter = data.gramsPerMeter ? Number(data.gramsPerMeter) : calculateGramsPerMeter(diameterMm, density);
    const quantity = Number.isFinite(Number(data.quantity)) ? Math.max(0, Math.floor(Number(data.quantity))) : 1;

    const colorConfig = normaliseColorConfig(data);
    const requiresColors = req.app.locals.config?.requiredFields?.colorsHex;
    if (requiresColors && !hasColorSelection(colorConfig)) {
      return res.status(400).json({ error: 'colors_required' });
    }

    const created = await prisma(req).filament.create({
      data: {
        id,
        name: data.name,
        manufacturer: data.manufacturer,
        material: data.material,
        diameterMm,
        density,
        netWeightG,
        remainingG,
        gramsPerMeter,
        colorsHex: stringifyColorConfig(colorConfig),
        priceNewEUR: data.priceNewEUR ? Number(data.priceNewEUR) : null,
        productUrl: data.productUrl || null,
        location: data.location || null,
        notes: data.notes || null,
        quantity
      }
    });

    res.status(201).json({ filament: serializeFilament(created) });
  } catch (error) {
    next(error);
  }
});

router.post('/inventory/export', async (req, res, next) => {
  try {
    const countsInput = req.body?.counts && typeof req.body.counts === 'object' ? req.body.counts : {};
    const items = await prisma(req).filament.findMany({
      where: { archived: false },
      orderBy: { name: 'asc' }
    });
    const filaments = items.map((item) => serializeFilament(item));

    const doc = new PDFDocument({ size: 'A4', margin: 40 });
    const now = new Date();
    const filename = `inventur_${now.toISOString().slice(0, 10)}.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    doc.pipe(res);

    doc.fontSize(18).text('Inventurbericht', { align: 'center' });
    doc.moveDown(0.5);
    doc.fontSize(10).text(`Erstellt am: ${now.toLocaleString('de-DE')}`);
    doc.moveDown();

    const columns = [
      { key: 'name', label: 'Name', width: 170, align: 'left' },
      { key: 'manufacturer', label: 'Hersteller', width: 90, align: 'left' },
      { key: 'expected', label: 'Erwartet', width: 60, align: 'right' },
      { key: 'counted', label: 'Gezählt', width: 60, align: 'right' },
      { key: 'difference', label: 'Differenz', width: 60, align: 'right' },
      { key: 'remaining', label: 'Rest (g)', width: 70, align: 'right' }
    ];

    function drawRow(values, isHeader = false) {
      const startX = doc.x;
      const startY = doc.y;
      let x = startX;
      columns.forEach((column, index) => {
        const value = values[index] ?? '';
        doc.font(isHeader ? 'Helvetica-Bold' : 'Helvetica');
        doc.text(value, x, startY, {
          width: column.width,
          align: column.align
        });
        x += column.width;
      });
      doc.x = startX;
      doc.moveDown(isHeader ? 1 : 0.7);
    }

    drawRow(columns.map((c) => c.label), true);

    let expectedTotal = 0;
    let countedTotal = 0;
    let remainingTotal = 0;

    const pageBottom = () => doc.page.height - doc.page.margins.bottom - 40;

    filaments.forEach((filament) => {
      const expected = Number(filament.quantity) || 0;
      const counted = normaliseCount(countsInput[filament.id] ?? expected);
      const difference = counted - expected;
      const remaining = Number(filament.remainingG) || 0;

      expectedTotal += expected;
      countedTotal += counted;
      remainingTotal += remaining;

      if (doc.y > pageBottom()) {
        doc.addPage();
        drawRow(columns.map((c) => c.label), true);
      }

      const rowValues = [
        filament.name,
        filament.manufacturer || '',
        expected.toString(),
        counted.toString(),
        difference > 0 ? `+${difference}` : difference.toString(),
        remaining.toFixed(2)
      ];
      drawRow(rowValues);
    });

    if (!filaments.length) {
      doc.text('Keine Filamente vorhanden.', { align: 'center' });
    }

    doc.moveDown();
    doc.font('Helvetica-Bold').fontSize(12).text('Summen');
    doc.moveDown(0.4);
    doc.font('Helvetica').fontSize(11);
    doc.text(`Summe erwartet: ${expectedTotal}`);
    doc.text(`Summe gezählt: ${countedTotal}`);
    const diffTotal = countedTotal - expectedTotal;
    doc.text(`Summe Differenz: ${diffTotal > 0 ? `+${diffTotal}` : diffTotal}`);
    doc.text(`Gesamtgewicht (g): ${Number(remainingTotal.toFixed(2))}`);

    doc.end();
  } catch (error) {
    next(error);
  }
});

router.get('/api/filaments', async (req, res, next) => {
  try {
    const showArchived = req.query.archived === '1';
    const search = req.query.search?.trim();
    const where = {};
    if (!showArchived) {
      where.archived = false;
    }
    if (search) {
      where.OR = [
        { id: { contains: search } },
        { name: { contains: search, mode: 'insensitive' } },
        { manufacturer: { contains: search, mode: 'insensitive' } }
      ];
    }

    const items = await prisma(req).filament.findMany({ where, orderBy: { name: 'asc' } });
    res.json({ filaments: items.map((item) => serializeFilament(item)) });
  } catch (error) {
    next(error);
  }
});

router.post('/api/filaments/:id/consume', async (req, res, next) => {
  try {
    const id = sanitizeId(req.params.id);
    const usedG = Number(req.body.usedG);
    if (!usedG || usedG <= 0) {
      return res.status(400).json({ error: 'invalid_amount' });
    }
    const filament = await prisma(req).filament.findUnique({ where: { id } });
    if (!filament) {
      return res.status(404).json({ error: 'not_found' });
    }

    const newRemaining = Math.max(0, Number(filament.remainingG) - usedG);
    await prisma(req).filament.update({
      where: { id },
      data: { remainingG: newRemaining }
    });
    await prisma(req).usageLog.create({
      data: {
        filamentId: id,
        usedG,
        source: req.body.source || 'manual',
        jobName: req.body.jobName || null
      }
    });

    const updated = await prisma(req).filament.findUnique({ where: { id } });
    res.json({ filament: serializeFilament(updated) });
  } catch (error) {
    next(error);
  }
});

router.put('/api/filaments/:id', async (req, res, next) => {
  try {
    const id = sanitizeId(req.params.id);
    const existing = await prisma(req).filament.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ error: 'not_found' });
    }

    const payload = req.body || {};
    const data = {};

    if (Object.prototype.hasOwnProperty.call(payload, 'priceNewEUR')) {
      if (payload.priceNewEUR === null || payload.priceNewEUR === '') {
        data.priceNewEUR = null;
      } else {
        const price = Number(payload.priceNewEUR);
        if (Number.isFinite(price)) {
          data.priceNewEUR = price;
        }
      }
    }
    if (Object.prototype.hasOwnProperty.call(payload, 'netWeightG')) {
      const netWeight = Number(payload.netWeightG);
      if (Number.isFinite(netWeight) && netWeight >= 0) {
        data.netWeightG = netWeight;
      }
    }
    if (Object.prototype.hasOwnProperty.call(payload, 'remainingG')) {
      const remaining = Number(payload.remainingG);
      if (Number.isFinite(remaining) && remaining >= 0) {
        data.remainingG = remaining;
      }
    }
    if (Object.prototype.hasOwnProperty.call(payload, 'notes')) {
      const trimmed = payload.notes?.toString().trim();
      data.notes = trimmed ? trimmed : null;
    }
    if (Object.prototype.hasOwnProperty.call(payload, 'quantity')) {
      const qty = Number(payload.quantity);
      if (Number.isFinite(qty) && qty >= 0) {
        data.quantity = Math.floor(qty);
      }
    }
    if (Object.prototype.hasOwnProperty.call(payload, 'colorsHex')) {
      const colorConfig = normaliseColorConfig(payload);
      const requiresColors = req.app.locals.config?.requiredFields?.colorsHex;
      if (requiresColors && !hasColorSelection(colorConfig)) {
        return res.status(400).json({ error: 'colors_required' });
      }
      data.colorsHex = stringifyColorConfig(colorConfig);
    }

    if (!Object.keys(data).length) {
      return res.json({ filament: serializeFilament(existing) });
    }

    const updated = await prisma(req).filament.update({
      where: { id },
      data
    });

    res.json({ filament: serializeFilament(updated) });
  } catch (error) {
    next(error);
  }
});

router.post('/api/filaments/:id/remaining', async (req, res, next) => {
  try {
    const id = sanitizeId(req.params.id);
    const remaining = Number(req.body.remainingG);
    if (!Number.isFinite(remaining) || remaining < 0) {
      return res.status(400).json({ error: 'invalid_amount' });
    }

    const filament = await prisma(req).filament.update({
      where: { id },
      data: { remainingG: remaining }
    });

    res.json({ filament: serializeFilament(filament) });
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'not_found' });
    }
    next(error);
  }
});

router.post('/api/filaments/:id/duplicate', async (req, res, next) => {
  try {
    const id = sanitizeId(req.params.id);
    const original = await prisma(req).filament.findUnique({ where: { id } });
    if (!original) {
      return res.status(404).json({ error: 'not_found' });
    }

    const newId = generateId();
    const created = await prisma(req).filament.create({
      data: {
        id: newId,
        name: original.name,
        manufacturer: original.manufacturer,
        material: original.material,
        diameterMm: original.diameterMm,
        density: original.density,
        netWeightG: original.netWeightG,
        remainingG: original.netWeightG,
        gramsPerMeter: original.gramsPerMeter,
        colorsHex: original.colorsHex,
        priceNewEUR: original.priceNewEUR,
        productUrl: original.productUrl,
        location: original.location,
        notes: original.notes,
        quantity: original.quantity,
        archived: false
      }
    });

    res.status(201).json({ filament: serializeFilament(created) });
  } catch (error) {
    next(error);
  }
});

router.post('/api/filaments/:id/restock', async (req, res, next) => {
  try {
    const id = sanitizeId(req.params.id);
    const filament = await prisma(req).filament.findUnique({ where: { id } });
    if (!filament) {
      return res.status(404).json({ error: 'not_found' });
    }
    const currentRemaining = Number(filament.remainingG);
    const target = filament.netWeightG;
    const delta = Math.max(0, target - currentRemaining);

    const updated = await prisma(req).filament.update({
      where: { id },
      data: { remainingG: target }
    });

    if (delta > 0) {
      await prisma(req).usageLog.create({
        data: {
          filamentId: id,
          usedG: delta,
          source: 'restock'
        }
      });
    }

    res.json({ filament: serializeFilament(updated) });
  } catch (error) {
    next(error);
  }
});

router.post('/api/filaments/:id/archive', async (req, res, next) => {
  try {
    const id = sanitizeId(req.params.id);
    const filament = await prisma(req).filament.update({
      where: { id },
      data: { archived: true }
    });
    res.json({ filament: serializeFilament(filament) });
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'not_found' });
    }
    next(error);
  }
});

router.post('/api/filaments/:id/unarchive', async (req, res, next) => {
  try {
    const id = sanitizeId(req.params.id);
    const filament = await prisma(req).filament.update({
      where: { id },
      data: { archived: false }
    });
    res.json({ filament: serializeFilament(filament) });
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'not_found' });
    }
    next(error);
  }
});

router.delete('/api/filaments/:id', async (req, res, next) => {
  try {
    const id = sanitizeId(req.params.id);
    await prisma(req).usageLog.deleteMany({ where: { filamentId: id } });
    await prisma(req).filament.delete({ where: { id } });
    res.status(204).end();
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'not_found' });
    }
    next(error);
  }
});

export default router;

