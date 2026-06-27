import Anthropic from '@anthropic-ai/sdk';
import { prisma } from '../utils/prisma';
import { sendEmail } from '../utils/email';

const claude = new Anthropic({ apiKey: process.env.CLAUDE_API_KEY });

export async function main() {
  const run = await prisma.agentRun.create({
    data: { agentName: 'optimizer', status: 'running' },
  });

  const log = async (msg: string) => {
    console.log(`[optimizer] ${msg}`);
    await prisma.agentLog.create({ data: { runId: run.id, message: msg } });
  };

  try {
    await log('Scanning trips for optimization opportunities...');

    // Trips from the last 7 days that haven't been optimized yet
    const trips = await prisma.trip.findMany({
      where: { createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } },
      include: { user: { select: { email: true, name: true } } },
      take: 20,
    });

    let optimized = 0;

    for (const trip of trips) {
      const stops = JSON.parse(trip.stops || '[]');
      const tips = JSON.parse(trip.tips || '[]');

      const prompt = `You are a travel optimizer. Review this trip and suggest 2-3 specific improvements:
Destination: ${trip.destination} (${trip.days} days, €${trip.budget} budget)
Style: ${trip.travelStyle}
Current stops: ${stops.map((s: any) => s.location).join(' → ')}
Current tips: ${tips.slice(0, 2).join('; ')}

Find concrete improvements: cheaper alternatives, better-timed stops, hidden local tips.
Respond ONLY with JSON:
{ "hasImprovements": boolean, "improvements": ["string"], "newTips": ["string"] }`;

      const res = await claude.messages.create({
        model: process.env.CLAUDE_MODEL || 'claude-sonnet-4-6',
        max_tokens: 512,
        messages: [{ role: 'user', content: prompt }],
      });

      let result: { hasImprovements: boolean; improvements: string[]; newTips: string[] };
      try {
        const text = (res.content[0] as any).text;
        const match = text.match(/\{[\s\S]*\}/);
        result = match ? JSON.parse(match[0]) : { hasImprovements: false, improvements: [], newTips: [] };
      } catch {
        result = { hasImprovements: false, improvements: [], newTips: [] };
      }

      if (result.hasImprovements && result.newTips.length > 0) {
        // Merge new tips with existing
        const existingTips: string[] = JSON.parse(trip.tips || '[]');
        const mergedTips = [...result.newTips, ...existingTips].slice(0, 8);

        await prisma.trip.update({
          where: { id: trip.id },
          data: { tips: JSON.stringify(mergedTips) },
        });

        // Email user if logged in
        if (trip.user?.email) {
          await sendEmail({
            to: trip.user.email,
            subject: `💡 We found improvements for your ${trip.destination} trip`,
            html: `
              <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px 16px;background:#080c14;color:white;">
                <h2 style="color:#f5a623;">We optimized your trip, ${trip.user.name} 🗺️</h2>
                <p style="color:rgba(255,255,255,0.7);">Our AI found <strong>${result.improvements.length} improvements</strong> for your ${trip.destination} trip:</p>
                <ul style="color:rgba(255,255,255,0.7);padding-left:20px;">
                  ${result.improvements.map(i => `<li style="margin-bottom:8px;">${i}</li>`).join('')}
                </ul>
                <a href="https://routify.ink/trips/${trip.id}" style="display:inline-block;margin-top:16px;background:#f5a623;color:#080c14;padding:12px 28px;border-radius:9999px;text-decoration:none;font-weight:600;">See updated trip →</a>
              </div>`,
          });
        }
        optimized++;
        await log(`Optimized trip ${trip.id} (${trip.destination}): ${result.improvements[0]}`);
      }
    }

    const summary = `Scanned ${trips.length} trips, optimized ${optimized}`;
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
