import { Router } from 'express';
import bwipjs from 'bwip-js';
import QRCode from 'qrcode';
import createDrawingSvg from '../lib/drawingSvg.js';

const router = Router();

router.get('/api/codes/barcode.png', async (req, res, next) => {
  const id = req.query.id;
  if (!id) {
    return res.status(400).send('id required');
  }
  try {
    const png = await bwipjs.toBuffer({
      bcid: 'code128',
      text: id,
      scale: 4,
      height: 12,
      includetext: true,
      textxalign: 'center',
      textsize: 10
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
  try {
    const opts = {
      bcid: 'code128',
      text: id,
      includetext: true,
      textxalign: 'center',
      textsize: 10,
      paddingwidth: 10,
      paddingheight: 10,
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
  try {
    const buffer = await QRCode.toBuffer(text, { type: 'png', margin: 1, scale: 6 });
    res.type('png').send(buffer);
  } catch (error) {
    next(error);
  }
});

export default router;

