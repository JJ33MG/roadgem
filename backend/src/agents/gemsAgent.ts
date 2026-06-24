import dotenv from 'dotenv';
dotenv.config();

import { prisma } from '../utils/prisma';
import { AgentRunner } from '../utils/agentRunner';
import { readMessages } from '../utils/agentBus';
import { traceAgentRun, createGeneration, endGeneration } from '../utils/langfuse';
import { DESTINATIONS } from '../utils/destinations';
import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({ apiKey: process.env.CLAUDE_API_KEY });

// Gem counts per depth level
const GEMS_PER_LEVEL = [0, 6, 12, 20];

// Ensure all seed destinations are in the DB queue
async function seedQueue(): Promise<void> {
  for (const destination of DESTINATIONS) {
    const country = destination.split(', ')[1] ?? 'Europe';
    await (prisma as any).destinationQueue.upsert({
      where: { destination },
      update: {},
      create: { destination, country, source: 'seed' },
    });
  }
}

// Discover new destinations with Claude when coverage threshold is reached
async function discoverNewDestinations(runner: AgentRunner): Promise<number> {
  const existing = await (prisma as any).destinationQueue.findMany({
    select: { destination: true },
  });
  const existingNames = existing.map((d: any) => d.destination);

  const prompt = `You are expanding RoadGem, an AI road trip planner for Europe.

We already cover these ${existingNames.length} destinations:
${existingNames.join(', ')}

Suggest 30 MORE European destinations road trippers love that are NOT in our list.
Prioritise: underrated cities, scenic regions, off-the-beaten-path gems, hidden coastal towns, mountain villages.
Avoid major tourist traps already in the list.

Respond ONLY with a JSON array:
[{"destination": "City, Country", "country": "Country"}]`;

  const generation = createGeneration(null, 'gems-discover', process.env.CLAUDE_MODEL || 'claude-sonnet-4-6', prompt);
  const message = await client.messages.create({
    model: process.env.CLAUDE_MODEL || 'claude-sonnet-4-6',
    max_tokens: 1500,
    messages: [{ role: 'user', content: prompt }],
  });

  const text = message.content[0].type === 'text' ? message.content[0].text : '';
  endGeneration(generation, text, { input: message.usage.input_tokens, output: message.usage.output_tokens });

  const jsonMatch = text.match(/\[[\s\S]*\]/);
  if (!jsonMatch) return 0;

  const newDests: { destination: string; country: string }[] = JSON.parse(jsonMatch[0]);
  let added = 0;

  for (const d of newDests) {
    if (!d.destination || existingNames.includes(d.destination)) continue;
    try {
      await (prisma as any).destinationQueue.create({
        data: { destination: d.destination, country: d.country, source: 'auto-discovery' },
      });
      added++;
    } catch {
      // already exists — skip
    }
  }

  await runner.log('success', `Auto-discovered ${added} new destinations`, { added });
  return added;
}

async function researchGemsForDestination(
  destination: string,
  currentDepth: number,
  runner: AgentRunner
): Promise<number> {
  const targetGems = GEMS_PER_LEVEL[Math.min(currentDepth + 1, GEMS_PER_LEVEL.length - 1)];
  const alreadyHave = GEMS_PER_LEVEL[currentDepth];
  const findMore = targetGems - alreadyHave;

  await runner.log('info', `Researching ${destination} (depth ${currentDepth} → ${currentDepth + 1}, finding ${findMore} more gems)`);

  const existingNames = currentDepth > 0
    ? (await prisma.destinationGem.findMany({ where: { destination }, select: { name: true } }))
        .map((g) => g.name)
    : [];

  const exclusion = existingNames.length > 0
    ? `\nDo NOT include these already-known places: ${existingNames.join(', ')}.`
    : '';

  const prompt = `You are a local travel expert for "${destination}".

Find ${findMore} genuinely hidden, non-touristy gems that locals love. Avoid famous landmarks.${exclusion}

For each gem provide:
- name: exact place name
- description: 1 sentence why locals love it (max 20 words)
- address: real street address
- category: one of [restaurant, café, bar, viewpoint, nature, culture, historic, market, activity, other]
- whyHidden: 1 sentence why tourists miss it (max 15 words)

Respond ONLY with a JSON array:
[{"name":"string","description":"string","address":"string","category":"string","whyHidden":"string"}]`;

  const generation = createGeneration(null, `gems-${destination}-d${currentDepth + 1}`, process.env.CLAUDE_MODEL || 'claude-sonnet-4-6', prompt);
  const message = await client.messages.create({
    model: process.env.CLAUDE_MODEL || 'claude-sonnet-4-6',
    max_tokens: 2000,
    messages: [{ role: 'user', content: prompt }],
  });

  const text = message.content[0].type === 'text' ? message.content[0].text : '';
  endGeneration(generation, text, { input: message.usage.input_tokens, output: message.usage.output_tokens });

  const jsonMatch = text.match(/\[[\s\S]*\]/);
  if (!jsonMatch) {
    await runner.log('warning', `No valid JSON from Claude for ${destination}`);
    return 0;
  }

  const gems = JSON.parse(jsonMatch[0]);

  // Append new gems (don't delete existing ones)
  await prisma.destinationGem.createMany({
    data: gems.map((g: any) => ({
      destination,
      name: g.name,
      description: g.description,
      address: g.address,
      category: g.category,
      whyHidden: g.whyHidden,
    })),
    skipDuplicates: true,
  });

  // Update depth in queue
  await (prisma as any).destinationQueue.update({
    where: { destination },
    data: { gemDepth: currentDepth + 1, lastResearched: new Date() },
  });

  await runner.log('success', `${gems.length} gems added for ${destination} (total depth ${currentDepth + 1})`, {
    destination, count: gems.length, depth: currentDepth + 1,
  });
  return gems.length;
}

export async function main() {
  await traceAgentRun('gems-agent', async (_trace) => {
  const runner = new AgentRunner('gems-agent');
  await runner.start();

  try {
    // Ensure all seed destinations are queued
    await seedQueue();

    const batchSize = parseInt(process.env.GEMS_BATCH_SIZE ?? '10');

    // Read priority messages from other agents
    const priorityMessages = await readMessages<{ destinations: string[]; highUrgency?: string[] }>('gems-agent');
    const priorityDestinations: string[] = [];

    for (const msg of priorityMessages) {
      if (msg.destinations) {
        for (const dest of msg.destinations) {
          const match = await (prisma as any).destinationQueue.findFirst({
            where: {
              destination: { contains: dest.split(',')[0], mode: 'insensitive' },
            },
          });
          if (match && !priorityDestinations.includes(match.destination)) {
            // Boost priority in queue
            await (prisma as any).destinationQueue.update({
              where: { destination: match.destination },
              data: { priority: { increment: 10 } },
            });
            priorityDestinations.push(match.destination);
          }
        }
      }
    }

    // Check coverage: what % of destinations have at least depth 1?
    const total = await (prisma as any).destinationQueue.count();
    const covered = await (prisma as any).destinationQueue.count({ where: { gemDepth: { gte: 1 } } });
    const coveragePct = total > 0 ? (covered / total) * 100 : 0;

    await runner.log('info', `Coverage: ${covered}/${total} destinations (${Math.round(coveragePct)}%)`);

    // Auto-discover new destinations when 80% is covered
    if (coveragePct >= 80 && total < 500) {
      await runner.log('info', `Coverage at ${Math.round(coveragePct)}% — auto-discovering new destinations`);
      const added = await discoverNewDestinations(runner);
      if (added > 0) {
        await runner.log('success', `Expanded destination list by ${added} new places`);
      }
    }

    // Select batch: prioritise by (gemDepth ASC, priority DESC) — untouched first, then deepen
    const batch = await (prisma as any).destinationQueue.findMany({
      orderBy: [{ gemDepth: 'asc' }, { priority: 'desc' }, { addedAt: 'asc' }],
      take: batchSize,
    });

    let totalGems = 0;
    let destinationsProcessed = 0;

    await runner.log('info', `Processing ${batch.length} destinations`);

    for (const item of batch) {
      // Skip depth 3 (20+ gems) — they're comprehensive enough; revisit monthly
      if (item.gemDepth >= 3) {
        const daysSince = item.lastResearched
          ? (Date.now() - new Date(item.lastResearched).getTime()) / 86400000
          : 999;
        if (daysSince < 30) continue;
      }

      try {
        const count = await researchGemsForDestination(item.destination, item.gemDepth, runner);
        totalGems += count;
        destinationsProcessed++;
        await new Promise((r) => setTimeout(r, 1500));
      } catch (err) {
        await runner.log('error', `Failed for ${item.destination}: ${err}`);
      }
    }

    await runner.finish(
      `Processed ${destinationsProcessed} destinations, added ${totalGems} gems. Coverage: ${Math.round(coveragePct)}% (${covered}/${total})`
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
