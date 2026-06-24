import dotenv from 'dotenv';
dotenv.config();

import { prisma } from '../utils/prisma';
import { AgentRunner } from '../utils/agentRunner';
import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({ apiKey: process.env.CLAUDE_API_KEY });

export async function main() {
  const runner = new AgentRunner('analytics-agent');
  await runner.start();

  try {
    // Gather trip data from last 7 days
    const since = new Date();
    since.setDate(since.getDate() - 7);

    const recentTrips = await prisma.trip.findMany({
      where: { createdAt: { gte: since } },
      select: { destination: true, travelStyle: true, budget: true, days: true, createdAt: true },
    });

    if (recentTrips.length === 0) {
      await runner.finish('No trips in the last 7 days — nothing to analyse.');
      return;
    }

    // Count destinations
    const destCount: Record<string, number> = {};
    for (const trip of recentTrips) {
      const key = trip.destination.split(',')[0].trim();
      destCount[key] = (destCount[key] ?? 0) + 1;
    }

    const topDestinations = Object.entries(destCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([dest, count]) => `${dest} (${count} trips)`);

    const avgBudget = Math.round(recentTrips.reduce((s, t) => s + t.budget, 0) / recentTrips.length);
    const avgDays = Math.round(recentTrips.reduce((s, t) => s + t.days, 0) / recentTrips.length);

    const styleCount: Record<string, number> = {};
    for (const trip of recentTrips) {
      styleCount[trip.travelStyle] = (styleCount[trip.travelStyle] ?? 0) + 1;
    }
    const topStyle = Object.entries(styleCount).sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'unknown';

    const summary = {
      period: '7 days',
      totalTrips: recentTrips.length,
      topDestinations,
      avgBudget,
      avgDays,
      topTravelStyle: topStyle,
    };

    // Ask Claude to interpret the data and suggest what agents should do next
    const prompt = `You are an analytics agent for RoadGem, an AI road trip planner.

Here is usage data from the last 7 days:
${JSON.stringify(summary, null, 2)}

Based on this data:
1. Which destinations should the Gems Agent prioritise researching next?
2. What content should the SEO Agent write about?
3. Any patterns worth noting for the product?

Be concise. Respond as JSON:
{
  "gemsAgentPriority": ["destination1", "destination2", "destination3"],
  "seoAgentTopics": ["topic1", "topic2"],
  "insights": ["insight1", "insight2"]
}`;

    const message = await client.messages.create({
      model: process.env.CLAUDE_MODEL || 'claude-sonnet-4-6',
      max_tokens: 800,
      messages: [{ role: 'user', content: prompt }],
    });

    const text = message.content[0].type === 'text' ? message.content[0].text : '';
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    const recommendations = jsonMatch ? JSON.parse(jsonMatch[0]) : null;

    await runner.log('success', `Analytics complete for last 7 days`, {
      summary,
      recommendations,
    });

    // Store recommendations so other agents can read them
    await prisma.agentLog.create({
      data: {
        runId: runner.getRunId()!,
        level: 'success',
        message: 'Agent recommendations ready',
        data: JSON.stringify({ type: 'recommendations', recommendations }),
      },
    });

    await runner.finish(
      `Analysed ${recentTrips.length} trips. Top destination: ${topDestinations[0] ?? 'none'}. Avg budget: €${avgBudget}.`
    );
  } catch (err) {
    await runner.fail(`Analytics agent crashed: ${err}`);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) main();
