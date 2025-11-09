import 'dotenv/config';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { PrismaClient } from '@prisma/client';
import { engine as handlebars } from 'express-handlebars';
import bodyParser from 'body-parser';

import filamentRoutes from './src/routes/filament.js';
import gcodeRoutes from './src/routes/gcode.js';
import codesRoutes from './src/routes/codes.js';
import { initI18n } from './src/lib/i18n.js';
import { buildLabelData } from './src/lib/pdf.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const prisma = new PrismaClient();

const app = express();
const PORT = process.env.PORT || 3000;

app.set('prisma', prisma);

const viewsPath = path.join(__dirname, 'src', 'views');
const publicPath = path.join(__dirname, 'src', 'public');

app.engine('html', handlebars({
  extname: '.html',
  layoutsDir: viewsPath,
  defaultLayout: '_layout.html',
  helpers: {
    json: (context) => JSON.stringify(context),
    eq: (a, b) => a === b,
    join: (arr, separator) => (Array.isArray(arr) ? arr.join(separator) : arr),
    uppercase: (value) => (typeof value === 'string' ? value.toUpperCase() : value),
    filamentUrl: (id) => `/filaments/${id}`,
    encodeURI: (value) => encodeURIComponent(value),
    formatDecimal: (value, decimals = 2) => {
      if (value === null || value === undefined) {
        return '';
      }
      return Number(value).toFixed(decimals);
    }
  }
}));

app.set('view engine', 'html');
app.set('views', viewsPath);

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static(publicPath));

initI18n(app);

app.use(filamentRoutes);
app.use(gcodeRoutes);
app.use(codesRoutes);

app.get('/print/label/:id', async (req, res, next) => {
  try {
    const id = req.params.id.toLowerCase();
    const filament = await prisma.filament.findUnique({ where: { id } });
    if (!filament) {
      return res.status(404).render('print_label', { notFound: true });
    }
    const baseUrl = process.env.BASE_URL || `${req.protocol}://${req.get('host')}`;
    const barcodeUrl = `${baseUrl}/api/codes/barcode.png?id=${encodeURIComponent(id)}`;
    const qrUrl = `${baseUrl}/api/codes/qr.png?text=${encodeURIComponent(`${baseUrl}/filaments/${id}`)}`;
    const label = buildLabelData(filament, { barcodeUrl, qrUrl });
    res.render('print_label', { label });
  } catch (error) {
    next(error);
  }
});

app.use((err, req, res, next) => {
  console.error(err);
  if (res.headersSent) {
    return next(err);
  }
  if (req.accepts('json')) {
    res.status(500).json({ error: 'internal_error' });
  } else {
    res.status(500).send('Interner Serverfehler');
  }
});

app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});

process.on('SIGINT', async () => {
  await prisma.$disconnect();
  process.exit(0);
});

