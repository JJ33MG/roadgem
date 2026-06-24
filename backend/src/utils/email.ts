import dotenv from 'dotenv';
dotenv.config();

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
}

export async function sendEmail({ to, subject, html }: EmailOptions): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn('[email] RESEND_API_KEY not set, skipping email');
    return false;
  }

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'RoadGem Agents <agents@roadgem.eu>',
      to,
      subject,
      html,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error('[email] Send failed:', err);
    return false;
  }

  console.log('[email] Sent:', subject, '→', to);
  return true;
}

export function buildBriefingEmail(data: {
  date: string;
  done: { agent: string; summary: string }[];
  needsApproval: { agent: string; action: string; reason: string; id: string }[];
  stats: { totalRuns: number; completedRuns: number; failedRuns: number; totalGems: number };
}): string {
  const approvalRows = data.needsApproval.length > 0
    ? data.needsApproval.map(item => `
      <tr>
        <td style="padding:12px 16px;border-bottom:1px solid #1a1a1a;">
          <span style="color:#af50ff;font-weight:600;">${item.agent}</span>
        </td>
        <td style="padding:12px 16px;border-bottom:1px solid #1a1a1a;color:#f7f9fa;">${item.action}</td>
        <td style="padding:12px 16px;border-bottom:1px solid #1a1a1a;color:#828384;">${item.reason}</td>
      </tr>`).join('')
    : `<tr><td colspan="3" style="padding:16px;color:#828384;text-align:center;">Nothing needs your approval today ✓</td></tr>`;

  const doneRows = data.done.map(item => `
    <li style="padding:8px 0;border-bottom:1px solid #1a1a1a;color:#828384;">
      <span style="color:#af50ff;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:1px;">${item.agent}</span>
      <br/><span style="color:#f7f9fa;">${item.summary}</span>
    </li>`).join('');

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#090909;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <div style="max-width:600px;margin:0 auto;padding:32px 16px;">

    <!-- Header -->
    <div style="margin-bottom:32px;">
      <div style="display:inline-flex;align-items:center;gap:8px;background:#af50ff18;border:1px solid #af50ff40;border-radius:999px;padding:6px 14px;margin-bottom:16px;">
        <span style="color:#af50ff;font-size:11px;font-weight:600;letter-spacing:2px;text-transform:uppercase;">Daily Briefing</span>
      </div>
      <h1 style="margin:0;color:#f7f9fa;font-size:28px;font-weight:300;line-height:1.2;">Good morning, Jarne 👋</h1>
      <p style="margin:8px 0 0;color:#828384;font-size:14px;">${data.date} — here's what your agents did while you slept.</p>
    </div>

    <!-- Stats row -->
    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:32px;">
      ${[
        { label: 'Total runs', value: data.stats.totalRuns },
        { label: 'Completed', value: data.stats.completedRuns },
        { label: 'Failed', value: data.stats.failedRuns },
        { label: 'Gems stored', value: data.stats.totalGems },
      ].map(s => `
        <div style="background:#0c0c10;border:1px solid #1a1a1a;border-radius:12px;padding:16px;text-align:center;">
          <div style="color:#f7f9fa;font-size:24px;font-weight:600;">${s.value}</div>
          <div style="color:#828384;font-size:11px;margin-top:4px;">${s.label}</div>
        </div>`).join('')}
    </div>

    <!-- Needs approval -->
    <div style="margin-bottom:32px;">
      <h2 style="margin:0 0 12px;color:#f7f9fa;font-size:16px;font-weight:600;">
        ⚠️ Needs your approval (${data.needsApproval.length})
      </h2>
      <div style="background:#0c0c10;border:1px solid #1a1a1a;border-radius:12px;overflow:hidden;">
        <table style="width:100%;border-collapse:collapse;">
          <thead>
            <tr style="background:#111;">
              <th style="padding:10px 16px;text-align:left;color:#828384;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:1px;">Agent</th>
              <th style="padding:10px 16px;text-align:left;color:#828384;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:1px;">Action</th>
              <th style="padding:10px 16px;text-align:left;color:#828384;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:1px;">Reason</th>
            </tr>
          </thead>
          <tbody>${approvalRows}</tbody>
        </table>
      </div>
    </div>

    <!-- Done -->
    <div style="margin-bottom:32px;">
      <h2 style="margin:0 0 12px;color:#f7f9fa;font-size:16px;font-weight:600;">
        ✅ Done autonomously (${data.done.length})
      </h2>
      <div style="background:#0c0c10;border:1px solid #1a1a1a;border-radius:12px;padding:4px 16px;">
        <ul style="list-style:none;margin:0;padding:0;">
          ${doneRows || '<li style="padding:16px 0;color:#828384;text-align:center;">No autonomous actions today</li>'}
        </ul>
      </div>
    </div>

    <!-- Footer -->
    <div style="text-align:center;color:#454545;font-size:12px;padding-top:16px;border-top:1px solid #1a1a1a;">
      RoadGem Agent Ecosystem · <a href="https://roadgem.vercel.app/agents" style="color:#af50ff;text-decoration:none;">View dashboard</a>
    </div>
  </div>
</body>
</html>`;
}

export function buildAlertEmail(data: {
  agent: string;
  issue: string;
  details: string;
  canSelfFix: boolean;
}): string {
  return `
<!DOCTYPE html>
<html>
<body style="margin:0;padding:32px 16px;background:#090909;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <div style="max-width:560px;margin:0 auto;">
    <div style="background:#ff000015;border:1px solid #ff000040;border-radius:12px;padding:24px;">
      <div style="color:#ff4444;font-size:11px;font-weight:600;letter-spacing:2px;text-transform:uppercase;margin-bottom:12px;">🚨 Urgent Alert</div>
      <h1 style="margin:0 0 8px;color:#f7f9fa;font-size:22px;font-weight:400;">${data.issue}</h1>
      <p style="margin:0 0 16px;color:#828384;font-size:14px;">Detected by <strong style="color:#af50ff;">${data.agent}</strong></p>
      <div style="background:#0c0c10;border-radius:8px;padding:16px;font-family:monospace;font-size:13px;color:#f7f9fa;white-space:pre-wrap;">${data.details}</div>
      ${!data.canSelfFix ? `<p style="margin:16px 0 0;color:#ff4444;font-size:14px;">⚠️ Agents could not fix this automatically. Your action is required.</p>` : ''}
      <div style="margin-top:20px;">
        <a href="https://roadgem.vercel.app/agents" style="background:#af50ff;color:white;padding:12px 24px;border-radius:999px;text-decoration:none;font-size:14px;font-weight:600;">View dashboard →</a>
      </div>
    </div>
  </div>
</body>
</html>`;
}
