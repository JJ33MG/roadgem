// Prices RoamGem uses to estimate a trip's costs. Averages, rounded; the trip page labels them as an
// estimate with this date. Update `updated` whenever a number changes.

export const TABLES = {
  updated: '2026-11-22',
  /** € per litre (petrol, diesel) and € per kWh at public chargers, per country. */
  fuel: {
    default: { petrol: 1.75, diesel: 1.68, kwh: 0.5 },
    NL: { petrol: 1.95, diesel: 1.72, kwh: 0.55 },
    BE: { petrol: 1.72, diesel: 1.78, kwh: 0.55 },
    LU: { petrol: 1.55, diesel: 1.48, kwh: 0.5 },
    DE: { petrol: 1.78, diesel: 1.66, kwh: 0.6 },
    FR: { petrol: 1.8, diesel: 1.7, kwh: 0.5 },
    ES: { petrol: 1.55, diesel: 1.48, kwh: 0.45 },
    PT: { petrol: 1.75, diesel: 1.6, kwh: 0.45 },
    IT: { petrol: 1.8, diesel: 1.72, kwh: 0.6 },
    AT: { petrol: 1.62, diesel: 1.6, kwh: 0.55 },
    CH: { petrol: 1.85, diesel: 1.9, kwh: 0.6 },
    CZ: { petrol: 1.5, diesel: 1.45, kwh: 0.45 },
    SK: { petrol: 1.6, diesel: 1.52, kwh: 0.45 },
    SI: { petrol: 1.5, diesel: 1.48, kwh: 0.45 },
    HU: { petrol: 1.55, diesel: 1.58, kwh: 0.45 },
    PL: { petrol: 1.45, diesel: 1.45, kwh: 0.45 },
    HR: { petrol: 1.5, diesel: 1.45, kwh: 0.45 },
    DK: { petrol: 1.9, diesel: 1.72, kwh: 0.55 },
  } as Record<string, { petrol: number; diesel: number; kwh: number }>,
  /** Average motorway toll per km driven in the country (part of the km is toll-free; class 1 car). */
  tollPerKm: { FR: 0.07, IT: 0.06, ES: 0.02, PT: 0.07, HR: 0.06, PL: 0.01, GR: 0.04 } as Record<string, number>,
  /** Campervans and cars with a caravan pay a higher class. */
  tollFactor: { car: 1, ev: 1, campervan: 1.5, caravan: 1.5 },
  /** The shortest vignette a road-tripper buys (bought once per trip). */
  vignettes: {
    AT: { label: 'Austrian 10-day vignette', price: 12.8 },
    CH: { label: 'Swiss yearly vignette', price: 43 },
    CZ: { label: 'Czech 10-day vignette', price: 12.5 },
    SK: { label: 'Slovak 10-day vignette', price: 12 },
    SI: { label: 'Slovenian 7-day vignette', price: 16 },
    HU: { label: 'Hungarian 10-day vignette', price: 16 },
  } as Record<string, { label: string; price: number }>,
  /** Things drivers must arrange before entering a country. */
  warnings: {
    DE: 'Germany: cities have low-emission zones; you need an Umweltplakette sticker.',
    FR: 'France: many cities need a Crit’Air sticker.',
    BE: 'Belgium: Brussels, Antwerp and Ghent have low-emission zones; register foreign cars online first.',
    NL: 'Netherlands: some cities close their centres to older diesel vans.',
    IT: 'Italy: old town centres are ZTL zones; driving in brings a fine.',
    AT: 'Austria: vehicles over 3.5 t pay by kilometre with a GO-Box instead of the vignette.',
    CH: 'Switzerland: vehicles over 3.5 t pay a heavy-vehicle charge instead of the vignette.',
  } as Record<string, string>,
  /** Average price for one night, by kind of stay. */
  overnight: { campsite: 35, hotel: 110, holiday_home: 95 } as Record<string, number>,
  /** Use per 100 km: litres (petrol car, diesel campervan and car with caravan) or kWh (electric). */
  use: { car: 6.5, ev: 18, campervan: 11, caravan: 10 },
};
