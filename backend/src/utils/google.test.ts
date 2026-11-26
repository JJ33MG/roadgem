import { describe, expect, it } from 'vitest';
import { parsePlaces, parseRoute, photoMediaUrl, routeBody } from './google';

// Google's new Places and Routes services (26 Nov: new Cloud projects cannot use the old ones).
describe('parsePlaces: a Places (New) answer as Routify places', () => {
  it('reads id, name, rating, reviews, address, position, types, first photo and price level', () => {
    const [p] = parsePlaces({
      places: [{
        id: 'ChIJ1', displayName: { text: 'Pannonhalma Archabbey' }, rating: 4.8, userRatingCount: 9412,
        shortFormattedAddress: 'Pannonhalma', formattedAddress: 'Vár 1, Pannonhalma, Hungary',
        location: { latitude: 47.55, longitude: 17.76 }, types: ['tourist_attraction'],
        photos: [{ name: 'places/ChIJ1/photos/AbC' }], businessStatus: 'OPERATIONAL', priceLevel: 'PRICE_LEVEL_MODERATE',
      }],
    });
    expect(p).toEqual({
      id: 'ChIJ1', name: 'Pannonhalma Archabbey', rating: 4.8, reviews: 9412, address: 'Pannonhalma',
      lat: 47.55, lng: 17.76, types: ['tourist_attraction'], photo: 'places/ChIJ1/photos/AbC', open: true, priceLevel: 2,
    });
  });

  it('copes with an empty answer and with places that closed', () => {
    expect(parsePlaces({})).toEqual([]);
    expect(parsePlaces({ places: [{ id: 'x', displayName: { text: 'Shut' }, location: { latitude: 1, longitude: 2 }, businessStatus: 'CLOSED_PERMANENTLY' }] })[0].open).toBe(false);
  });
});

describe('routeBody and parseRoute: Routes API', () => {
  it('asks for a drive through every stop, in English, avoiding tolls when asked', () => {
    const b = routeBody([{ lat: 1, lng: 2 }, { lat: 3, lng: 4 }, { lat: 5, lng: 6 }], true);
    expect(b.origin).toEqual({ location: { latLng: { latitude: 1, longitude: 2 } } });
    expect(b.destination).toEqual({ location: { latLng: { latitude: 5, longitude: 6 } } });
    expect(b.intermediates).toEqual([{ location: { latLng: { latitude: 3, longitude: 4 } } }]);
    expect(b.routeModifiers).toEqual({ avoidTolls: true });
    expect(b.languageCode).toBe('en');
  });

  it('reads the line, and per leg the metres, seconds and steps', () => {
    const r = parseRoute({
      routes: [{
        polyline: { encodedPolyline: 'abc' },
        legs: [{ distanceMeters: 125000, duration: '5700s', steps: [{ distanceMeters: 1000, navigationInstruction: { instructions: 'Entering Hungary' } }, { distanceMeters: 500 }] }],
      }],
    });
    expect(r).toEqual({ encoded: 'abc', legs: [{ meters: 125000, seconds: 5700, steps: [{ meters: 1000, instruction: 'Entering Hungary' }, { meters: 500, instruction: '' }] }] });
    expect(parseRoute({})).toBeNull();
  });
});

describe('photoMediaUrl', () => {
  it('builds the new photo address from the photo name', () => {
    expect(photoMediaUrl('places/ChIJ1/photos/AbC', 800, 'K')).toBe('https://places.googleapis.com/v1/places/ChIJ1/photos/AbC/media?maxWidthPx=800&key=K');
  });
});
