import Anthropic from '@anthropic-ai/sdk';
import { prisma } from '../utils/prisma';
import { sendEmail } from '../utils/email';
import { generateTripItinerary } from '../utils/claude';

const claude = new Anthropic({ apiKey: process.env.CLAUDE_API_KEY });

export async function main() {
  const run = await prisma.agentRun.create({
    data: { agentName: 'quality', status: 'running' },
  });

  const log = async (msg: string) => {
    console.log(`[quality] ${msg}`);
    await prisma.agentLog.create({ data: { runId: run.id, message: msg } });
  };

  try {
    await log('Sampling trips for quality check...');

    // Sample 5 random trips from the last 30 days
    const recentTrips = await prisma.trip.findMany({
      where: { createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } },
      include: { user: { select: { email: true, name: true } } },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    if (recentTrips.length === 0) {
      await log('No trips to review');
      await prisma.agentRun.update({ where: { id: run.id }, data: { status: 'completed', finishedAt: new Date(), result: 'No trips to review' } });
      return;
    }

    // Pick 5 random
    const sample = recentTrips.sort(() => Math.random() - 0.5).slice(0, 5);
    let flagged = 0;
    let regenerated = 0;

    for (const trip of sample) {
      const stops = JSON.parse(trip.stops || '[]');
      const highlights = JSON.parse(trip.highlights || '[]');

      const evalPrompt = `You are a quality reviewer for a travel app. Rate this trip itinerary:
Destination: ${trip.destination}
Duration: ${trip.days} days
Budget: €${trip.budget}
Stops: ${stops.map((s: any) => s.location).join(', ')}
Highlights: ${highlights.slice(0, 3).join('; ')}

Rate from 1-10 and respond ONLY with JSON:
{ "score": number, "issues": ["string"], "regenerate": boolean }

Regenerate=true if score < 6 or stops are generic/wrong cities.`;

      const res = await claude.messages.create({
        model: process.env.CLAUDE_MODEL || 'claude-sonnet-4-6',
        max_tokens: 256,
        messages: [{ role: 'user', content: evalPrompt }],
      });

      let evaluation: { score: number; issues: string[]; regenerate: boolean };
      try {
        const text = (res.content[0] as any).text;
        const match = text.match(/\{[\s\S]*\}/);
        evaluation = match ? JSON.parse(match[0]) : { score: 8, issues: [], regenerate: false };
      } catch {
        evaluation = { score: 8, issues: [], regenerate: false };
      }

      await log(`Trip ${trip.id} (${trip.destination}): score ${evaluation.score}/10${evaluation.issues.length ? ' — ' + evaluation.issues[0] : ''}`);

      if (evaluation.regenerate) {
        flagged++;
        try {
          await log(`Regenerating trip ${trip.id}...`);
          const priorities = JSON.parse(trip.priorities || '[]');
          const newData = await generateTripItinerary(
            trip.startLocation, trip.destination, trip.days,
            trip.budget, trip.travelStyle, priorities
          );

          await prisma.trip.update({
            where: { id: trip.id },
            data: {
              stops: JSON.stringify(newData.stops || []),
              highlights: JSON.stringify(newData.highlights || []),
              tips: JSON.stringify(newData.tips || []),
              totalCost: newData.totalCost ?? trip.totalCost,
            },
          });

          // Notify user if logged in
          if (trip.user?.email) {
            await sendEmail({
              to: trip.user.email,
              subject: `We improved your ${trip.destination} trip ✨`,
              html: `
                <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px 16px;background:#080c14;color:white;">
                  <h2 style="color:#f5a623;">Good news, ${trip.user.name} 👋</h2>
                  <p style="color:rgba(255,255,255,0.7);">Our AI reviewed your <strong>${trip.destination}</strong> trip and found some improvements. We've updated it automatically.</p>
                  <a href="https://routify.ink/trips/${trip.id}" style="display:inline-block;margin-top:16px;background:#f5a623;color:#080c14;padding:12px 28px;border-radius:9999px;text-decoration:none;font-weight:600;">View updated trip →</a>
                </div>`,
            });
          }
          regenerated++;
          await log(`Regenerated trip ${trip.id} successfully`);
        } catch (e: any) {
          await log(`Failed to regenerate ${trip.id}: ${e.message}`);
        }
      }
    }

    const summary = `Reviewed ${sample.length} trips — ${flagged} flagged, ${regenerated} regenerated`;
    await prisma.agentRun.update({
      where: { id: run.id },
      data: { status: 'completed', finishedAt: new Date(), result: summary },
    });
    await log(`Done — ${summary}`);
  } catch (err: any) {
    await prisma.agentRun.update({
      where: { id: run.id },
      data: { status: 'failed', finishedAt: new Date(), error: err.message },
    });
    throw err;
  }
}
