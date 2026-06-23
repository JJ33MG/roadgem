import { Router, Request, Response, NextFunction } from 'express';
import axios from 'axios';
import { findPlacePhotoRefs, buildPlacePhotoUrl } from '../utils/places';

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
    next(err);
  }
});

export default router;
