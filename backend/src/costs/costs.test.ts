import { describe, expect, it } from 'vitest';
import { costsForLegs, costsOfPlanner } from './costs';
import { TABLES } from './tables';

const cents = (n: number) => Math.round(n * 100) / 100;

const leg = (countries: { code: string; km: number }[]) => ({ km: countries.reduce((n, c) => n + c.km, 0), hours: 4, countries });

describe('costsForLegs', () => {
  it('prices diesel for a campervan by the litre, per country', () => {
    const c = costsForLegs({ vehicle: 'campervan', legs: [leg([{ code: 'FR', km: 300 }])], stayTypes: ['campsite'] });
    expect(c.legs[0].fuel).toBe(cents(300 * 0.11 * TABLES.fuel.FR.diesel));
  });

  it('adds motorway tolls in toll countries, bigger for a campervan', () => {
    const car = costsForLegs({ vehicle: 'car', legs: [leg([{ code: 'FR', km: 300 }])], stayTypes: ['hotel'] });
    const van = costsForLegs({ vehicle: 'campervan', legs: [leg([{ code: 'FR', km: 300 }])], stayTypes: ['campsite'] });
    expect(car.legs[0].tolls).toBe(cents(300 * TABLES.tollPerKm.FR));
    expect(van.legs[0].tolls).toBeGreaterThan(car.legs[0].tolls);
  });

  it('buys a vignette once per trip, on the first leg that enters the country', () => {
    const c = costsForLegs({ vehicle: 'car', legs: [leg([{ code: 'DE', km: 200 }, { code: 'AT', km: 100 }]), leg([{ code: 'AT', km: 250 }])], stayTypes: ['hotel'] });
    expect(c.legs[0].vignettes).toEqual([{ country: 'AT', label: TABLES.vignettes.AT.label, price: TABLES.vignettes.AT.price }]);
    expect(c.legs[1].vignettes).toEqual([]);
  });

  it('adds the Swiss yearly vignette and warns about German low-emission zones', () => {
    const c = costsForLegs({ vehicle: 'car', legs: [leg([{ code: 'DE', km: 300 }, { code: 'CH', km: 80 }])], stayTypes: ['hotel'] });
    expect(c.legs[0].vignettes.map((v) => v.country)).toEqual(['CH']);
    expect(c.legs[0].warnings.join(' ')).toMatch(/Umweltplakette/);
    expect(c.legs[0].warningCountries).toContain('DE');
  });

  it('still prices a country it has no table for: average fuel, no tolls', () => {
    const c = costsForLegs({ vehicle: 'car', legs: [leg([{ code: 'NO', km: 100 }])], stayTypes: ['hotel'] });
    expect(c.legs[0].tolls).toBe(0);
    expect(c.legs[0].fuel).toBe(cents(100 * 0.065 * TABLES.fuel.default.petrol));
  });

  it('charges an electric car per kWh and prices the night from the first chosen stay', () => {
    const c = costsForLegs({ vehicle: 'ev', legs: [leg([{ code: 'NL', km: 100 }])], stayTypes: ['holiday_home', 'hotel'] });
    expect(c.legs[0].fuel).toBe(cents(100 * 0.18 * TABLES.fuel.NL.kwh));
    expect(c.overnight).toBe(TABLES.overnight.holiday_home);
    expect(c.updated).toBe('2026-11-22');
  });
});


describe('the toll-free route', () => {
  it('pays no motorway tolls on a toll-free route, and says what it saves against the fastest', () => {
    const fast = [{ km: 600, hours: 6, countries: [{ code: 'FR', km: 600 }] }];
    const slow = [{ km: 640, hours: 8, countries: [{ code: 'FR', km: 640 }] }];
    expect(costsForLegs({ vehicle: 'car', legs: slow, stayTypes: ['hotel'], tollFree: true }).legs[0].tolls).toBe(0);
    const c = costsOfPlanner({ vehicle: 'car', stayTypes: ['hotel'], legs: fast, alt: { legs: slow, tollFree: true } })!;
    expect(c.cheaper).toMatchObject({ tollFree: true, using: false, extraHours: 2, extraKm: 40 });
    expect(c.cheaper!.saves).toBeGreaterThan(30);
    const switched = costsOfPlanner({ vehicle: 'car', stayTypes: ['hotel'], legs: slow, tollFree: true, alt: { legs: fast, tollFree: false } })!;
    expect(switched.cheaper).toMatchObject({ tollFree: true, using: true });
    expect(switched.legs[0].tolls).toBe(0);
  });

  it('offers nothing when the toll-free route is not cheaper', () => {
    const legs = [{ km: 300, hours: 3, countries: [{ code: 'DE', km: 300 }] }];
    expect(costsOfPlanner({ vehicle: 'car', stayTypes: ['hotel'], legs, alt: { legs, tollFree: true } })!.cheaper).toBeNull();
  });
});

describe('costsOfPlanner', () => {
  it('prices a saved trip from its legs, and gives nothing for old trips without legs', () => {
    expect(costsOfPlanner({})).toBeNull();
    const c = costsOfPlanner({ vehicle: 'campervan', stayTypes: ['campsite'], legs: [leg([{ code: 'BE', km: 100 }])] });
    expect(c?.legs).toHaveLength(1);
    expect(costsOfPlanner({ vehicle: 'spaceship', legs: [leg([{ code: 'BE', km: 100 }])] })?.legs[0].fuel).toBe(cents(100 * 0.065 * TABLES.fuel.BE.petrol));
  });
});
