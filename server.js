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
import inventoryRoutes from './src/routes/inventory.js';
import { initI18n } from './src/lib/i18n.js';
import { buildLabelData } from './src/lib/pdf.js';
import { loadConfig, saveConfig, buildUiMeta, defaultConfig } from './src/lib/config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const prisma = new PrismaClient();

const app = express();
// Versuche Port 80, falls nicht verfügbar (z.B. keine Admin-Rechte) → Port 3000
const DEFAULT_PORT = process.env.PORT ? parseInt(process.env.PORT) : 80;
const FALLBACK_PORT = 3000;
const HOST = process.env.HOST || '0.0.0.0'; // Hört auf allen Interfaces für Netzwerk-Zugriff
const APP_MODE = (process.env.APP_MODE || 'both').toLowerCase();
const FILAMENT_ENABLED = APP_MODE === 'both' || APP_MODE === 'filament';
const INVENTORY_ENABLED = APP_MODE === 'both' || APP_MODE === 'inventur';
console.log(`Server mode: ${APP_MODE}`);

const lengthOptions = [
  { value: 'mm', label: 'mm' },
  { value: 'inch', label: 'inch' }
];

const weightOptions = [
  { value: 'g', label: 'g' },
  { value: 'oz', label: 'oz' },
  { value: 'lb', label: 'lb' }
];

const currencyOptions = [
  { value: 'AED', label: 'AED – United Arab Emirates Dirham' },
  { value: 'AFN', label: 'AFN – Afghan Afghani' },
  { value: 'ALL', label: 'ALL – Albanian Lek' },
  { value: 'AMD', label: 'AMD – Armenian Dram' },
  { value: 'ANG', label: 'ANG – Netherlands Antillean Guilder' },
  { value: 'AOA', label: 'AOA – Angolan Kwanza' },
  { value: 'ARS', label: 'ARS – Argentine Peso' },
  { value: 'AUD', label: 'AUD – Australian Dollar' },
  { value: 'AWG', label: 'AWG – Aruban Florin' },
  { value: 'AZN', label: 'AZN – Azerbaijani Manat' },
  { value: 'BAM', label: 'BAM – Bosnia and Herzegovina Convertible Mark' },
  { value: 'BBD', label: 'BBD – Barbadian Dollar' },
  { value: 'BDT', label: 'BDT – Bangladeshi Taka' },
  { value: 'BGN', label: 'BGN – Bulgarian Lev' },
  { value: 'BHD', label: 'BHD – Bahraini Dinar' },
  { value: 'BIF', label: 'BIF – Burundian Franc' },
  { value: 'BMD', label: 'BMD – Bermudian Dollar' },
  { value: 'BND', label: 'BND – Brunei Dollar' },
  { value: 'BOB', label: 'BOB – Bolivian Boliviano' },
  { value: 'BRL', label: 'BRL – Brazilian Real' },
  { value: 'BSD', label: 'BSD – Bahamian Dollar' },
  { value: 'BTN', label: 'BTN – Bhutanese Ngultrum' },
  { value: 'BWP', label: 'BWP – Botswana Pula' },
  { value: 'BYN', label: 'BYN – Belarusian Ruble' },
  { value: 'BZD', label: 'BZD – Belize Dollar' },
  { value: 'CAD', label: 'CAD – Canadian Dollar' },
  { value: 'CDF', label: 'CDF – Congolese Franc' },
  { value: 'CHF', label: 'CHF – Swiss Franc' },
  { value: 'CLP', label: 'CLP – Chilean Peso' },
  { value: 'CNY', label: 'CNY – Chinese Yuan' },
  { value: 'COP', label: 'COP – Colombian Peso' },
  { value: 'CRC', label: 'CRC – Costa Rican Colón' },
  { value: 'CUP', label: 'CUP – Cuban Peso' },
  { value: 'CVE', label: 'CVE – Cape Verdean Escudo' },
  { value: 'CZK', label: 'CZK – Czech Koruna' },
  { value: 'DJF', label: 'DJF – Djiboutian Franc' },
  { value: 'DKK', label: 'DKK – Danish Krone' },
  { value: 'DOP', label: 'DOP – Dominican Peso' },
  { value: 'DZD', label: 'DZD – Algerian Dinar' },
  { value: 'EGP', label: 'EGP – Egyptian Pound' },
  { value: 'ERN', label: 'ERN – Eritrean Nakfa' },
  { value: 'ETB', label: 'ETB – Ethiopian Birr' },
  { value: 'EUR', label: 'EUR – Euro' },
  { value: 'FJD', label: 'FJD – Fijian Dollar' },
  { value: 'FKP', label: 'FKP – Falkland Islands Pound' },
  { value: 'FOK', label: 'FOK – Faroese Króna' },
  { value: 'GBP', label: 'GBP – British Pound' },
  { value: 'GEL', label: 'GEL – Georgian Lari' },
  { value: 'GGP', label: 'GGP – Guernsey Pound' },
  { value: 'GHS', label: 'GHS – Ghanaian Cedi' },
  { value: 'GIP', label: 'GIP – Gibraltar Pound' },
  { value: 'GMD', label: 'GMD – Gambian Dalasi' },
  { value: 'GNF', label: 'GNF – Guinean Franc' },
  { value: 'GTQ', label: 'GTQ – Guatemalan Quetzal' },
  { value: 'GYD', label: 'GYD – Guyanaese Dollar' },
  { value: 'HKD', label: 'HKD – Hong Kong Dollar' },
  { value: 'HNL', label: 'HNL – Honduran Lempira' },
  { value: 'HRK', label: 'HRK – Croatian Kuna' },
  { value: 'HTG', label: 'HTG – Haitian Gourde' },
  { value: 'HUF', label: 'HUF – Hungarian Forint' },
  { value: 'IDR', label: 'IDR – Indonesian Rupiah' },
  { value: 'ILS', label: 'ILS – Israeli New Shekel' },
  { value: 'IMP', label: 'IMP – Isle of Man Pound' },
  { value: 'INR', label: 'INR – Indian Rupee' },
  { value: 'IQD', label: 'IQD – Iraqi Dinar' },
  { value: 'IRR', label: 'IRR – Iranian Rial' },
  { value: 'ISK', label: 'ISK – Icelandic Króna' },
  { value: 'JEP', label: 'JEP – Jersey Pound' },
  { value: 'JMD', label: 'JMD – Jamaican Dollar' },
  { value: 'JOD', label: 'JOD – Jordanian Dinar' },
  { value: 'JPY', label: 'JPY – Japanese Yen' },
  { value: 'KES', label: 'KES – Kenyan Shilling' },
  { value: 'KGS', label: 'KGS – Kyrgyzstani Som' },
  { value: 'KHR', label: 'KHR – Cambodian Riel' },
  { value: 'KID', label: 'KID – Kiribati Dollar' },
  { value: 'KMF', label: 'KMF – Comorian Franc' },
  { value: 'KRW', label: 'KRW – South Korean Won' },
  { value: 'KWD', label: 'KWD – Kuwaiti Dinar' },
  { value: 'KYD', label: 'KYD – Cayman Islands Dollar' },
  { value: 'KZT', label: 'KZT – Kazakhstani Tenge' },
  { value: 'LAK', label: 'LAK – Lao Kip' },
  { value: 'LBP', label: 'LBP – Lebanese Pound' },
  { value: 'LKR', label: 'LKR – Sri Lankan Rupee' },
  { value: 'LRD', label: 'LRD – Liberian Dollar' },
  { value: 'LSL', label: 'LSL – Lesotho Loti' },
  { value: 'LYD', label: 'LYD – Libyan Dinar' },
  { value: 'MAD', label: 'MAD – Moroccan Dirham' },
  { value: 'MDL', label: 'MDL – Moldovan Leu' },
  { value: 'MGA', label: 'MGA – Malagasy Ariary' },
  { value: 'MKD', label: 'MKD – Macedonian Denar' },
  { value: 'MMK', label: 'MMK – Myanmar Kyat' },
  { value: 'MNT', label: 'MNT – Mongolian Tögrög' },
  { value: 'MOP', label: 'MOP – Macanese Pataca' },
  { value: 'MRU', label: 'MRU – Mauritanian Ouguiya' },
  { value: 'MUR', label: 'MUR – Mauritian Rupee' },
  { value: 'MVR', label: 'MVR – Maldivian Rufiyaa' },
  { value: 'MWK', label: 'MWK – Malawian Kwacha' },
  { value: 'MXN', label: 'MXN – Mexican Peso' },
  { value: 'MYR', label: 'MYR – Malaysian Ringgit' },
  { value: 'MZN', label: 'MZN – Mozambican Metical' },
  { value: 'NAD', label: 'NAD – Namibian Dollar' },
  { value: 'NGN', label: 'NGN – Nigerian Naira' },
  { value: 'NIO', label: 'NIO – Nicaraguan Córdoba' },
  { value: 'NOK', label: 'NOK – Norwegian Krone' },
  { value: 'NPR', label: 'NPR – Nepalese Rupee' },
  { value: 'NZD', label: 'NZD – New Zealand Dollar' },
  { value: 'OMR', label: 'OMR – Omani Rial' },
  { value: 'PAB', label: 'PAB – Panamanian Balboa' },
  { value: 'PEN', label: 'PEN – Peruvian Sol' },
  { value: 'PGK', label: 'PGK – Papua New Guinean Kina' },
  { value: 'PHP', label: 'PHP – Philippine Peso' },
  { value: 'PKR', label: 'PKR – Pakistani Rupee' },
  { value: 'PLN', label: 'PLN – Polish Złoty' },
  { value: 'PYG', label: 'PYG – Paraguayan Guaraní' },
  { value: 'QAR', label: 'QAR – Qatari Riyal' },
  { value: 'RON', label: 'RON – Romanian Leu' },
  { value: 'RSD', label: 'RSD – Serbian Dinar' },
  { value: 'RUB', label: 'RUB – Russian Ruble' },
  { value: 'RWF', label: 'RWF – Rwandan Franc' },
  { value: 'SAR', label: 'SAR – Saudi Riyal' },
  { value: 'SBD', label: 'SBD – Solomon Islands Dollar' },
  { value: 'SCR', label: 'SCR – Seychellois Rupee' },
  { value: 'SDG', label: 'SDG – Sudanese Pound' },
  { value: 'SEK', label: 'SEK – Swedish Krona' },
  { value: 'SGD', label: 'SGD – Singapore Dollar' },
  { value: 'SHP', label: 'SHP – Saint Helena Pound' },
  { value: 'SLE', label: 'SLE – Sierra Leonean Leone' },
  { value: 'SOS', label: 'SOS – Somali Shilling' },
  { value: 'SRD', label: 'SRD – Surinamese Dollar' },
  { value: 'SSP', label: 'SSP – South Sudanese Pound' },
  { value: 'STN', label: 'STN – São Tomé and Príncipe Dobra' },
  { value: 'SYP', label: 'SYP – Syrian Pound' },
  { value: 'SZL', label: 'SZL – Eswatini Lilangeni' },
  { value: 'THB', label: 'THB – Thai Baht' },
  { value: 'TJS', label: 'TJS – Tajikistani Somoni' },
  { value: 'TMT', label: 'TMT – Turkmenistani Manat' },
  { value: 'TND', label: 'TND – Tunisian Dinar' },
  { value: 'TOP', label: 'TOP – Tongan Paʻanga' },
  { value: 'TRY', label: 'TRY – Turkish Lira' },
  { value: 'TTD', label: 'TTD – Trinidad and Tobago Dollar' },
  { value: 'TVD', label: 'TVD – Tuvaluan Dollar' },
  { value: 'TWD', label: 'TWD – New Taiwan Dollar' },
  { value: 'TZS', label: 'TZS – Tanzanian Shilling' },
  { value: 'UAH', label: 'UAH – Ukrainian Hryvnia' },
  { value: 'UGX', label: 'UGX – Ugandan Shilling' },
  { value: 'USD', label: 'USD – United States Dollar' },
  { value: 'UYU', label: 'UYU – Uruguayan Peso' },
  { value: 'UZS', label: 'UZS – Uzbekistani Som' },
  { value: 'VES', label: 'VES – Venezuelan Bolívar' },
  { value: 'VND', label: 'VND – Vietnamese đồng' },
  { value: 'VUV', label: 'VUV – Vanuatu Vatu' },
  { value: 'WST', label: 'WST – Samoan Tālā' },
  { value: 'XAF', label: 'XAF – Central African CFA Franc' },
  { value: 'XCD', label: 'XCD – Eastern Caribbean Dollar' },
  { value: 'XOF', label: 'XOF – West African CFA Franc' },
  { value: 'XPF', label: 'XPF – CFP Franc' },
  { value: 'YER', label: 'YER – Yemeni Rial' },
  { value: 'ZAR', label: 'ZAR – South African Rand' },
  { value: 'ZMW', label: 'ZMW – Zambian Kwacha' },
  { value: 'ZWL', label: 'ZWL – Zimbabwean Dollar' }
];

const currencySet = new Set(currencyOptions.map((option) => option.value));

const landingNavLinks = [
  { href: '/', labelKey: 'menu_dashboard' },
  { href: '/settings', labelKey: 'menu_settings' }
];

const filamentNavLinks = [
  { href: '/', labelKey: 'menu_dashboard' },
  { href: '/filament-overview', labelKey: 'menu_filament_overview' },
  { href: '/filaments/new', labelKey: 'menu_new' },
  { href: '/inventory-overview', labelKey: 'menu_inventory' },
  { href: '/upload-gcode', labelKey: 'menu_upload' }
];

const inventoryNavLinks = [
  { href: '/', labelKey: 'menu_dashboard' },
  { href: '/inventory-overview', labelKey: 'menu_inventory_overview' },
  { href: '/products/new', labelKey: 'menu_inventory_new_product' },
  { href: '/inventory-audit', labelKey: 'menu_inventory_pdf_export' }
];

const navContextMap = {
  landing: landingNavLinks,
  filament: filamentNavLinks,
  inventory: inventoryNavLinks
};

const brandKeyMap = {
  landing: 'brand_landing',
  filament: 'brand_filament',
  inventory: 'brand_inventory'
};

const requiredFieldDefs = [
  { key: 'name', labelKey: 'name' },
  { key: 'manufacturer', labelKey: 'manufacturer' },
  { key: 'material', labelKey: 'material' },
  { key: 'diameterMm', labelKey: 'diameter' },
  { key: 'netWeightG', labelKey: 'net_weight' },
  { key: 'remainingG', labelKey: 'remaining' },
  { key: 'priceNewEUR', labelKey: 'price_new' },
  { key: 'productUrl', labelKey: 'product_link' },
  { key: 'notes', labelKey: 'notes' },
  { key: 'colorsHex', labelKey: 'colors' }
];

const appConfig = loadConfig();
app.locals.config = appConfig;
app.locals.ui = buildUiMeta(appConfig, requiredFieldDefs);
app.locals.requiredFieldDefs = requiredFieldDefs;
app.locals.currencyOptions = currencyOptions;
app.locals.appMode = APP_MODE;
app.locals.filamentEnabled = FILAMENT_ENABLED;
app.locals.inventoryEnabled = INVENTORY_ENABLED;
app.locals.navLinks = landingNavLinks;

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
    t: function translateHelper(key, options) {
      const root = options?.data?.root;
      if (root && typeof root.t === 'function') {
        return root.t(key);
      }
      if (typeof this?.t === 'function') {
        return this.t(key);
      }
      return key;
    },
    formatDecimal: (value, decimals = 2) => {
      if (value === null || value === undefined) {
        return '';
      }
      return Number(value).toFixed(decimals);
    },
    formatLength: (value, unit) => {
      const num = Number(value);
      if (!Number.isFinite(num)) {
        return value;
      }
      if (unit === 'inch') {
        return (num / 25.4).toFixed(3);
      }
      return num.toFixed(2);
    },
    formatWeight: (value, unit) => {
      const num = Number(value);
      if (!Number.isFinite(num)) {
        return value;
      }
      if (unit === 'oz') {
        return (num / 28.349523125).toFixed(2);
      }
      if (unit === 'lb') {
        return (num / 453.59237).toFixed(2);
      }
      return num.toFixed(0);
    }
  }
}));

app.set('view engine', 'html');
app.set('views', viewsPath);

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static(publicPath));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
// Icons für Favicon bereitstellen
app.use('/assets/icons', express.static(path.join(__dirname, 'assets', 'icons')));

const filamentPathPrefixes = ['/filament', '/filaments', '/upload-gcode', '/gcode', '/print'];
const inventoryPathPrefixes = ['/inventory-overview', '/inventory', '/inventory-audit', '/products'];

function resolveNavContext(pathname) {
  if (APP_MODE === 'filament') {
    return 'filament';
  }
  if (APP_MODE === 'inventur') {
    return 'inventory';
  }

  if (pathname === '/') {
    return 'landing';
  }

  if (inventoryPathPrefixes.some((prefix) => pathname.startsWith(prefix))) {
    return 'inventory';
  }

  if (filamentPathPrefixes.some((prefix) => pathname.startsWith(prefix))) {
    return 'filament';
  }

  return 'landing';
}

app.use((req, res, next) => {
  const pathname = req.path.toLowerCase();
  const context = resolveNavContext(pathname);

  res.locals.ui = req.app.locals.ui;
  res.locals.config = req.app.locals.config;
  res.locals.requiredFieldDefs = req.app.locals.requiredFieldDefs;
  res.locals.currencyOptions = req.app.locals.currencyOptions;
  res.locals.appMode = req.app.locals.appMode;
  res.locals.navLinks = navContextMap[context] || landingNavLinks;
  res.locals.topbarBrandKey = brandKeyMap[context] || 'app_title';
  res.locals.topbarLogoKey = context === 'inventory' ? 'brand_inventory' : null;
  res.locals.showLanguageSwitcher = true;
  next();
});

initI18n(app);

app.get('/', async (req, res, next) => {
  try {
    const [
      totalFilaments,
      archivedFilaments,
      filamentQuantityAgg,
      recentFilamentsRaw,
      totalInventory,
      archivedInventory,
      inventoryQuantityAgg,
      recentInventoryRaw
    ] = await Promise.all([
      prisma.filament.count(),
      prisma.filament.count({ where: { archived: true } }),
      prisma.filament.aggregate({ _sum: { quantity: true } }),
      prisma.filament.findMany({
        orderBy: { updatedAt: 'desc' },
        take: 5,
        select: {
          id: true,
          name: true,
          material: true,
          quantity: true,
          remainingG: true,
          priceNewEUR: true,
          updatedAt: true
        }
      }),
      prisma.inventoryItem.count(),
      prisma.inventoryItem.count({ where: { archived: true } }),
      prisma.inventoryItem.aggregate({ _sum: { quantity: true } }),
      INVENTORY_ENABLED
        ? prisma.inventoryItem.findMany({
            orderBy: { updatedAt: 'desc' },
            take: 5,
            select: {
              id: true,
              name: true,
              area: true,
              quantity: true,
              unitPrice: true,
              ean: true,
              internalCode: true,
              imageUrl: true,
              imageFile: true,
              updatedAt: true,
              archived: true
            }
          })
        : []
    ]);

    const filamentStats = {
      total: totalFilaments,
      archived: archivedFilaments,
      active: totalFilaments - archivedFilaments,
      totalQuantity: Number(filamentQuantityAgg._sum.quantity || 0)
    };

    const inventoryStats = {
      total: totalInventory,
      archived: archivedInventory,
      active: totalInventory - archivedInventory,
      totalQuantity: Number(inventoryQuantityAgg._sum.quantity || 0)
    };

    const recentFilaments = recentFilamentsRaw.map((item) => ({
      id: item.id,
      name: item.name,
      material: item.material,
      quantity: item.quantity,
      remainingG: Number(item.remainingG),
      priceNewEUR: item.priceNewEUR ? Number(item.priceNewEUR) : null,
      updatedAt: item.updatedAt
    }));

    const recentInventory = (recentInventoryRaw || []).map((item) => {
      const unitPriceRaw = item.unitPrice;
      const unitPrice =
        unitPriceRaw && typeof unitPriceRaw.toNumber === 'function'
          ? unitPriceRaw.toNumber()
          : Number(unitPriceRaw || 0);
      const quantity = Number(item.quantity || 0);
      const totalValue = unitPrice * quantity;
      return {
        id: item.id,
        name: item.name,
        area: item.area || '',
        quantity,
        unitPrice,
        totalValue,
        ean: item.ean || '',
        internalCode: item.internalCode,
        imageUrl: item.imageUrl,
        imageFile: item.imageFile,
        archived: item.archived,
        updatedAt: item.updatedAt
      };
    });

    res.render('index', {
      appMode: APP_MODE,
      filamentEnabled: FILAMENT_ENABLED,
      inventoryEnabled: INVENTORY_ENABLED,
      filamentStats,
      inventoryStats,
      recentFilaments,
      recentInventory,
      currency: req.app.locals.config?.currency || 'EUR'
    });
  } catch (error) {
    next(error);
  }
});

if (FILAMENT_ENABLED) {
  app.use(filamentRoutes);
  app.use(gcodeRoutes);

  app.get('/print/label/:id', async (req, res, next) => {
    try {
      const id = req.params.id.toLowerCase();
      const filament = await prisma.filament.findUnique({ where: { id } });
      if (!filament) {
        return res.status(404).render('print_label', { notFound: true });
      }
      const hostUrl = `${req.protocol}://${req.get('host')}`;
      const envBase = process.env.BASE_URL && process.env.BASE_URL.trim();
      const baseUrl = envBase && /^https?:\/\//i.test(envBase) ? envBase.replace(/\/$/, '') : hostUrl;
      const barcodeUrl = `/api/codes/barcode.png?id=${encodeURIComponent(id)}`;
      const qrTarget = `${baseUrl}/filaments/${id}`;
      const qrUrl = `/api/codes/qr.png?text=${encodeURIComponent(qrTarget)}`;

      const labelSizes = req.app.locals.config.labelSizes || defaultConfig.labelSizes;
      const mmToPx = (mm) => Number(((mm / 25.4) * 96).toFixed(2));
      const dims = {
        barcodeWidthMm: labelSizes.barcodeWidthMm ?? defaultConfig.labelSizes.barcodeWidthMm,
        barcodeHeightMm: labelSizes.barcodeHeightMm ?? defaultConfig.labelSizes.barcodeHeightMm,
        qrSizeMm: labelSizes.qrSizeMm ?? defaultConfig.labelSizes.qrSizeMm
      };
      const dimensionPx = {
        barcodeWidthPx: mmToPx(dims.barcodeWidthMm),
        barcodeHeightPx: mmToPx(dims.barcodeHeightMm),
        qrSizePx: mmToPx(dims.qrSizeMm)
      };

      const label = buildLabelData(filament, { barcodeUrl, qrUrl, dimensions: { ...dims, ...dimensionPx } });
      const labelType = ['1d', '2d', 'both'].includes(req.query.type) ? req.query.type : 'both';
      res.render('print_label', { label, labelType });
    } catch (error) {
      next(error);
    }
  });
}

if (INVENTORY_ENABLED) {
  app.use(inventoryRoutes);
}

app.get('/settings', async (req, res, next) => {
  try {
    const prismaClient = req.app.get('prisma');
    const areaRecords = await prismaClient.inventoryArea.findMany({ orderBy: { name: 'asc' } });
    res.render('settings', {
      config: req.app.locals.config,
      ui: req.app.locals.ui,
      lengthOptions,
      weightOptions,
      currencyOptions,
      requiredFieldDefs,
      includeFilamentsInInventoryReport: Boolean(req.app.locals.config?.includeFilamentsInInventoryReport),
      inventoryAreasText: areaRecords.map((area) => area.name).join('\n'),
      inventoryAreasList: areaRecords.map((area) => area.name),
      saved: req.query.saved === '1'
    });
  } catch (error) {
    next(error);
  }
});

app.post('/settings', async (req, res, next) => {
  const incoming = req.body || {};
  const current = { ...req.app.locals.config };

  current.currency = incoming.currency?.trim() || defaultConfig.currency;
  current.lengthUnit = lengthOptions.some((opt) => opt.value === incoming.lengthUnit)
    ? incoming.lengthUnit
    : defaultConfig.lengthUnit;
  current.weightUnit = weightOptions.some((opt) => opt.value === incoming.weightUnit)
    ? incoming.weightUnit
    : defaultConfig.weightUnit;

  const requiredFields = { ...defaultConfig.requiredFields };
  const submittedRequired = incoming.requiredFields || {};
  Object.keys(requiredFields).forEach((key) => {
    requiredFields[key] = Boolean(submittedRequired[key]);
  });
  current.requiredFields = requiredFields;

  const parseLengthInput = (value, fallback) => {
    const raw = value !== undefined ? value : fallback;
    if (raw === undefined || raw === null || raw === '') {
      return fallback;
    }
    const normalized = raw.toString().trim().replace(',', '.');
    const num = Number(normalized);
    if (!Number.isFinite(num) || num <= 0) {
      return fallback;
    }
    if (current.lengthUnit === 'inch') {
      return Number((num * 25.4).toFixed(2));
    }
    return Number(num.toFixed(2));
  };

  current.labelSizes = {
    barcodeWidthMm: parseLengthInput(incoming.labelBarcodeWidth, defaultConfig.labelSizes.barcodeWidthMm),
    barcodeHeightMm: parseLengthInput(incoming.labelBarcodeHeight, defaultConfig.labelSizes.barcodeHeightMm),
    qrSizeMm: parseLengthInput(incoming.labelQrSize, defaultConfig.labelSizes.qrSizeMm)
  };

  const inventoryAreasRaw = Array.isArray(incoming.inventoryAreas)
    ? incoming.inventoryAreas.join('\n')
    : incoming.inventoryAreas;
  const parsedAreas = (inventoryAreasRaw || '')
    .split(/\r?\n/)
    .map((value) => value.trim())
    .filter((value) => value.length);
  const uniqueAreas = Array.from(new Set(parsedAreas.map((name) => name.trim())));
  current.inventoryAreas = uniqueAreas;
  current.includeFilamentsInInventoryReport = Boolean(
    incoming.includeFilamentsInInventoryReport && incoming.includeFilamentsInInventoryReport !== '0'
  );

  try {
    const prismaClient = req.app.get('prisma');
    const existingAreas = await prismaClient.inventoryArea.findMany();
    const existingByName = new Map(existingAreas.map((area) => [area.name.toLowerCase(), area]));
    const namesSeen = new Set();

    for (const name of uniqueAreas) {
      const normalized = name.toLowerCase();
      if (namesSeen.has(normalized)) {
        continue;
      }
      namesSeen.add(normalized);
      if (existingByName.has(normalized)) {
        existingByName.delete(normalized);
      } else {
        await prismaClient.inventoryArea.create({ data: { name } });
      }
    }

    for (const [, area] of existingByName) {
      await prismaClient.inventoryArea.delete({ where: { id: area.id } });
    }

    saveConfig(current);
    req.app.locals.config = current;
    req.app.locals.ui = buildUiMeta(current, requiredFieldDefs);

    res.redirect('/settings?saved=1');
  } catch (error) {
    next(error);
  }
});

app.use(codesRoutes);

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

// Versuche zuerst Port 80, falls fehlgeschlagen → Port 3000
function startServer(port) {
  const server = app.listen(port, HOST, () => {
    const portDisplay = port === 80 ? '' : `:${port}`;
    console.log(`Server listening on http://localhost${portDisplay}`);
    console.log(`Server accessible in network on http://<your-ip>${portDisplay}`);
  });

  server.on('error', (error) => {
    if (error.code === 'EACCES' || error.code === 'EADDRINUSE') {
      // Port 80 nicht verfügbar (keine Rechte oder bereits belegt)
      if (port === DEFAULT_PORT && port !== FALLBACK_PORT) {
        console.log(`\n⚠ Port ${port} nicht verfügbar (möglicherweise keine Admin-Rechte oder Port belegt)`);
        console.log(`→ Wechsle auf Port ${FALLBACK_PORT}...\n`);
        startServer(FALLBACK_PORT);
      } else {
        console.error(`\n❌ Fehler: Port ${port} ist nicht verfügbar!`);
        console.error(`Bitte wähle einen anderen Port in der .env Datei (PORT=XXXX)`);
        process.exit(1);
      }
    } else {
      console.error('Server-Fehler:', error);
      process.exit(1);
    }
  });

  return server;
}

startServer(DEFAULT_PORT);

process.on('SIGINT', async () => {
  await prisma.$disconnect();
  process.exit(0);
});

