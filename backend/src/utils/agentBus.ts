import { prisma } from './prisma';

export async function sendMessage(fromAgent: string, toAgent: string, type: string, payload: object) {
  await prisma.agentMessage.create({
    data: { fromAgent, toAgent, type, payload: JSON.stringify(payload) },
  });
}

export async function readMessages<T = any>(toAgent: string, type?: string): Promise<T[]> {
  const messages = await prisma.agentMessage.findMany({
    where: { toAgent, read: false, ...(type ? { type } : {}) },
    orderBy: { createdAt: 'asc' },
  });

  // Mark as read
  if (messages.length > 0) {
    await prisma.agentMessage.updateMany({
      where: { id: { in: messages.map((m) => m.id) } },
      data: { read: true },
    });
  }

  return messages.map((m) => JSON.parse(m.payload) as T);
}
