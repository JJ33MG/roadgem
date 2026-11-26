import { Router, Request, Response, NextFunction } from 'express';
import axios from 'axios';
import { findPlacePhotoRefs, buildPlacePhotoUrl } from '../utils/places';
import { photoMediaUrl, placePhotos } from '../utils/google';
import { prisma } from '../utils/prisma';

const router = Router();

router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const query = String(req.query.query || '').trim();
    if (!query) {
      return res.status(400).json({ error: 'query is required' });
    }

    const count = Math.min(Math.max(Number(req.query.count) || 1, 1), 5);
    const refs = await findPlacePhotoRefs(query, count);
    const photos = refs.map((ref) => `/api/photos/image/${encodeURIComponent(ref)}`);

    res.json({ photos });
  } catch (err) {
    next(err);
  }
});

router.get('/image/:photoReference', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const maxWidth = Math.min(Math.max(Number(req.query.maxwidth) || 800, 100), 1600);
    const url = buildPlacePhotoUrl(req.params.photoReference, maxWidth);

    const response = await axios.get(url, { responseType: 'stream' });
    res.set('Content-Type', String(response.headers['content-type'] || 'image/jpeg'));
    res.set('Cache-Control', 'public, max-age=86400');
    response.data.pipe(res);
  } catch (err) {
    // Google refusing one photo (expired reference, key without permission) is not a server error: no photo.
    const status = (err as { response?: { status?: number } }).response?.status;
    if (status && status >= 400 && status < 500) {
      console.warn(`[photos] Google answered ${status} for a photo`);
      return res.status(404).json({ error: 'Photo not available' });
    }
    next(err);
  }
});

// A gem saved before the move to Places (New) keeps an old photo reference: look its photo up again by place.
const placePhoto = new Map<string, string | null>();
router.get('/place/:placeId', async (req: Request, res: Response, next: NextFunction) => {
  const key = process.env.GOOGLE_MAPS_API_KEY;
  const id = String(req.params.placeId).slice(0, 300);
  try {
    if (!key) return res.status(404).json({ error: 'Photo not available' });
    if (!placePhoto.has(id)) {
      const [name] = await placePhotos(id, key);
      if (name) {
        if (placePhoto.size > 5000) placePhoto.clear();
        placePhoto.set(id, name);
        // Keep the new name in the gem library, so the next trip links it directly.
        prisma.placeGem.updateMany({ where: { placeId: id }, data: { photoRef: name } }).catch(() => undefined);
      }
    }
    const name = placePhoto.get(id);
    if (!name) return res.status(404).json({ error: 'Photo not available' });
    const response = await axios.get(photoMediaUrl(name, 800, key), { responseType: 'stream' });
    res.set('Content-Type', String(response.headers['content-type'] || 'image/jpeg'));
    res.set('Cache-Control', 'public, max-age=86400');
    response.data.pipe(res);
  } catch (err) {
    const status = (err as { response?: { status?: number } }).response?.status;
    if (status && status >= 400 && status < 500) return res.status(404).json({ error: 'Photo not available' });
    next(err);
  }
});

export default router;
