// A photo of a place from Wikimedia Commons (free, geotagged photos), for when Google sends none.
// Google gives this Cloud project no place photos (EEA terms, 26 Nov 2026), and a gem always needs one.
import axios from 'axios';

type CommonsPage = { title: string; index?: number; imageinfo?: { thumburl?: string; mime?: string }[] };

const fold = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const words = (s: string) => fold(s).split(/[^a-z0-9]+/).filter((w) => w.length > 3);

/** A photo (not a map or drawing) whose title names the place, else the nearest one; null when none. */
export function pickCommonsPhoto(pages: CommonsPage[], name: string): string | null {
  const photos = pages
    .filter((p) => /^image\/(jpeg|png|webp)$/.test(p.imageinfo?.[0]?.mime ?? '') && p.imageinfo?.[0]?.thumburl)
    .sort((a, b) => (a.index ?? 99) - (b.index ?? 99));
  const want = words(name);
  const named = photos.find((p) => want.some((w) => fold(p.title).includes(w)));
  return (named ?? photos[0])?.imageinfo?.[0]?.thumburl ?? null;
}

const cache = new Map<string, string | null>();

/** Up to 30 geotagged Commons photos within 400 m, nearest first. */
export async function commonsPhotoNear(lat: number, lng: number, name: string): Promise<string | null> {
  const key = `${lat.toFixed(4)},${lng.toFixed(4)}`;
  if (cache.has(key)) return cache.get(key) ?? null;
  try {
    const res = await axios.get('https://commons.wikimedia.org/w/api.php', {
      params: {
        action: 'query', format: 'json', generator: 'geosearch', ggsnamespace: 6, ggsradius: 400, ggslimit: 30,
        ggscoord: `${lat}|${lng}`, prop: 'imageinfo', iiprop: 'url|mime', iiurlwidth: 800,
      },
      headers: { 'User-Agent': 'Routify/1.0 (road trip planner)' },
      timeout: 6000,
    });
    const pages = Object.values((res.data?.query?.pages ?? {}) as Record<string, CommonsPage>);
    const url = pickCommonsPhoto(pages, name);
    // Never cache an empty answer (project rule); a found photo is kept for the life of the server.
    if (url) {
      if (cache.size > 10_000) cache.clear();
      cache.set(key, url);
    }
    return url;
  } catch {
    return null;
  }
}
