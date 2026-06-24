import { Langfuse } from 'langfuse';

let _client: Langfuse | null = null;

export function getLangfuse(): Langfuse | null {
  if (!process.env.LANGFUSE_SECRET_KEY || !process.env.LANGFUSE_PUBLIC_KEY) return null;
  if (!_client) {
    _client = new Langfuse({
      secretKey: process.env.LANGFUSE_SECRET_KEY,
      publicKey: process.env.LANGFUSE_PUBLIC_KEY,
      baseUrl: process.env.LANGFUSE_HOST ?? 'https://cloud.langfuse.com',
    });
  }
  return _client;
}

export async function traceAgentRun(
  agentName: string,
  runFn: (trace: any) => Promise<void>
): Promise<void> {
  const lf = getLangfuse();
  if (!lf) {
    await runFn(null);
    return;
  }

  const trace = lf.trace({
    name: agentName,
    tags: ['agent', agentName],
    metadata: { environment: process.env.NODE_ENV ?? 'production' },
  });

  try {
    await runFn(trace);
    trace.update({ metadata: { status: 'completed' } });
  } catch (err) {
    trace.update({ metadata: { status: 'failed', error: String(err) } });
    throw err;
  } finally {
    await lf.flushAsync();
  }
}

export function createGeneration(trace: any, name: string, model: string, prompt: string) {
  if (!trace) return null;
  return trace.generation({
    name,
    model,
    input: prompt,
  });
}

export function endGeneration(generation: any, output: string, usage?: { input: number; output: number }) {
  if (!generation) return;
  generation.end({
    output,
    usage: usage ? { input: usage.input, output: usage.output } : undefined,
  });
}
