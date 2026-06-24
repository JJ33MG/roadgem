import dotenv from 'dotenv';
dotenv.config();

import { prisma } from '../utils/prisma';
import { AgentRunner } from '../utils/agentRunner';
import { sendEmail, buildBriefingEmail } from '../utils/email';
import { traceAgentRun } from '../utils/langfuse';

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'mignonjarne9@gmail.com';

export async function main() {
  await traceAgentRun('briefing-agent', async (_trace) => {
  const runner = new AgentRunner('briefing-agent');
  await runner.start();

  try {
    const since = new Date();
    since.setHours(since.getHours() - 24);

    // Collect what agents did in the last 24 hours
    const recentRuns = await prisma.agentRun.findMany({
      where: { startedAt: { gte: since } },
      include: { logs: { orderBy: { createdAt: 'asc' } } },
      orderBy: { startedAt: 'desc' },
    });

    const stats = {
      totalRuns: recentRuns.length,
      completedRuns: recentRuns.filter((r) => r.status === 'completed').length,
      failedRuns: recentRuns.filter((r) => r.status === 'failed').length,
      totalGems: await prisma.destinationGem.count(),
    };

    // Build "done" list from completed runs
    const done = recentRuns
      .filter((r) => r.status === 'completed' && r.result)
      .map((r) => ({
        agent: r.agentName,
        summary: r.result!,
      }));

    // Build "needs approval" from failed runs or runs that flagged something
    const needsApproval: { agent: string; action: string; reason: string; id: string }[] = [];

    for (const run of recentRuns) {
      if (run.status === 'failed') {
        needsApproval.push({
          agent: run.agentName,
          action: 'Investigate failure',
          reason: run.error ?? 'Unknown error',
          id: run.id,
        });
      }

      // Check logs for warning-level items that need human review
      const warnings = run.logs.filter((l) => l.level === 'warning');
      for (const warning of warnings) {
        needsApproval.push({
          agent: run.agentName,
          action: warning.message,
          reason: 'Flagged by agent as needing review',
          id: warning.id,
        });
      }
    }

    const date = new Date().toLocaleDateString('en-GB', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    });

    const html = buildBriefingEmail({ date, done, needsApproval, stats });

    await sendEmail({
      to: ADMIN_EMAIL,
      subject: `☀️ RoadGem Daily Briefing — ${needsApproval.length > 0 ? `${needsApproval.length} items need you` : 'All clear'}`,
      html,
    });

    await runner.finish(`Briefing sent to ${ADMIN_EMAIL}. ${done.length} done, ${needsApproval.length} need approval.`);
  } catch (err) {
    await runner.fail(`Briefing agent crashed: ${err}`);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
  }); // end traceAgentRun
}

if (require.main === module) main();
