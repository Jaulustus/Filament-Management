import { Router } from 'express';
import bwipjs from 'bwip-js';
import QRCode from 'qrcode';
import createDrawingSvg from '../lib/drawingSvg.js';
import { defaultConfig } from '../lib/config.js';

const router = Router();

function getPrintProfile(req) {
  const config = req.app?.locals?.config || {};
  const activeProfileName = config.activePrintProfile || defaultConfig.activePrintProfile;
  const profiles = config.printProfiles || defaultConfig.printProfiles;
  return profiles[activeProfileName] || profiles['LW 32x57mm'] || null;
}

router.get('/api/codes/barcode.png', async (req, res, next) => {
  const id = req.query.id;
  if (!id) {
    return res.status(400).send('id required');
  }
  const includeText = req.query.includetext === 'true' || req.query.includetext === '1';
  const profile = getPrintProfile(req);
  
  // Verwende Profil-Einstellungen oder Fallback auf Standard
  const barcodeSettings = profile?.barcode || {
    scale: 3,
    height: 10,
    rotate: 'R',
    textsize: 8,
    paddingwidth: 3,
    paddingheight: 2
  };
  
  try {
    const png = await bwipjs.toBuffer({
      bcid: 'code128',
      text: id,
      scale: barcodeSettings.scale,
      height: barcodeSettings.height,
      rotate: barcodeSettings.rotate,
      includetext: includeText,
      textxalign: includeText ? 'center' : undefined,
      textsize: includeText ? (barcodeSettings.textsize || 8) : undefined,
      paddingwidth: barcodeSettings.paddingwidth,
      paddingheight: barcodeSettings.paddingheight
    });
    res.type('png').send(png);
  } catch (error) {
    next(error);
  }
});

router.get('/api/codes/barcode.svg', async (req, res, next) => {
  const id = req.query.id;
  if (!id) {
    return res.status(400).send('id required');
  }
  const includeText = req.query.includetext === 'true' || req.query.includetext === '1';
  const profile = getPrintProfile(req);
  
  const barcodeSettings = profile?.barcode || {
    rotate: 'R',
    textsize: 10,
    paddingwidth: 10,
    paddingheight: 10
  };
  
  try {
    const opts = {
      bcid: 'code128',
      text: id,
      rotate: barcodeSettings.rotate || 'R',
      includetext: includeText,
      textxalign: includeText ? 'center' : undefined,
      textsize: includeText ? (barcodeSettings.textsize || 10) : undefined,
      paddingwidth: barcodeSettings.paddingwidth || 10,
      paddingheight: barcodeSettings.paddingheight || 10,
      backgroundcolor: 'FFFFFF'
    };

    bwipjs.fixupOptions(opts);
    const svg = bwipjs.render(opts, createDrawingSvg(opts, bwipjs.FontLib));
    res.type('image/svg+xml').send(svg);
  } catch (error) {
    next(error);
  }
});

router.get('/api/codes/qr.png', async (req, res, next) => {
  const text = req.query.text;
  if (!text) {
    return res.status(400).send('text required');
  }
  const profile = getPrintProfile(req);
  const qrSettings = profile?.qr || { margin: 1, scale: 6 };
  
  try {
    const buffer = await QRCode.toBuffer(text, { 
      type: 'png', 
      margin: qrSettings.margin || 1, 
      scale: qrSettings.scale || 6 
    });
    res.type('png').send(buffer);
  } catch (error) {
    next(error);
  }
});

export default router;

