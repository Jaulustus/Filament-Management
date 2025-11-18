import fs from 'fs';
import path from 'path';
import cookieParser from 'cookie-parser';

const LANG_COOKIE = 'lang';
const DEFAULT_LANG = 'de';

let translations = {};

function loadTranslations() {
  if (Object.keys(translations).length) {
    return translations;
  }
  const langPath = path.resolve(process.cwd(), 'lang', 'lang.json');
  const raw = fs.readFileSync(langPath, 'utf8');
  translations = JSON.parse(raw);
  return translations;
}

export function t(lang, key) {
  const dict = loadTranslations();
  if (dict[lang]?.[key]) {
    return dict[lang][key];
  }
  if (dict[DEFAULT_LANG]?.[key]) {
    return dict[DEFAULT_LANG][key];
  }
  return key;
}

export function resolveLanguage(req) {
  const available = Object.keys(loadTranslations());
  const queryLang = req.query.lang;
  if (queryLang && available.includes(queryLang)) {
    return queryLang;
  }
  const cookieLang = req.cookies?.[LANG_COOKIE];
  if (cookieLang && available.includes(cookieLang)) {
    return cookieLang;
  }
  return DEFAULT_LANG;
}

export function initI18n(app) {
  loadTranslations();
  app.use(cookieParser());

  app.use((req, res, next) => {
    const lang = resolveLanguage(req);
    if (req.query.lang && req.query.lang !== req.cookies?.[LANG_COOKIE]) {
      res.cookie(LANG_COOKIE, req.query.lang, { httpOnly: false, sameSite: 'lax', maxAge: 1000 * 60 * 60 * 24 * 365 });
    }
    res.locals.lang = lang;
    res.locals.t = (key) => t(lang, key);
    res.locals.languages = Object.keys(translations);
    res.locals.translationStrings = translations[lang];
    next();
  });
}

export function getTranslations() {
  return loadTranslations();
}

