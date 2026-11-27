// The AI decides on every community photo (no manual review, Jarne 27 Nov): unsafe photos are rejected,
// the rest goes public. A failed check is marked failed and tried again. Also writes the photo challenge per gem.
import Anthropic from '@anthropic-ai/sdk';

export type Verdict = { reject: boolean; challengeMet: boolean; failed: boolean; note: string };

const model = () => process.env.CLAUDE_MODEL || 'claude-sonnet-4-6';
let client: Anthropic | null = null;
const claude = () => (client ??= new Anthropic({ apiKey: process.env.CLAUDE_API_KEY }));

export function parseVerdict(text: string): Verdict {
  const m = text.match(/\{[\s\S]*\}/);
  try {
    const v = JSON.parse(m ? m[0] : '');
    if (typeof v.safe !== 'boolean') throw new Error('no verdict');
    return { reject: v.safe === false, challengeMet: v.challengeMet === true, failed: false, note: String(v.note ?? '').slice(0, 300) };
  } catch {
    return { reject: false, challengeMet: false, failed: true, note: 'AI check unreadable; tried again later.' };
  }
}

export const fallbackChallenge = (gemName: string) => `${gemName} in one shot, with something that shows you were there today.`;

export async function checkPhoto(photo: Buffer, type: string, gemName: string, challenge: string): Promise<Verdict> {
  if (!process.env.CLAUDE_API_KEY) return { reject: false, challengeMet: false, failed: true, note: 'Not checked yet (no AI key).' };
  try {
    const msg = await claude().messages.create({
      model: model(),
      max_tokens: 200,
      messages: [{
        role: 'user',
        content: [
          { type: 'image', source: { type: 'base64', media_type: type as 'image/jpeg' | 'image/png' | 'image/webp', data: photo.toString('base64') } },
          {
            type: 'text',
            text: `This photo was posted in a family travel app, tagged near the place "${gemName}". It may show the place itself, or travellers, a camper, a tent or a meal near it: all fine. Photo challenge: "${challenge}".
Answer ONLY with JSON: {"safe": boolean (false only for nudity, violence, hate, drugs, personal documents, a readable number plate in close-up, or spam such as screenshots, adverts or text-only images), "challengeMet": boolean (the photo plainly shows the challenge done at that place), "note": "one short sentence"}`,
          },
        ],
      }],
    });
    const part = msg.content[0];
    return parseVerdict(part && part.type === 'text' ? part.text : '');
  } catch {
    return { reject: false, challengeMet: false, failed: true, note: 'AI check failed; tried again later.' };
  }
}

export async function writeChallenge(gemName: string, address: string): Promise<string> {
  if (!process.env.CLAUDE_API_KEY) return fallbackChallenge(gemName);
  try {
    const msg = await claude().messages.create({
      model: model(),
      max_tokens: 80,
      messages: [{
        role: 'user',
        content: `Write one photo challenge for travellers visiting "${gemName}" (${address}). One sentence, under 16 words, specific to that place, doable by anyone on the spot, no emoji, no quotes. Example: "Both towers of the city hall in one shot."`,
      }],
    });
    const part = msg.content[0];
    const text = part && part.type === 'text' ? part.text.trim().replace(/^["']|["']$/g, '') : '';
    return text && text.length < 140 ? text : fallbackChallenge(gemName);
  } catch {
    return fallbackChallenge(gemName);
  }
}
