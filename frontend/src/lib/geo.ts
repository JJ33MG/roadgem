export type Here = { lat: number; lng: number; accuracy: number };

/** The phone's live position, asked when the photo is sent (that is what makes points count only on the spot). */
export function whereAmI(): Promise<Here> {
  return new Promise((resolve, reject) => {
    if (!('geolocation' in navigator)) return reject(new Error('This browser cannot share your location.'));
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ lat: p.coords.latitude, lng: p.coords.longitude, accuracy: p.coords.accuracy }),
      (e) =>
        reject(new Error(e.code === e.PERMISSION_DENIED
          ? 'Allow location for this site, so the app can check you are at the gem.'
          : 'Your location could not be found. Step outside or try again.')),
      { enableHighAccuracy: true, timeout: 20_000, maximumAge: 30_000 },
    );
  });
}
