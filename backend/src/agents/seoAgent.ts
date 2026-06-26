import dotenv from 'dotenv';
dotenv.config();

import { prisma } from '../utils/prisma';
import { AgentRunner } from '../utils/agentRunner';
import { readMessages } from '../utils/agentBus';
import { traceAgentRun, createGeneration, endGeneration } from '../utils/langfuse';
import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({ apiKey: process.env.CLAUDE_API_KEY });

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

  const generation = createGeneration(null, `seo-${destination}`, process.env.CLAUDE_MODEL || 'claude-sonnet-4-6', prompt);
  const message = await client.messages.create({
    model: process.env.CLAUDE_MODEL || 'claude-sonnet-4-6',
    max_tokens: 1500,
    messages: [{ role: 'user', content: prompt }],
  });

  const text = message.content[0].type === 'text' ? message.content[0].text : '';
  endGeneration(generation, text, { input: message.usage.input_tokens, output: message.usage.output_tokens });
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    await runner.log('warning', `No valid JSON from Claude for ${destination}`);
    return false;
  }

  let seoContent: any;
  try {
    seoContent = JSON.parse(jsonMatch[0]);
  } catch {
    await runner.log('warning', `Malformed JSON from Claude for ${destination}`);
    return false;
  }

  const slug = destination.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

  await (prisma as any).destinationSeo.upsert({
    where: { slug },
    update: {
      title: seoContent.title ?? '',
      metaDescription: seoContent.metaDescription ?? '',
      h1: seoContent.h1 ?? '',
      intro: seoContent.intro ?? '',
      topKeywords: JSON.stringify(seoContent.topKeywords ?? []),
      faq: JSON.stringify(seoContent.faq ?? []),
      internalLinkSuggestions: JSON.stringify(seoContent.internalLinkSuggestions ?? []),
    },
    create: {
      destination,
      slug,
      title: seoContent.title ?? '',
      metaDescription: seoContent.metaDescription ?? '',
      h1: seoContent.h1 ?? '',
      intro: seoContent.intro ?? '',
      topKeywords: JSON.stringify(seoContent.topKeywords ?? []),
      faq: JSON.stringify(seoContent.faq ?? []),
      internalLinkSuggestions: JSON.stringify(seoContent.internalLinkSuggestions ?? []),
    },
  });

  await runner.log('success', `SEO content saved for ${destination}`, { destination });
  return true;
}

export async function main() {
  await traceAgentRun('seo-agent', async (_trace) => {
  const runner = new AgentRunner('seo-agent');
  await runner.start();

  try {
    let successCount = 0;
    let destinationsProcessed = 0;

    // Read priority messages from other agents
    const priorityMessages = await readMessages<{ destinations?: string[]; topics?: string[] }>('seo-agent');
    for (const msg of priorityMessages) {
      if (msg.destinations) {
        for (const dest of msg.destinations) {
          const match = await (prisma as any).destinationQueue.findFirst({
            where: { destination: { contains: dest.split(',')[0], mode: 'insensitive' } },
          });
          if (match) {
            await (prisma as any).destinationQueue.update({
              where: { destination: match.destination },
              data: { priority: { increment: 5 } },
            });
          }
        }
      }
    }

    const batchSize = parseInt(process.env.SEO_BATCH_SIZE ?? '8');

    // Pick destinations that have gems but no SEO yet, ordered by priority
    const batch = await (prisma as any).destinationQueue.findMany({
      where: { gemDepth: { gte: 1 }, seoGenerated: false },
      orderBy: [{ priority: 'desc' }, { addedAt: 'asc' }],
      take: batchSize,
    });

    // If all SEO is done, refresh oldest ones
    const finalBatch = batch.length > 0 ? batch : await (prisma as any).destinationQueue.findMany({
      where: { gemDepth: { gte: 1 } },
      orderBy: [{ lastResearched: 'asc' }],
      take: batchSize,
    });

    await runner.log('info', `Processing ${finalBatch.length} destinations for SEO`);

    for (const item of finalBatch) {
      try {
        const ok = await generateSeoContentForDestination(item.destination, runner);
        if (ok) {
          successCount++;
          await (prisma as any).destinationQueue.update({
            where: { destination: item.destination },
            data: { seoGenerated: true },
          });
        }
        destinationsProcessed++;
        await new Promise((r) => setTimeout(r, 1500));
      } catch (err) {
        await runner.log('error', `Failed for ${item.destination}: ${err}`);
      }
    }

    await runner.finish(
      `Generated SEO content for ${successCount}/${destinationsProcessed} destinations.`
    );
  } catch (err) {
    await runner.fail(`Agent crashed: ${err}`);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
  }); // end traceAgentRun
}

if (require.main === module) main();
