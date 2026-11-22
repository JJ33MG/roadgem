// A story-size image (1080 × 1920) of a finished trip to share, drawn in the browser with Routify's fonts.
import { tokenHex } from './color';

export type CardInput = { from: string; to: string; done: number; total: number; km: number; countries: string[]; inviteUrl?: string };

export function cardText(i: CardInput) {
  const stats = [`${i.done} of ${i.total} gems collected`];
  if (i.km > 0) stats.push(`${Math.round(i.km).toLocaleString('en')} km`);
  if (i.countries.length > 1) stats.push(`${i.countries.length} countries`);
  return {
    title: `${i.from} to ${i.to}`,
    stats,
    footer: i.inviteUrl ? i.inviteUrl.replace(/^https?:\/\//, '') : 'Planned with Routify',
  };
}

/** Breaks a line into rows that fit `max` pixels. */
function wrap(ctx: CanvasRenderingContext2D, text: string, max: number): string[] {
  const rows: string[] = [];
  let row = '';
  for (const word of text.split(' ')) {
    const next = row ? `${row} ${word}` : word;
    if (ctx.measureText(next).width > max && row) {
      rows.push(row);
      row = word;
    } else row = next;
  }
  return row ? [...rows, row] : rows;
}

/** The card as a PNG file, ready for the share sheet or a download. */
export async function cardFile(i: CardInput): Promise<File> {
  const t = cardText(i);
  const canvas = document.createElement('canvas');
  canvas.width = 1080;
  canvas.height = 1920;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('This browser cannot draw the card.');
  await document.fonts?.ready;
  const band = tokenHex('--color-band', '#0b2a2a');
  const light = tokenHex('--color-band-ink', '#f4efe6');
  const accent = tokenHex('--color-accent-soft', '#8fd3c8');
  ctx.fillStyle = band;
  ctx.fillRect(0, 0, 1080, 1920);
  // Three road lines, like the homepage.
  ctx.strokeStyle = accent;
  for (const [y, a] of [[1380, 0.35], [1440, 0.28], [1500, 0.22]] as const) {
    ctx.globalAlpha = a;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(-40, y);
    ctx.bezierCurveTo(300, y - 80, 700, y + 90, 1120, y - 40);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  ctx.fillStyle = light;
  ctx.font = '500 56px "Instrument Sans", sans-serif';
  ctx.fillText('Routify', 96, 170);
  ctx.font = '400 112px "Instrument Sans", sans-serif';
  let y = 520;
  for (const row of wrap(ctx, t.title, 888)) {
    ctx.fillText(row, 96, y);
    y += 124;
  }
  ctx.font = '400 60px Figtree, sans-serif';
  y += 60;
  for (const s of t.stats) {
    ctx.fillText(s, 96, y);
    y += 92;
  }
  ctx.font = '400 40px Figtree, sans-serif';
  ctx.globalAlpha = 0.85;
  ctx.fillText(t.footer, 96, 1780);
  ctx.globalAlpha = 1;
  const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, 'image/png'));
  if (!blob) throw new Error('The card could not be made.');
  return new File([blob], 'routify-trip.png', { type: 'image/png' });
}
