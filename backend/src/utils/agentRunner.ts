import { prisma } from './prisma';

export class AgentRunner {
  private runId: string | null = null;
  private agentName: string;

  constructor(agentName: string) {
    this.agentName = agentName;
  }

  async start(): Promise<void> {
    const run = await prisma.agentRun.create({
      data: { agentName: this.agentName, status: 'running' },
    });
    this.runId = run.id;
    await this.log('info', `Agent "${this.agentName}" started`);
  }

  async log(level: 'info' | 'success' | 'warning' | 'error', message: string, data?: object): Promise<void> {
    if (!this.runId) return;
    console.log(`[${this.agentName}] [${level.toUpperCase()}] ${message}`);
    await prisma.agentLog.create({
      data: {
        runId: this.runId,
        level,
        message,
        data: data ? JSON.stringify(data) : null,
      },
    });
  }

  async finish(result: string): Promise<void> {
    if (!this.runId) return;
    await this.log('success', result);
    await prisma.agentRun.update({
      where: { id: this.runId },
      data: { status: 'completed', finishedAt: new Date(), result },
    });
  }

  async fail(error: string): Promise<void> {
    if (!this.runId) return;
    await this.log('error', error);
    await prisma.agentRun.update({
      where: { id: this.runId },
      data: { status: 'failed', finishedAt: new Date(), error },
    });
  }

  getRunId(): string | null {
    return this.runId;
  }
}
