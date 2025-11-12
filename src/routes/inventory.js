import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import fsPromises from 'fs/promises';
import PDFDocument from 'pdfkit';
import { generateId } from '../lib/id.js';
import { t } from '../lib/i18n.js';

const router = Router();

function prisma(req) {
  return req.app.get('prisma');
}

const uploadRoot = path.resolve(process.cwd(), 'uploads', 'inventory');
if (!fs.existsSync(uploadRoot)) {
  fs.mkdirSync(uploadRoot, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadRoot);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname || '').toLowerCase();
    const safeExt = ['.png', '.jpg', '.jpeg', '.gif', '.webp'].includes(ext) ? ext : '.png';
    cb(null, `${Date.now()}-${generateId().slice(0, 8)}${safeExt}`);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024
  },
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) {
      return cb(new Error('invalid_file_type'));
    }
    cb(null, true);
  }
});

function normaliseEan(value) {
  if (!value) {
    return null;
  }
  const clean = value.toString().trim().replace(/[^0-9]/g, '');
  return clean.length ? clean : null;
}

function parseQuantity(value, fallback = 0) {
  if (value === undefined || value === null || value === '') {
    return fallback;
  }
  const num = Number(value);
  if (!Number.isFinite(num) || num < 0) {
    return fallback;
  }
  return Math.floor(num);
}

function parsePrice(value) {
  if (value === undefined || value === null || value === '') {
    return null;
  }
  const normalized = value.toString().trim().replace(',', '.');
  const num = Number(normalized);
  if (!Number.isFinite(num) || num < 0) {
    return null;
  }
  return num.toFixed(2);
}

function buildPublicImagePath(filename) {
  return `/uploads/inventory/${filename}`;
}

async function fetchImageFromOpenFoodFacts(ean) {
  const cleanEan = normaliseEan(ean);
  if (!cleanEan) {
    return null;
  }
  try {
    const response = await fetch(`https://world.openfoodfacts.org/api/v0/product/${cleanEan}.json`);
    if (!response.ok) {
      return null;
    }
    const data = await response.json();
    const product = data?.product;
    return product?.image_front_url || product?.image_url || null;
  } catch (error) {
    console.warn('OpenFoodFacts lookup failed', error);
    return null;
  }
}

function toViewItem(item) {
  const unitPriceNumber = item.unitPrice ? Number(item.unitPrice) : 0;
  const totalValueNumber = unitPriceNumber * item.quantity;
  return {
    ...item,
    area: item.area,
    unitPriceNumber,
    totalValueNumber,
    hasImage: Boolean(item.imageUrl || item.imageFile),
    displayEan: item.ean || '',
    internalCode: item.internalCode
  };
}

async function getInventoryAreas(req) {
  const records = await prisma(req).inventoryArea.findMany({ orderBy: { name: 'asc' } });
  return records.map((record) => record.name);
}

async function getAreaOptions(req, currentArea) {
  const areas = await getInventoryAreas(req);
  if (currentArea && !areas.includes(currentArea)) {
    return [...areas, currentArea];
  }
  return areas;
}

router.get('/inventory-overview', async (req, res, next) => {
  try {
    const showArchived = req.query.archived === '1';
    const activeAreaRaw = req.query.area?.toString().trim();
    const baseWhere = showArchived ? {} : { archived: false };
    const where = activeAreaRaw ? { ...baseWhere, area: activeAreaRaw } : baseWhere;

    const [items, areaOptions, itemAreas] = await Promise.all([
      prisma(req).inventoryItem.findMany({
        where,
        orderBy: [{ archived: 'asc' }, { name: 'asc' }]
      }),
      getInventoryAreas(req),
      prisma(req).inventoryItem.findMany({
        where: baseWhere,
        distinct: ['area'],
        select: { area: true }
      })
    ]);

    const viewItems = items.map((item) => toViewItem(item));
    const totals = viewItems.reduce(
      (acc, item) => {
        acc.totalQuantity += item.quantity;
        acc.totalValue += item.totalValueNumber;
        return acc;
      },
      { totalQuantity: 0, totalValue: 0 }
    );

    const fallbackAreas = itemAreas
      .map((record) => record.area)
      .filter((value) => typeof value === 'string' && value.trim().length);
    const areas = Array.from(new Set([...areaOptions, ...fallbackAreas])).sort((a, b) =>
      a.localeCompare(b, res.locals.lang === 'en' ? 'en-US' : 'de-DE')
    );

    res.render('inventory_overview', {
      items: viewItems,
      totals,
      showArchived,
      areas,
      activeArea: activeAreaRaw || '',
      currency: res.locals.config?.currency || 'EUR'
    });
  } catch (error) {
    next(error);
  }
});

router.get('/products/new', async (req, res, next) => {
  try {
    const areas = await getInventoryAreas(req);
    res.render('inventory_new', {
      currency: res.locals.config?.currency || 'EUR',
      autoFetch: true,
      areas
    });
  } catch (error) {
    next(error);
  }
});

router.get('/products/:id/edit', async (req, res, next) => {
  try {
    const id = req.params.id;
    const item = await prisma(req).inventoryItem.findUnique({ where: { id } });
    if (!item) {
      return res.redirect('/inventory-overview?missing=1');
    }
    const viewItem = toViewItem(item);
    const areas = await getAreaOptions(req, item.area);
    res.render('inventory_edit', {
      item: viewItem,
      currency: res.locals.config?.currency || 'EUR',
      autoFetch: false,
      areas
    });
  } catch (error) {
    next(error);
  }
});

router.post('/products', upload.single('imageFile'), async (req, res, next) => {
  const cleanupUpload = async () => {
    if (req.file?.path) {
      await fsPromises.unlink(req.file.path).catch(() => {});
    }
  };

  try {
    const areas = await getInventoryAreas(req);
    const body = req.body || {};
    const name = body.name?.toString().trim();
    if (!name) {
      await cleanupUpload();
      return res.status(400).render('inventory_new', {
        currency: res.locals.config?.currency || 'EUR',
        autoFetch: body.autoFetchImage === '1',
        error: 'inventory_error_name_required',
        form: body,
        areas
      });
    }

    const ean = normaliseEan(body.ean);
    const area = body.area?.toString().trim() || null;
    const quantity = parseQuantity(body.quantity);
    const unitPriceValue = parsePrice(body.unitPrice);
    const specialNote = body.specialNote?.toString().trim() || null;
    let internalCode = body.internalCode?.toString().trim();
    if (!internalCode) {
      internalCode = ean || `INV-${generateId().slice(0, 10).toUpperCase()}`;
    }

    let imageUrl = body.imageUrl?.toString().trim() || null;
    if (imageUrl && !/^https?:\/\//i.test(imageUrl)) {
      imageUrl = null;
    }
    let imageFile = null;
    if (req.file) {
      imageFile = buildPublicImagePath(req.file.filename);
    }
    if (!imageUrl && !imageFile && ean && body.autoFetchImage !== '0') {
      imageUrl = await fetchImageFromOpenFoodFacts(ean);
    }

    await prisma(req).inventoryItem.create({
      data: {
        name,
        ean,
        internalCode,
        area,
        quantity,
        unitPrice: unitPriceValue,
        specialNote,
        imageUrl,
        imageFile
      }
    });

    res.redirect('/inventory-overview?created=1');
  } catch (error) {
    if (error.code === 'P2002') {
      await cleanupUpload();
      const areas = await getInventoryAreas(req);
      const field = error.meta?.target?.includes('ean') ? 'ean' : 'internalCode';
      const errorKey = field === 'ean' ? 'inventory_error_ean_exists' : 'inventory_error_code_exists';
      return res.status(400).render('inventory_new', {
        currency: res.locals.config?.currency || 'EUR',
        error: errorKey,
        autoFetch: req.body?.autoFetchImage === '1',
        form: req.body,
        areas
      });
    }
    await cleanupUpload();
    next(error);
  }
});

router.post('/products/:id', upload.single('imageFile'), async (req, res, next) => {
  const cleanupUpload = async () => {
    if (req.file?.path) {
      await fsPromises.unlink(req.file.path).catch(() => {});
    }
  };

  try {
    const id = req.params.id;
    const existing = await prisma(req).inventoryItem.findUnique({ where: { id } });
    if (!existing) {
      await cleanupUpload();
      return res.redirect('/inventory-overview?missing=1');
    }

    const areas = await getInventoryAreas(req);
    const body = req.body || {};
    const name = body.name?.toString().trim();
    const existingView = toViewItem(existing);
    const ean = normaliseEan(body.ean);
    const area = body.area?.toString().trim() || null;
    const quantity = parseQuantity(body.quantity, existing.quantity);
    const rawUnitPrice = body.unitPrice;
    const specialNote = body.specialNote?.toString().trim() || null;

    let internalCode = body.internalCode?.toString().trim();
    if (!internalCode) {
      internalCode = ean || existing.internalCode || `INV-${generateId().slice(0, 10).toUpperCase()}`;
    }

    if (!name) {
      await cleanupUpload();
      return res.status(400).render('inventory_edit', {
        item: {
          ...existingView,
          name,
          displayEan: ean || existingView.displayEan,
          quantity,
          unitPriceNumber: Number(rawUnitPrice) || existingView.unitPriceNumber,
          specialNote,
          internalCode,
          area,
          imageUrl: body.imageUrl?.toString().trim() || existingView.imageUrl
        },
        currency: res.locals.config?.currency || 'EUR',
        autoFetch: body.autoFetchImage === '1',
        error: 'inventory_error_name_required',
        areas
      });
    }

    const unitPriceNumberInput =
      rawUnitPrice !== undefined && rawUnitPrice !== '' ? Number(rawUnitPrice) : existingView.unitPriceNumber;

    if (ean && ean !== existing.ean) {
      const duplicateEan = await prisma(req).inventoryItem.findUnique({ where: { ean } });
      if (duplicateEan) {
        await cleanupUpload();
        return res.status(400).render('inventory_edit', {
          item: {
            ...existingView,
            name,
            displayEan: ean,
            quantity,
            unitPriceNumber: unitPriceNumberInput,
            specialNote,
            internalCode,
            area,
            imageUrl: body.imageUrl?.toString().trim() || existingView.imageUrl
          },
          currency: res.locals.config?.currency || 'EUR',
          autoFetch: body.autoFetchImage === '1',
          error: 'inventory_error_ean_exists',
          areas
        });
      }
    }

    if (internalCode !== existing.internalCode) {
      const duplicateCode = await prisma(req).inventoryItem.findUnique({ where: { internalCode } });
      if (duplicateCode) {
        await cleanupUpload();
        return res.status(400).render('inventory_edit', {
          item: {
            ...existingView,
            name,
            displayEan: ean || existingView.displayEan,
            internalCode,
            quantity,
            unitPriceNumber: unitPriceNumberInput,
            specialNote,
            area,
            imageUrl: body.imageUrl?.toString().trim() || existingView.imageUrl
          },
          currency: res.locals.config?.currency || 'EUR',
          autoFetch: body.autoFetchImage === '1',
          error: 'inventory_error_code_exists',
          areas
        });
      }
    }

    const parsedPrice = parsePrice(body.unitPrice);
    const finalUnitPrice = parsedPrice !== null ? parsedPrice : existing.unitPrice;
    const removeImage = body.removeImage === '1';

    let imageUrl = body.imageUrl?.toString().trim() || null;
    if (imageUrl && !/^https?:\/\//i.test(imageUrl)) {
      imageUrl = null;
    }

    let imageFile = existing.imageFile;
    let storedImageUrl = existing.imageUrl;

    const removeCurrentFile = async () => {
      if (imageFile) {
        const absolute = path.resolve(process.cwd(), imageFile.replace(/^\//, ''));
        await fsPromises.unlink(absolute).catch(() => {});
        imageFile = null;
      }
    };

    if (req.file) {
      await removeCurrentFile();
      imageFile = buildPublicImagePath(req.file.filename);
      storedImageUrl = null;
    } else if (imageUrl) {
      await removeCurrentFile();
      imageFile = null;
      storedImageUrl = imageUrl;
    } else if (removeImage) {
      await removeCurrentFile();
      imageFile = null;
      storedImageUrl = null;
    }

    if (!storedImageUrl && !imageFile && ean && body.autoFetchImage === '1') {
      storedImageUrl = await fetchImageFromOpenFoodFacts(ean);
    }

    await prisma(req).inventoryItem.update({
      where: { id },
      data: {
        name,
        ean,
        internalCode,
        quantity,
        unitPrice: finalUnitPrice,
        specialNote,
        area,
        imageUrl: storedImageUrl,
        imageFile
      }
    });

    res.redirect('/inventory-overview?updated=1');
  } catch (error) {
    await cleanupUpload();
    next(error);
  }
});

router.post('/api/inventory/products/:id/quantity', async (req, res, next) => {
  try {
    const id = req.params.id;
    const quantity = parseQuantity(req.body.quantity);
    const updated = await prisma(req).inventoryItem.update({
      where: { id },
      data: { quantity }
    });
    res.json({
      item: {
        id: updated.id,
        quantity: updated.quantity,
        unitPrice: updated.unitPrice ? Number(updated.unitPrice) : 0
      }
    });
  } catch (error) {
    next(error);
  }
});

router.post('/api/inventory/products/:id/archive', async (req, res, next) => {
  try {
    const id = req.params.id;
    const updated = await prisma(req).inventoryItem.update({
      where: { id },
      data: { archived: true }
    });
    res.json({ item: updated });
  } catch (error) {
    next(error);
  }
});

router.post('/api/inventory/products/:id/unarchive', async (req, res, next) => {
  try {
    const id = req.params.id;
    const updated = await prisma(req).inventoryItem.update({
      where: { id },
      data: { archived: false }
    });
    res.json({ item: updated });
  } catch (error) {
    next(error);
  }
});

router.delete('/api/inventory/products/:id', async (req, res, next) => {
  try {
    const id = req.params.id;
    const item = await prisma(req).inventoryItem.delete({
      where: { id }
    });
    if (item.imageFile) {
      const absolute = path.resolve(process.cwd(), item.imageFile.replace(/^\//, ''));
      await fsPromises.unlink(absolute).catch(() => {});
    }
    res.status(204).end();
  } catch (error) {
    next(error);
  }
});

router.get('/inventory-audit', async (req, res, next) => {
  try {
    const includeFilaments = Boolean(req.app.locals.config?.includeFilamentsInInventoryReport);
    const inventoryItems = await prisma(req).inventoryItem.findMany({
      where: { archived: false },
      orderBy: { name: 'asc' }
    });

    const viewItems = inventoryItems.map((item) => toViewItem(item));
    let combinedItems = [...viewItems];

    if (includeFilaments) {
      const filaments = await prisma(req).filament.findMany({
        where: { archived: false },
        orderBy: { name: 'asc' }
      });
      const filamentEntries = filaments.map((item) => ({
        id: `filament-${item.id}`,
        name: item.name,
        quantity: Number(item.quantity ?? 0),
        unitPriceNumber: 0,
        totalValueNumber: 0,
        displayEan: item.id,
        internalCode: item.id,
        hasImage: false,
        area: t(res.locals.lang, 'inventory_area_filament'),
        specialNote: t(res.locals.lang, 'inventory_filament_notice')
      }));
      combinedItems = [...combinedItems, ...filamentEntries];
    }

    const totals = combinedItems.reduce(
      (acc, item) => {
        acc.totalExpected += item.quantity;
        acc.totalValue += item.totalValueNumber || 0;
        return acc;
      },
      { totalExpected: 0, totalValue: 0 }
    );

    res.render('inventory_audit', {
      items: combinedItems,
      totals,
      includeFilamentsInReport: includeFilaments,
      currency: res.locals.config?.currency || 'EUR'
    });
  } catch (error) {
    next(error);
  }
});

async function loadInventoryImageBuffer(item) {
  try {
    if (item.imageFile) {
      const filePath = path.resolve(process.cwd(), item.imageFile.replace(/^\//, ''));
      const stat = await fsPromises.stat(filePath).catch(() => null);
      if (stat?.isFile()) {
        return fsPromises.readFile(filePath);
      }
    }
    if (item.imageUrl) {
      const response = await fetch(item.imageUrl);
      if (response.ok) {
        const arrayBuffer = await response.arrayBuffer();
        return Buffer.from(arrayBuffer);
      }
    }
  } catch (error) {
    console.warn('inventory: unable to load image for PDF export', error);
  }
  return null;
}

router.post('/inventory/export', async (req, res, next) => {
  try {
    const countsInput = req.body?.counts && typeof req.body.counts === 'object' ? req.body.counts : {};
    const includeFilaments = Boolean(req.app.locals.config?.includeFilamentsInInventoryReport);
    const items = await prisma(req).inventoryItem.findMany({
      where: { archived: false },
      orderBy: [{ area: 'asc' }, { name: 'asc' }]
    });
    const now = new Date();
    const filename = `inventur_${now.toISOString().slice(0, 10)}.pdf`;
    const langKey = res.locals.lang || req.app.locals.lang || 'de';
    const locale = langKey === 'en' ? 'en-US' : 'de-DE';
    const currency = res.locals.config?.currency || 'EUR';

    const doc = new PDFDocument({ size: 'A4', margin: 40 });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    doc.pipe(res);

    doc.fontSize(18).text(t(langKey, 'inventory_audit_title'), { align: 'center' });
    doc.moveDown(0.5);
    doc.fontSize(10).text(`${t(langKey, 'inventory_export_generated_on')}: ${now.toLocaleString(locale)}`);
    doc.moveDown();

    const columns = [
      { label: t(langKey, 'inventory_product_image'), width: 50, align: 'center' },
      { label: t(langKey, 'inventory_product_name'), width: 105, align: 'left' },
      { label: t(langKey, 'inventory_area_column'), width: 50, align: 'left' },
      { label: t(langKey, 'inventory_product_ean'), width: 50, align: 'left' },
      { label: t(langKey, 'inventory_internal_code'), width: 50, align: 'left' },
      { label: t(langKey, 'inventory_unit_price'), width: 45, align: 'right' },
      { label: t(langKey, 'inventory_quantity_expected'), width: 40, align: 'right' },
      { label: t(langKey, 'inventory_quantity_counted'), width: 40, align: 'right' },
      { label: t(langKey, 'inventory_difference'), width: 35, align: 'right' },
      { label: t(langKey, 'inventory_total_price'), width: 45, align: 'right' }
    ];

    const drawRow = (values, isHeader = false) => {
      const startX = doc.x;
      const startY = doc.y;
      let currentX = startX;
      let maxHeight = 0;
      columns.forEach((column, index) => {
        doc.font(isHeader ? 'Helvetica-Bold' : 'Helvetica');
        const cell = values[index];
        if (cell && typeof cell === 'object' && cell.type === 'image' && cell.buffer) {
          try {
            const fitWidth = column.width - 6;
            const fitHeight = 40;
            doc.image(cell.buffer, currentX + (column.width - fitWidth) / 2, startY, {
              fit: [fitWidth, fitHeight]
            });
            maxHeight = Math.max(maxHeight, fitHeight + 8);
          } catch (error) {
            doc.text('', currentX, startY, {
              width: column.width,
              align: column.align
            });
            maxHeight = Math.max(maxHeight, 18);
          }
        } else {
          const text = cell ?? '';
          doc.text(text, currentX, startY, {
            width: column.width,
            align: column.align
          });
          const blockHeight = doc.heightOfString(String(text || ''), {
            width: column.width
          });
          maxHeight = Math.max(maxHeight, blockHeight + 6);
        }
        currentX += column.width;
      });
      doc.x = startX;
      if (maxHeight < 16) {
        maxHeight = isHeader ? 18 : 14;
      }
      doc.y = startY + maxHeight;
    };

    drawRow(columns.map((c) => c.label), true);

    let expectedTotal = 0;
    let countedTotal = 0;
    let totalValue = 0;
    const pageBottom = () => doc.page.height - doc.page.margins.bottom - 40;

    const combinedItems = [...items];
    if (includeFilaments) {
      const filaments = await prisma(req).filament.findMany({
        where: { archived: false },
        orderBy: [{ name: 'asc' }]
      });
      filaments.forEach((filament) => {
        combinedItems.push({
          id: `filament-${filament.id}`,
          name: filament.name,
          quantity: Number(filament.quantity ?? 0),
          area: t(langKey, 'inventory_area_filament'),
          ean: filament.id,
          internalCode: filament.id,
          unitPrice: null,
          imageUrl: null,
          imageFile: null,
          specialNote: t(langKey, 'inventory_filament_notice')
        });
      });
    }

    for (const item of combinedItems) {
      const expected = item.quantity;
      const counted = parseQuantity(countsInput[item.id], expected);
      const difference = counted - expected;
      const unitPriceNumber = item.unitPrice ? Number(item.unitPrice) : 0;
      const rowTotal = unitPriceNumber * counted;

      expectedTotal += expected;
      countedTotal += counted;
      totalValue += rowTotal;

      if (doc.y > pageBottom()) {
        doc.addPage();
        drawRow(columns.map((c) => c.label), true);
      }

      const imageBuffer = await loadInventoryImageBuffer(item);

      drawRow([
        imageBuffer ? { type: 'image', buffer: imageBuffer } : '',
        item.name,
        item.area || '',
        item.ean || '',
        item.internalCode || '',
        unitPriceNumber.toFixed(2),
        expected.toString(),
        counted.toString(),
        difference > 0 ? `+${difference}` : difference.toString(),
        rowTotal.toFixed(2)
      ]);
    }

    doc.moveDown();
    doc.font('Helvetica-Bold').fontSize(12).text(t(langKey, 'inventory_summary_title'));
    doc.moveDown(0.4);
    doc.font('Helvetica').fontSize(11);
    doc.text(`${t(langKey, 'inventory_total_expected')}: ${expectedTotal}`);
    doc.text(`${t(langKey, 'inventory_total_counted')}: ${countedTotal}`);
    const diffTotal = countedTotal - expectedTotal;
    doc.text(`${t(langKey, 'inventory_total_difference')}: ${diffTotal > 0 ? `+${diffTotal}` : diffTotal}`);
    doc.text(`${t(langKey, 'inventory_total_value')}: ${totalValue.toFixed(2)} ${currency}`);

    doc.end();
  } catch (error) {
    next(error);
  }
});

export default router;

