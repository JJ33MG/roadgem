import dotenv from 'dotenv';
dotenv.config();

import { prisma } from '../utils/prisma';
import { AgentRunner } from '../utils/agentRunner';
import { readMessages } from '../utils/agentBus';
import { traceAgentRun, createGeneration, endGeneration } from '../utils/langfuse';
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

async function researchGemsForDestination(destination: string, runner: AgentRunner): Promise<number> {
  await runner.log('info', `Researching hidden gems for ${destination}`);

  const prompt = `You are a local travel expert researching authentic hidden gems for "${destination}".

Find 6 genuinely hidden, non-touristy gems that locals love. Avoid famous landmarks.

For each gem provide:
- name: exact place name
- description: 1 sentence why locals love it (max 20 words)
- address: real street address
- category: one of [restaurant, café, bar, viewpoint, nature, culture, historic, market, activity, other]
- whyHidden: 1 sentence why tourists miss it (max 15 words)

Respond ONLY with a JSON array:
[
  {
    "name": "string",
    "description": "string",
    "address": "string",
    "category": "string",
    "whyHidden": "string"
  }
]`;

  const generation = createGeneration(null, `gems-${destination}`, process.env.CLAUDE_MODEL || 'claude-sonnet-4-6', prompt);
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

  // Remove old gems for this destination and replace with fresh ones
  await prisma.destinationGem.deleteMany({ where: { destination } });
  await prisma.destinationGem.createMany({
    data: gems.map((g: any) => ({
      destination,
      name: g.name,
      description: g.description,
      address: g.address,
      category: g.category,
      whyHidden: g.whyHidden,
    })),
  });

  await runner.log('success', `${gems.length} gems saved for ${destination}`, { destination, count: gems.length });
  return gems.length;
}

export async function main() {
  await traceAgentRun('gems-agent', async (trace) => {
  const runner = new AgentRunner('gems-agent');
  await runner.start();

  try {
    let totalGems = 0;
    let destinationsProcessed = 0;

    // Process a batch of destinations (rotate through them)
    const lastRun = await prisma.agentRun.findFirst({
      where: { agentName: 'gems-agent', status: 'completed' },
      orderBy: { startedAt: 'desc' },
    });

    // Read messages from Analytics and Trend agents
    const priorityMessages = await readMessages<{ destinations: string[]; highUrgency?: string[] }>('gems-agent');
    const priorityDestinations: string[] = [];

    for (const msg of priorityMessages) {
      if (msg.destinations) {
        for (const dest of msg.destinations) {
          // Match against our known destinations list
          const match = DESTINATIONS.find((d) =>
            d.toLowerCase().includes(dest.toLowerCase()) ||
            dest.toLowerCase().includes(d.split(',')[0].toLowerCase())
          );
          if (match && !priorityDestinations.includes(match)) {
            priorityDestinations.push(match);
          }
        }
      }
    }

    if (priorityDestinations.length > 0) {
      await runner.log('info', `Priority destinations from other agents: ${priorityDestinations.join(', ')}`);
    }

    // Figure out where we left off
    const lastIndex = lastRun?.result
      ? parseInt(lastRun.result.match(/offset:(\d+)/)?.[1] ?? '0')
      : 0;
    const batchSize = 5;
    const startIndex = lastIndex % DESTINATIONS.length;

    // Put priority destinations first, then fill remaining slots from normal rotation
    const normalBatch = Array.from({ length: batchSize }, (_, i) =>
      DESTINATIONS[(startIndex + i) % DESTINATIONS.length]
    ).filter((d) => !priorityDestinations.includes(d));

    const batch = [...priorityDestinations, ...normalBatch].slice(0, batchSize + priorityDestinations.length);

    await runner.log('info', `Processing ${batch.length} destinations (${priorityDestinations.length} priority, ${batch.length - priorityDestinations.length} scheduled)`);

    for (let i = 0; i < batch.length; i++) {
      const destination = batch[i];
      try {
        const count = await researchGemsForDestination(destination, runner);
        totalGems += count;
        destinationsProcessed++;
        // Small delay to avoid rate limiting
        await new Promise((r) => setTimeout(r, 1500));
      } catch (err) {
        await runner.log('error', `Failed for ${destination}: ${err}`);
      }
    }

    const nextOffset = (startIndex + batchSize) % DESTINATIONS.length;
    await runner.finish(
      `Researched ${destinationsProcessed} destinations, found ${totalGems} hidden gems. offset:${nextOffset}`
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
