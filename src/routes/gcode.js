import { Router } from 'express';
import multer from 'multer';
import os from 'os';
import path from 'path';
import fs from 'fs/promises';
import { analyseGcode } from '../lib/consumption.js';
import { serializeFilament } from './filament.js';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 25 * 1024 * 1024 } });

function prisma(req) {
  return req.app.get('prisma');
}

async function writeTempFile(buffer, originalName = 'upload.gcode') {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'filament-gcode-'));
  const filePath = path.join(tmpDir, originalName.replace(/[^a-z0-9\.\-_]/gi, '_'));
  await fs.writeFile(filePath, buffer);
  return { tmpDir, filePath };
}

router.get('/upload-gcode', (req, res) => {
  res.render('upload_gcode');
});

router.post('/api/parse-gcode', upload.single('file'), async (req, res, next) => {
  if (!req.file) {
    return res.status(400).json({ error: 'file_required' });
  }

  let tmpRef;
  try {
    tmpRef = await writeTempFile(req.file.buffer, req.file.originalname || 'upload.gcode');
    const filamentId = req.query.filamentId;
    const jobName = req.body.jobName;
    let filament = null;

    if (filamentId) {
      filament = await prisma(req).filament.findUnique({ where: { id: filamentId } });
      if (!filament) {
        return res.status(404).json({ error: 'filament_not_found' });
      }
    }

    const analysis = await analyseGcode(tmpRef.filePath, filament);
    let updatedFilament = filament;

    if (filament && analysis.grams && analysis.grams > 0) {
      const remaining = Math.max(0, Number(filament.remainingG) - analysis.grams);
      updatedFilament = await prisma(req).filament.update({
        where: { id: filamentId },
        data: { remainingG: remaining }
      });
      await prisma(req).usageLog.create({
        data: {
          filamentId,
          usedG: analysis.grams,
          source: analysis.source || 'gcode',
          jobName: jobName || req.file.originalname
        }
      });
    }

    res.json({
      analysis: {
        source: analysis.source,
        grams: analysis.grams,
        meters: analysis.meters,
        volumetric: analysis.parse.volumetric,
        absoluteExtrusion: analysis.parse.absoluteExtrusion,
        headers: analysis.parse.header,
        totalExtrusion: analysis.parse.totalExtrusion
      },
      filament: updatedFilament ? serializeFilament(updatedFilament) : null
    });
  } catch (error) {
    next(error);
  } finally {
    if (tmpRef) {
      await fs.rm(tmpRef.tmpDir, { recursive: true, force: true });
    }
  }
});

export default router;

