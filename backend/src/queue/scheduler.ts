import { billingQueue, qualityQueue, optimizerQueue, marketingQueue } from './index';
import { main as runBilling } from '../agents/billingAgent';
import { main as runQuality } from '../agents/qualityAgent';
import { main as runOptimizer } from '../agents/optimizerAgent';

export function startScheduler() {
  console.log('[scheduler] Starting...');

  // ── Billing — every day at 6:00 AM ────────────────────────────────────
  billingQueue.add({}, {
    repeat: { cron: '0 6 * * *' },
    jobId: 'billing-daily',
  });
  billingQueue.process(async () => {
    console.log('[scheduler] Running billing agent');
    await runBilling();
  });

  // ── Quality — every Sunday at 9:00 AM ─────────────────────────────────
  qualityQueue.add({}, {
    repeat: { cron: '0 9 * * 0' },
    jobId: 'quality-weekly',
  });
  qualityQueue.process(async () => {
    console.log('[scheduler] Running quality agent');
    await runQuality();
  });

  // ── Optimizer — every night at 2:00 AM ────────────────────────────────
  optimizerQueue.add({}, {
    repeat: { cron: '0 2 * * *' },
    jobId: 'optimizer-nightly',
  });
  optimizerQueue.process(async () => {
    console.log('[scheduler] Running optimizer agent');
    await runOptimizer();
  });

  // Error handling for all queues
  [billingQueue, qualityQueue, optimizerQueue, marketingQueue].forEach(q => {
    q.on('failed', (job, err) => {
      console.error(`[scheduler] Job ${job.id} in queue ${q.name} failed:`, err.message);
    });
    q.on('completed', (job) => {
      console.log(`[scheduler] Job ${job.id} in queue ${q.name} completed`);
    });
  });

  console.log('[scheduler] All jobs scheduled ✓');
  console.log('[scheduler]   Billing   → daily at 06:00');
  console.log('[scheduler]   Optimizer → nightly at 02:00');
  console.log('[scheduler]   Quality   → Sundays at 09:00');
}
