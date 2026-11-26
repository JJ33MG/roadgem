import { describe, expect, it } from 'vitest';
import { pickCommonsPhoto } from './commonsPhoto';

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
  it('otherwise takes the nearest photo, never a map or drawing', () => {
    expect(pickCommonsPhoto(pages, 'Something else')).toBe('https://upload.wikimedia.org/a.jpg');
    expect(pickCommonsPhoto([pages[2]], 'x')).toBeNull();
  });
});
