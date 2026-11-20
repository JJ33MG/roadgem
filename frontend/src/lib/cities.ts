// Cities road-trippers start from or drive to, roughly by how often they are picked.
// Typing the first letter shows the top matches at once, before Google answers.
export const CITIES: string[] = [
  'Barcelona, Spain', 'Berlin, Germany', 'Brussels, Belgium', 'Paris, France', 'Amsterdam, Netherlands', 'Madrid, Spain',
  'Rome, Italy', 'Lisbon, Portugal', 'London, United Kingdom', 'Munich, Germany', 'Milan, Italy', 'Vienna, Austria',
  'Prague, Czechia', 'Budapest, Hungary', 'Florence, Italy', 'Venice, Italy', 'Antwerp, Belgium', 'Bruges, Belgium',
  'Ghent, Belgium', 'Liège, Belgium', 'Leuven, Belgium', 'Namur, Belgium', 'Luxembourg, Luxembourg', 'Rotterdam, Netherlands',
  'Utrecht, Netherlands', 'The Hague, Netherlands', 'Maastricht, Netherlands', 'Cologne, Germany', 'Hamburg, Germany',
  'Frankfurt, Germany', 'Düsseldorf, Germany', 'Stuttgart, Germany', 'Dresden, Germany', 'Heidelberg, Germany',
  'Nuremberg, Germany', 'Leipzig, Germany', 'Freiburg, Germany', 'Lyon, France', 'Marseille, France', 'Nice, France',
  'Bordeaux, France', 'Toulouse, France', 'Strasbourg, France', 'Lille, France', 'Nantes, France', 'Montpellier, France',
  'Annecy, France', 'Avignon, France', 'Tours, France', 'Reims, France', 'Dijon, France', 'Biarritz, France',
  'Saint-Malo, France', 'Rouen, France', 'Grenoble, France', 'Carcassonne, France', 'Seville, Spain', 'Valencia, Spain',
  'Bilbao, Spain', 'San Sebastián, Spain', 'Granada, Spain', 'Málaga, Spain', 'Córdoba, Spain', 'Toledo, Spain',
  'Salamanca, Spain', 'Burgos, Spain', 'Zaragoza, Spain', 'Santiago de Compostela, Spain', 'Girona, Spain',
  'Porto, Portugal', 'Faro, Portugal', 'Coimbra, Portugal', 'Lagos, Portugal', 'Évora, Portugal', 'Naples, Italy',
  'Turin, Italy', 'Bologna, Italy', 'Verona, Italy', 'Genoa, Italy', 'Pisa, Italy', 'Siena, Italy', 'Bari, Italy',
  'Palermo, Italy', 'Como, Italy', 'Trento, Italy', 'Bolzano, Italy', 'Zürich, Switzerland', 'Geneva, Switzerland',
  'Bern, Switzerland', 'Basel, Switzerland', 'Lucerne, Switzerland', 'Interlaken, Switzerland', 'Lausanne, Switzerland',
  'Salzburg, Austria', 'Innsbruck, Austria', 'Graz, Austria', 'Hallstatt, Austria', 'Bratislava, Slovakia',
  'Ljubljana, Slovenia', 'Bled, Slovenia', 'Zagreb, Croatia', 'Split, Croatia', 'Dubrovnik, Croatia', 'Zadar, Croatia',
  'Pula, Croatia', 'Kotor, Montenegro', 'Sarajevo, Bosnia and Herzegovina', 'Mostar, Bosnia and Herzegovina',
  'Belgrade, Serbia', 'Bucharest, Romania', 'Brașov, Romania', 'Sofia, Bulgaria', 'Athens, Greece', 'Thessaloniki, Greece',
  'Kraków, Poland', 'Warsaw, Poland', 'Gdańsk, Poland', 'Wrocław, Poland', 'Český Krumlov, Czechia', 'Brno, Czechia',
  'Copenhagen, Denmark', 'Aarhus, Denmark', 'Stockholm, Sweden', 'Gothenburg, Sweden', 'Malmö, Sweden', 'Oslo, Norway',
  'Bergen, Norway', 'Stavanger, Norway', 'Tromsø, Norway', 'Helsinki, Finland', 'Tallinn, Estonia', 'Riga, Latvia',
  'Vilnius, Lithuania', 'Dublin, Ireland', 'Galway, Ireland', 'Cork, Ireland', 'Edinburgh, United Kingdom',
  'Glasgow, United Kingdom', 'Inverness, United Kingdom', 'Manchester, United Kingdom', 'Bath, United Kingdom',
  'York, United Kingdom', 'Reykjavík, Iceland', 'Istanbul, Türkiye', 'Valletta, Malta',
];

const fold = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
const FOLDED = CITIES.map((c) => [c, fold(c)] as const);

/** The best-known cities whose name starts with what was typed (accents and case ignored). */
export function citiesStartingWith(typed: string, limit = 6): string[] {
  const q = fold(typed);
  if (!q) return [];
  return FOLDED.filter(([, f]) => f.startsWith(q)).slice(0, limit).map(([c]) => c);
}
