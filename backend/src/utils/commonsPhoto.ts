// A photo of a place from Wikimedia Commons (free, geotagged photos), for when Google sends none.
// Google gives this Cloud project no place photos (EEA terms, 26 Nov 2026), and a gem always needs one.
import axios from 'axios';

type CommonsPage = { title: string; index?: number; imageinfo?: { thumburl?: string; mime?: string }[] };

const fold = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
const words = (s: string) => fold(s).split(/[^a-z0-9]+/).filter((w) => w.length > 3);
// Words many places share: on their own they do not prove a photo shows this place (27 Nov: a tree for a castle).
const COMMON = new Set(['castle', 'museum', 'church', 'park', 'garden', 'gardens', 'cathedral', 'tower', 'bridge', 'square', 'lake', 'national', 'town', 'gallery', 'original', 'house', 'hall', 'abbey', 'chapel', 'palace', 'monument', 'viewpoint', 'cave', 'caves', 'under', 'with', 'from', 'saint', 'river', 'forest', 'mountain', 'hill', 'beach', 'nature', 'reserve', 'protected', 'landscape', 'area', 'center', 'centre', 'market', 'street', 'place', 'spa', 'beer', 'restaurant', 'cafe', 'hotel', 'camping', 'city', 'center', 'historic', 'historical', 'memorial', 'ruins', 'view', 'trail', 'path']);

/** True when a title names the place: one of its distinctive words, or the whole name when it has none. */
function names(title: string, name: string): boolean {
  const t = fold(title);
  const distinct = words(name).filter((w) => !COMMON.has(w));
  if (distinct.length) return distinct.some((w) => t.includes(w));
  const whole = words(name).join(' ');
  return !!whole && t.replace(/[^a-z0-9]+/g, ' ').includes(whole);
}

/** A photo (not a map or drawing) whose title names the place; null when none does. */
export function pickCommonsPhoto(pages: CommonsPage[], name: string): string | null {
  const photos = pages
    .filter((p) => /^image\/(jpeg|png|webp)$/.test(p.imageinfo?.[0]?.mime ?? '') && p.imageinfo?.[0]?.thumburl)
    .sort((a, b) => (a.index ?? 99) - (b.index ?? 99));
  return photos.find((p) => names(p.title.replace(/^File:/i, ''), name))?.imageinfo?.[0]?.thumburl ?? null;
}

/** The lead image of a nearby Wikipedia article about the place; null when no article names it. */
export function pickWikipediaPhoto(pages: { title: string; thumbnail?: { source?: string } }[], name: string): string | null {
  return pages.find((p) => p.thumbnail?.source && names(p.title, name))?.thumbnail?.source ?? null;
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
      headers: { 'User-Agent': 'RoamGem/1.0 (road trip planner)' },
      timeout: 6000,
    });
    const pages = Object.values((res.data?.query?.pages ?? {}) as Record<string, CommonsPage>);
    let url = pickCommonsPhoto(pages, name);
    if (!url) {
      // No photo that names the place: the lead image of the Wikipedia article about it, if there is one.
      const wiki = await axios.get('https://en.wikipedia.org/w/api.php', {
        params: { action: 'query', format: 'json', generator: 'geosearch', ggsradius: 1000, ggslimit: 20, ggscoord: `${lat}|${lng}`, prop: 'pageimages', piprop: 'thumbnail', pithumbsize: 1200 },
        headers: { 'User-Agent': 'RoamGem/1.0 (road trip planner)' },
        timeout: 6000,
      }).catch(() => null);
      url = pickWikipediaPhoto(Object.values((wiki?.data?.query?.pages ?? {}) as Record<string, { title: string; thumbnail?: { source?: string } }>), name);
    }
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
