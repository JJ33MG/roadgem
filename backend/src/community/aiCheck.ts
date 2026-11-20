// A first look at every photo before a person approves it: unsafe photos are rejected at once,
// everything else waits for the admin with a short note. Also writes the photo challenge per gem.
import Anthropic from '@anthropic-ai/sdk';

export type Verdict = { reject: boolean; challengeMet: boolean; note: string };

const model = () => process.env.CLAUDE_MODEL || 'claude-sonnet-4-6';
let client: Anthropic | null = null;
const claude = () => (client ??= new Anthropic({ apiKey: process.env.CLAUDE_API_KEY }));

export function parseVerdict(text: string): Verdict {
  const m = text.match(/\{[\s\S]*\}/);
  try {
    const v = JSON.parse(m ? m[0] : '');
    return { reject: v.safe === false, challengeMet: v.challengeMet === true, note: String(v.note ?? '').slice(0, 300) };
  } catch {
    return { reject: false, challengeMet: false, note: 'AI check unreadable; please look yourself.' };
  }
}

export const fallbackChallenge = (gemName: string) => `${gemName} in one shot, with something that shows you were there today.`;

export async function checkPhoto(photo: Buffer, type: string, gemName: string, challenge: string): Promise<Verdict> {
  if (!process.env.CLAUDE_API_KEY) return { reject: false, challengeMet: false, note: 'Not checked by AI (no key).' };
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
            text: `This photo was posted in a travel app at the place "${gemName}". Photo challenge: "${challenge}".
Answer ONLY with JSON: {"safe": boolean (false for nudity, violence, hate, personal documents or anything not fit for a family app), "showsPlace": boolean (it plausibly shows that place), "challengeMet": boolean, "note": "one short sentence for the moderator"}`,
          },
        ],
      }],
    });
    const part = msg.content[0];
    return parseVerdict(part && part.type === 'text' ? part.text : '');
  } catch {
    return { reject: false, challengeMet: false, note: 'AI check failed; please look yourself.' };
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
