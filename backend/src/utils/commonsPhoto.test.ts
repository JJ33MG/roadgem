import { describe, expect, it } from 'vitest';
import { pickCommonsPhoto, pickWikipediaPhoto } from './commonsPhoto';

// Google sends no photos for this Cloud project (EEA terms, 26 Nov): Wikimedia Commons fills in.
describe('pickCommonsPhoto: the photo that belongs to the place', () => {
  const pages = [
    { title: 'File:Brno street 2019.jpg', index: 1, imageinfo: [{ thumburl: 'https://upload.wikimedia.org/a.jpg', mime: 'image/jpeg' }] },
    { title: 'File:Pekárna cave entrance.jpg', index: 2, imageinfo: [{ thumburl: 'https://upload.wikimedia.org/b.jpg', mime: 'image/jpeg' }] },
    { title: 'File:Map of caves.svg', index: 0, imageinfo: [{ thumburl: 'https://upload.wikimedia.org/c.png', mime: 'image/svg+xml' }] },
  ];
  it('prefers a photo whose title names the place, accents aside', () => {
    expect(pickCommonsPhoto(pages, 'Pekarna Cave')).toBe('https://upload.wikimedia.org/b.jpg');
  });
  it('never takes a photo that does not name the place (27 Nov: "Špilberk Castle" showed a tree), nor a map or drawing', () => {
    expect(pickCommonsPhoto(pages, 'Something else')).toBeNull();
    expect(pickCommonsPhoto([pages[2]], 'Caves map')).toBeNull();
  });
  it('needs a real word of the name, not a common one like "castle" or "museum" alone', () => {
    const p = [{ title: 'File:Castle ruins somewhere.jpg', index: 1, imageinfo: [{ thumburl: 'https://upload.wikimedia.org/x.jpg', mime: 'image/jpeg' }] }];
    expect(pickCommonsPhoto(p, 'Špilberk Castle')).toBeNull();
    expect(pickCommonsPhoto([{ ...p[0], title: 'File:Spilberk castle Brno.jpg' }], 'Špilberk Castle')).toBe('https://upload.wikimedia.org/x.jpg');
  });
});

describe('pickWikipediaPhoto: the lead image of the Wikipedia article about the place', () => {
  it('takes the image of an article whose title is the place', () => {
    const pages = [
      { title: 'Brno', thumbnail: { source: 'https://upload.wikimedia.org/brno.jpg' } },
      { title: 'Špilberk Castle', thumbnail: { source: 'https://upload.wikimedia.org/spilberk.jpg' } },
    ];
    expect(pickWikipediaPhoto(pages, 'Spilberk Castle')).toBe('https://upload.wikimedia.org/spilberk.jpg');
    expect(pickWikipediaPhoto(pages.slice(0, 1), 'Spilberk Castle')).toBeNull();
  });
});
