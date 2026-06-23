import { useEffect, useState } from 'react';
import { photosApi } from '@/lib/api';

const photoCache = new Map<string, string[]>();

export function usePlacePhotos(query: string | undefined, count = 1) {
  const cacheKey = query ? `${query.toLowerCase().trim()}::${count}` : '';
  const [photos, setPhotos] = useState<string[]>(() => (cacheKey ? photoCache.get(cacheKey) ?? [] : []));
  const [isLoading, setIsLoading] = useState(() => !!cacheKey && !photoCache.get(cacheKey)?.length);

  useEffect(() => {
    if (!cacheKey || !query) {
      setPhotos([]);
      setIsLoading(false);
      return;
    }

    const cached = photoCache.get(cacheKey);
    if (cached && cached.length > 0) {
      setPhotos(cached);
      setIsLoading(false);
      return;
    }

    let cancelled = false;
    setIsLoading(true);

    photosApi
      .search(query, count)
      .then((res) => {
        if (cancelled) return;
        const photos = res.data.photos ?? [];
        if (photos.length > 0) photoCache.set(cacheKey, photos);
        setPhotos(photos);
      })
      .catch(() => {
        if (cancelled) return;
        setPhotos([]);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [cacheKey, query, count]);

  return { photos, isLoading };
}
