import dotenv from 'dotenv';
dotenv.config();

import { prisma } from '../utils/prisma';
import { AgentRunner } from '../utils/agentRunner';
import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({ apiKey: process.env.CLAUDE_API_KEY });

const DESTINATIONS = [
  'Lisbon, Portugal', 'Porto, Portugal', 'Barcelona, Spain', 'Madrid, Spain',
  'Seville, Spain', 'Valencia, Spain', 'Paris, France', 'Lyon, France',
  'Marseille, France', 'Amsterdam, Netherlands', 'Brussels, Belgium',
  'Bruges, Belgium', 'Rome, Italy', 'Florence, Italy', 'Naples, Italy',
  'Amalfi Coast, Italy', 'Prague, Czech Republic', 'Vienna, Austria',
  'Santorini, Greece', 'Athens, Greece', 'Dubrovnik, Croatia',
  'Berlin, Germany', 'Munich, Germany', 'Copenhagen, Denmark',
];

async function generateSeoContentForDestination(destination: string, runner: AgentRunner): Promise<boolean> {
  await runner.log('info', `Generating SEO content for ${destination}`);

  const prompt = `You are an SEO content specialist for RoadGem, a road trip planning website.
Generate SEO-optimized content for the destination: "${destination}"

Provide:
- title: SEO title tag (60 chars max, include destination name)
- metaDescription: Meta description (155 chars max, compelling, include call to action)
- h1: Main heading for the destination page
- intro: 2-3 sentence intro paragraph about road tripping to/from this destination
- topKeywords: array of 8 long-tail keywords travelers search for this destination (e.g. "hidden gems in Lisbon for road trips")
- faq: array of 3 FAQ objects with "question" and "answer" (1-2 sentences each), targeting voice search
- internalLinkSuggestions: array of 3 nearby destinations worth linking to

Respond ONLY with JSON:
{
  "title": "string",
  "metaDescription": "string",
  "h1": "string",
  "intro": "string",
  "topKeywords": ["string"],
  "faq": [{"question": "string", "answer": "string"}],
  "internalLinkSuggestions": ["string"]
}`;

  const message = await client.messages.create({
    model: process.env.CLAUDE_MODEL || 'claude-sonnet-4-6',
    max_tokens: 1500,
    messages: [{ role: 'user', content: prompt }],
  });

  const text = message.content[0].type === 'text' ? message.content[0].text : '';
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    await runner.log('warning', `No valid JSON from Claude for ${destination}`);
    return false;
  }

  const seoContent = JSON.parse(jsonMatch[0]);

  await prisma.agentLog.create({
    data: {
      runId: runner.getRunId()!,
      level: 'success',
      message: `SEO content generated for ${destination}`,
      data: JSON.stringify({ destination, seoContent }),
    },
  });

  await runner.log('success', `SEO content ready for ${destination}`, { destination });
  return true;
}

export async function main() {
  const runner = new AgentRunner('seo-agent');
  await runner.start();

  try {
    let successCount = 0;
    let destinationsProcessed = 0;

    const lastRun = await prisma.agentRun.findFirst({
      where: { agentName: 'seo-agent', status: 'completed' },
      orderBy: { startedAt: 'desc' },
    });

    const lastIndex = lastRun?.result
      ? parseInt(lastRun.result.match(/offset:(\d+)/)?.[1] ?? '0')
      : 0;
    const batchSize = 4;
    const startIndex = lastIndex % DESTINATIONS.length;

    await runner.log('info', `Processing destinations ${startIndex}–${startIndex + batchSize} of ${DESTINATIONS.length}`);

    for (let i = 0; i < batchSize; i++) {
      const destination = DESTINATIONS[(startIndex + i) % DESTINATIONS.length];
      try {
        const ok = await generateSeoContentForDestination(destination, runner);
        if (ok) successCount++;
        destinationsProcessed++;
        await new Promise((r) => setTimeout(r, 1500));
      } catch (err) {
        await runner.log('error', `Failed for ${destination}: ${err}`);
      }
    }

    const nextOffset = (startIndex + batchSize) % DESTINATIONS.length;
    await runner.finish(
      `Generated SEO content for ${successCount}/${destinationsProcessed} destinations. offset:${nextOffset}`
    );
  } catch (err) {
    await runner.fail(`Agent crashed: ${err}`);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) main();
