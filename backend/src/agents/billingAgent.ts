import { prisma } from '../utils/prisma';
import { sendEmail } from '../utils/email';

export async function main() {
  const run = await prisma.agentRun.create({
    data: { agentName: 'billing', status: 'running' },
  });

  const log = async (msg: string) => {
    console.log(`[billing] ${msg}`);
    await prisma.agentLog.create({ data: { runId: run.id, message: msg } });
  };

  try {
    await log('Scanning subscriptions...');

    const now = new Date();
    const in3days = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    // Users expiring in next 3 days
    const expiringSoon = await prisma.user.findMany({
      where: {
        subscriptionTier: 'premium',
        subscriptionExpires: { gte: now, lte: in3days },
      },
    });

    for (const user of expiringSoon) {
      const days = Math.ceil((user.subscriptionExpires!.getTime() - now.getTime()) / 86400000);
      await sendEmail({
        to: user.email,
        subject: `Your Routify Premium expires in ${days} day${days !== 1 ? 's' : ''}`,
        html: `
          <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px 16px;background:#080c14;color:white;">
            <h2 style="color:#f5a623;margin-bottom:8px;">Hey ${user.name} 👋</h2>
            <p style="color:rgba(255,255,255,0.7);">Your Routify Premium subscription expires in <strong>${days} day${days !== 1 ? 's' : ''}</strong>.</p>
            <p style="color:rgba(255,255,255,0.7);">Renew now to keep access to hidden gems, unlimited trips and more.</p>
            <a href="https://routify.ink/pricing" style="display:inline-block;margin-top:16px;background:#f5a623;color:#080c14;padding:12px 28px;border-radius:9999px;text-decoration:none;font-weight:600;">Renew Premium →</a>
          </div>`,
      });
      await log(`Renewal reminder sent to ${user.email} (${days}d left)`);
    }

    // Users whose subscription expired yesterday → downgrade
    const expired = await prisma.user.findMany({
      where: {
        subscriptionTier: 'premium',
        subscriptionExpires: { gte: yesterday, lt: now },
      },
    });

    for (const user of expired) {
      await prisma.user.update({
        where: { id: user.id },
        data: { subscriptionTier: 'free' },
      });
      await sendEmail({
        to: user.email,
        subject: 'Your Routify Premium has expired',
        html: `
          <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px 16px;background:#080c14;color:white;">
            <h2 style="color:white;margin-bottom:8px;">Your Premium has ended, ${user.name}</h2>
            <p style="color:rgba(255,255,255,0.7);">Your trips are still saved. Upgrade again anytime to unlock hidden gems and unlimited planning.</p>
            <a href="https://routify.ink/pricing" style="display:inline-block;margin-top:16px;background:#f5a623;color:#080c14;padding:12px 28px;border-radius:9999px;text-decoration:none;font-weight:600;">Reactivate →</a>
          </div>`,
      });
      await log(`Downgraded ${user.email} to free (expired)`);
    }

    const summary = `${expiringSoon.length} renewal reminders sent, ${expired.length} accounts downgraded`;
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
