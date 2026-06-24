import dotenv from 'dotenv';
dotenv.config();

import { prisma } from '../utils/prisma';
import { AgentRunner } from '../utils/agentRunner';
import { sendMessage } from '../utils/agentBus';
import { traceAgentRun, createGeneration, endGeneration } from '../utils/langfuse';
import Anthropic from '@anthropic-ai/sdk';


const client = new Anthropic({ apiKey: process.env.CLAUDE_API_KEY });

const TRAVEL_SUBREDDITS = [
  'solotravel', 'travel', 'roadtrip', 'europe', 'backpacking',
];

async function searchTavily(query: string): Promise<string> {
  const apiKey = process.env.TAVILY_API_KEY;
  if (!apiKey) return '';

  const res = await fetch('https://api.tavily.com/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      api_key: apiKey,
      query,
      search_depth: 'basic',
      max_results: 5,
      include_answer: true,
    }),
  });

  if (!res.ok) return '';
  const data = await res.json() as any;
  return data.answer ?? data.results?.map((r: any) => r.content).join('\n') ?? '';
}

export async function main() {
  await traceAgentRun('trend-agent', async (_trace) => {
  const runner = new AgentRunner('trend-agent');
  await runner.start();

  try {
    await runner.log('info', 'Searching for trending travel destinations');

    // Search for trending destinations on Reddit and travel sites
    const redditQuery = `site:reddit.com (${TRAVEL_SUBREDDITS.map(s => `r/${s}`).join(' OR ')}) trending hidden gems Europe road trip 2026`;
    const trendQuery = 'most searched European road trip destinations 2026 trending';

    const [redditData, trendData] = await Promise.all([
      searchTavily(redditQuery),
      searchTavily(trendQuery),
    ]);

    if (!redditData && !trendData) {
      await runner.finish('No trend data available — Tavily key missing or no results.');
      return;
    }

    // Ask Claude to extract trending destinations from the raw search data
    const prompt = `You are a trend analyst for RoadGem, an AI road trip planner focused on Europe.

Here is raw data from Reddit and travel trend searches:

REDDIT DATA:
${redditData || 'No data'}

TREND DATA:
${trendData || 'No data'}

Extract:
1. Which European destinations are trending right now for road trips?
2. Any hidden gems or off-the-beaten-path places people are talking about?
3. Any travel trends (travel styles, types of trips) worth noting?

Respond as JSON:
{
  "trendingDestinations": [{"name": "string", "reason": "string", "urgency": "high|medium|low"}],
  "hiddenGemMentions": ["string"],
  "travelTrends": ["string"]
}`;

    const generation = createGeneration(_trace, 'trend-interpret', process.env.CLAUDE_MODEL || 'claude-sonnet-4-6', prompt);
    const message = await client.messages.create({
      model: process.env.CLAUDE_MODEL || 'claude-sonnet-4-6',
      max_tokens: 1000,
      messages: [{ role: 'user', content: prompt }],
    });

    const text = message.content[0].type === 'text' ? message.content[0].text : '';
    endGeneration(generation, text, { input: message.usage.input_tokens, output: message.usage.output_tokens });
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      await runner.finish('Could not parse trend data from Claude.');
      return;
    }

    const trends = JSON.parse(jsonMatch[0]);

    await runner.log('success', `Found ${trends.trendingDestinations?.length ?? 0} trending destinations`, {
      type: 'trends',
      trends,
    });

    // Send trending destinations to Gems and SEO agents
    const allDestinations = trends.trendingDestinations ?? [];
    const highUrgency = allDestinations.filter((d: any) => d.urgency === 'high');
    const allNames = allDestinations.map((d: any) => d.name);

    if (allNames.length > 0) {
      await sendMessage('trend-agent', 'gems-agent', 'TRENDING_DESTINATIONS', {
        destinations: allNames,
        highUrgency: highUrgency.map((d: any) => d.name),
        reason: 'Trending on Reddit and travel sites',
      });
      await runner.log('info', `Told gems-agent about trending: ${allNames.join(', ')}`);

      await sendMessage('trend-agent', 'seo-agent', 'TRENDING_DESTINATIONS', {
        destinations: allNames,
        travelTrends: trends.travelTrends ?? [],
        reason: 'Write SEO content for trending destinations',
      });
      await runner.log('info', `Told seo-agent about trends`);
    }

    if (highUrgency.length > 0) {
      await runner.log('warning', `${highUrgency.length} high-urgency destinations flagged: ${highUrgency.map((d: any) => d.name).join(', ')}`);
    }

    await runner.finish(
      `Trend analysis complete. ${trends.trendingDestinations?.length ?? 0} trending destinations found. ${highUrgency.length} flagged as high priority.`
    );
  } catch (err) {
    await runner.fail(`Trend agent crashed: ${err}`);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
  }); // end traceAgentRun
}

if (require.main === module) main();
