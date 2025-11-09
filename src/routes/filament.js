import { Router } from 'express';
import { calculateGramsPerMeter } from '../lib/consumption.js';
import { generateId, sanitizeId } from '../lib/id.js';

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

function parseColors(value) {
  if (!value) {
    return [];
  }
  if (Array.isArray(value)) {
    return value;
  }
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      return [];
    }
  }
  return [];
}

function stringifyColors(colors) {
  if (!Array.isArray(colors) || colors.length === 0) {
    return null;
  }
  return JSON.stringify(colors);
}

export function serializeFilament(filament, includeLogs = false) {
  const colors = parseColors(filament.colorsHex);
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
    colorsHex: colors,
    priceNewEUR: toNumber(filament.priceNewEUR),
    productUrl: filament.productUrl,
    location: filament.location,
    notes: filament.notes,
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

function normaliseColors(body) {
  if (!body.colorsHex) {
    return [];
  }
  if (Array.isArray(body.colorsHex)) {
    return body.colorsHex.filter(Boolean).map((c) => c.trim()).filter((c) => /^#?[0-9A-Fa-f]{6}$/.test(c)).map((c) => (c.startsWith('#') ? c : `#${c}`));
  }
  return body.colorsHex
    .split(',')
    .map((c) => c.trim())
    .filter(Boolean)
    .filter((c) => /^#?[0-9A-Fa-f]{6}$/.test(c))
    .map((c) => (c.startsWith('#') ? c : `#${c}`));
}

router.get('/', async (req, res, next) => {
  try {
    const showArchived = req.query.archived === '1';
    const items = await prisma(req).filament.findMany({
      where: showArchived ? {} : { archived: false },
      orderBy: [{ archived: 'asc' }, { name: 'asc' }]
    });
    const filaments = items.map((item) => serializeFilament(item));
    res.render('index', { filaments, showArchived });
  } catch (error) {
    next(error);
  }
});

router.get('/filaments/new', (req, res) => {
  res.render('filament_new', { defaultId: generateId() });
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
    res.render('filament_view', { filament: serializeFilament(filament, true) });
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

    const colors = normaliseColors(data);

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
        colorsHex: stringifyColors(colors),
        priceNewEUR: data.priceNewEUR ? Number(data.priceNewEUR) : null,
        productUrl: data.productUrl || null,
        location: data.location || null,
        notes: data.notes || null
      }
    });

    res.status(201).json({ filament: serializeFilament(created) });
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

export default router;

