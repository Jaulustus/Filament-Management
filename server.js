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
import { loadConfig, saveConfig, buildUiMeta, defaultConfig } from './src/lib/config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const prisma = new PrismaClient();

const app = express();
const PORT = process.env.PORT || 3000;

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

app.use((req, res, next) => {
  res.locals.ui = req.app.locals.ui;
  res.locals.config = req.app.locals.config;
  res.locals.requiredFieldDefs = req.app.locals.requiredFieldDefs;
  res.locals.currencyOptions = req.app.locals.currencyOptions;
  next();
});

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

app.get('/settings', (req, res) => {
  res.render('settings', {
    config: req.app.locals.config,
    ui: req.app.locals.ui,
    lengthOptions,
    weightOptions,
    currencyOptions,
    requiredFieldDefs,
    saved: req.query.saved === '1'
  });
});

app.post('/settings', (req, res) => {
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

  saveConfig(current);
  req.app.locals.config = current;
  req.app.locals.ui = buildUiMeta(current, requiredFieldDefs);

  res.redirect('/settings?saved=1');
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

