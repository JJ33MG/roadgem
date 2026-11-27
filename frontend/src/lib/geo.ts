import i18n from '@/i18n';
export type Here = { lat: number; lng: number; accuracy: number };

/** The phone's live position, asked when the photo is sent (that is what makes points count only on the spot). */
export function whereAmI(): Promise<Here> {
  return new Promise((resolve, reject) => {
    if (!('geolocation' in navigator)) return reject(new Error(i18n.t('errors.noGeo')));
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ lat: p.coords.latitude, lng: p.coords.longitude, accuracy: p.coords.accuracy }),
      (e) =>
        reject(new Error(e.code === e.PERMISSION_DENIED
          ? i18n.t('errors.geoDenied')
          : i18n.t('errors.geoFailed'))),
      { enableHighAccuracy: true, timeout: 20_000, maximumAge: 30_000 },
    );
  });
}
