import { Router, Request, Response } from 'express';
import { prisma } from '../utils/prisma';
import { main as runGems } from '../agents/gemsAgent';
import { main as runSeo } from '../agents/seoAgent';

const router = Router();

router.get('/runs', async (_req: Request, res: Response) => {
  try {
    const runs = await prisma.agentRun.findMany({
      orderBy: { startedAt: 'desc' },
      take: 50,
      include: {
        logs: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });
    res.json(runs);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch agent runs' });
  }
});

router.get('/runs/:id/logs', async (req: Request, res: Response) => {
  try {
    const logs = await prisma.agentLog.findMany({
      where: { runId: req.params.id },
      orderBy: { createdAt: 'asc' },
    });
    res.json(logs);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch logs' });
  }
});

router.get('/stats', async (_req: Request, res: Response) => {
  try {
    const [totalRuns, runningRuns, completedRuns, failedRuns, totalLogs] = await Promise.all([
      prisma.agentRun.count(),
      prisma.agentRun.count({ where: { status: 'running' } }),
      prisma.agentRun.count({ where: { status: 'completed' } }),
      prisma.agentRun.count({ where: { status: 'failed' } }),
      prisma.agentLog.count(),
    ]);

    const agentSummary = await prisma.agentRun.groupBy({
      by: ['agentName'],
      _count: { id: true },
      _max: { startedAt: true },
    });

    res.json({ totalRuns, runningRuns, completedRuns, failedRuns, totalLogs, agentSummary });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

const AGENTS: Record<string, () => Promise<void>> = {
  'gems-agent': runGems,
  'seo-agent': runSeo,
};

router.post('/:name/trigger', (req: Request, res: Response) => {
  const { name } = req.params;
  const agentFn = AGENTS[name];

  if (!agentFn) {
    return res.status(404).json({ error: 'Unknown agent' });
  }

  // Fire and forget — run in background without blocking the request
  agentFn().catch((err) => console.error(`Agent ${name} crashed:`, err));

  res.json({ message: `Agent ${name} triggered`, started: true });
});

export default router;
