import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { agentsApi } from '@/lib/api';
import type { AgentRun, AgentLog, AgentStats, AgentMessage } from '@/types';

const AGENT_META: Record<string, { label: string; description: string; icon: string; color: string }> = {
  'gems-agent': {
    label: 'Hidden Gems Agent',
    description: 'Researches authentic local hidden gems across European destinations',
    icon: '💎',
    color: 'mercury-blue',
  },
  'seo-agent': {
    label: 'SEO Content Agent',
    description: 'Generates SEO-optimized content and metadata for destination pages',
    icon: '📈',
    color: 'plum',
  },
  'analytics-agent': {
    label: 'Analytics Agent',
    description: 'Analyses trip patterns and tells other agents what to prioritise',
    icon: '📊',
    color: 'mercury-blue',
  },
  'trend-agent': {
    label: 'Trend Agent',
    description: 'Monitors Reddit and travel sites for trending destinations',
    icon: '🔥',
    color: 'plum',
  },
  'briefing-agent': {
    label: 'Briefing Agent',
    description: 'Sends you a daily email summary of everything agents did overnight',
    icon: '☀️',
    color: 'mercury-blue',
  },
};

const STATUS_STYLE: Record<string, string> = {
  running: 'bg-blue-500/20 text-blue-300 border border-blue-500/30',
  completed: 'bg-green-500/20 text-green-300 border border-green-500/30',
  failed: 'bg-red-500/20 text-red-300 border border-red-500/30',
};

const LOG_COLOR: Record<string, string> = {
  info: 'text-silver',
  success: 'text-green-400',
  warning: 'text-yellow-400',
  error: 'text-red-400',
};

const LOG_ICON: Record<string, string> = {
  info: '○',
  success: '✓',
  warning: '⚠',
  error: '✗',
};

function formatRelative(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function duration(start: string, end?: string | null) {
  const ms = new Date(end ?? Date.now()).getTime() - new Date(start).getTime();
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}s`;
  return `${Math.floor(s / 60)}m ${s % 60}s`;
}

const TYPE_LABEL: Record<string, string> = {
  PRIORITIZE_DESTINATIONS: '📍 Prioritize destinations',
  PRIORITIZE_TOPICS: '✏️ Prioritize topics',
  TRENDING_DESTINATIONS: '🔥 Trending destinations',
};

export default function AgentsDashboardPage() {
  const [runs, setRuns] = useState<AgentRun[]>([]);
  const [stats, setStats] = useState<AgentStats | null>(null);
  const [selectedRun, setSelectedRun] = useState<AgentRun | null>(null);
  const [logs, setLogs] = useState<AgentLog[]>([]);
  const [messages, setMessages] = useState<AgentMessage[]>([]);
  const [activeTab, setActiveTab] = useState<'runs' | 'messages'>('runs');
  const [triggering, setTriggering] = useState<string | null>(null);
  const [triggerMsg, setTriggerMsg] = useState<string | null>(null);
  const logsEndRef = useRef<HTMLDivElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchData = async () => {
    const [runsRes, statsRes, messagesRes] = await Promise.all([
      agentsApi.getRuns(),
      agentsApi.getStats(),
      agentsApi.getMessages(),
    ]);
    setRuns(runsRes.data);
    setStats(statsRes.data);
    setMessages(messagesRes.data);
  };

  const fetchLogs = async (runId: string) => {
    const res = await agentsApi.getRunLogs(runId);
    setLogs(res.data);
  };

  useEffect(() => {
    fetchData();
    pollRef.current = setInterval(fetchData, 5000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, []);

  useEffect(() => {
    if (selectedRun) {
      fetchLogs(selectedRun.id);
      const interval = setInterval(() => fetchLogs(selectedRun.id), 3000);
      return () => clearInterval(interval);
    }
  }, [selectedRun?.id]);

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  const handleTrigger = async (agentName: string) => {
    setTriggering(agentName);
    try {
      await agentsApi.trigger(agentName);
      setTriggerMsg(`${AGENT_META[agentName]?.label ?? agentName} started`);
      setTimeout(() => setTriggerMsg(null), 4000);
      setTimeout(() => fetchData(), 1500);
    } catch {
      setTriggerMsg('Failed to trigger agent');
      setTimeout(() => setTriggerMsg(null), 3000);
    } finally {
      setTriggering(null);
    }
  };

  const activeAgents = stats?.agentSummary ?? [];

  return (
    <div className="min-h-screen bg-midnight-slate pt-24 pb-16">
      <div className="section">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-10"
        >
          <div className="flex items-center gap-3 mb-2">
            <span className="text-2xl">🤖</span>
            <h1 className="text-3xl font-display font-bold text-starlight">Agent Ecosystem</h1>
          </div>
          <p className="text-silver">Live view of all autonomous AI agents running in the background</p>
        </motion.div>

        {/* Stats row */}
        {stats && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10"
          >
            {[
              { label: 'Total Runs', value: stats.totalRuns, color: 'text-starlight' },
              { label: 'Running', value: stats.runningRuns, color: 'text-blue-400' },
              { label: 'Completed', value: stats.completedRuns, color: 'text-green-400' },
              { label: 'Failed', value: stats.failedRuns, color: 'text-red-400' },
            ].map((s) => (
              <div key={s.label} className="glass-panel p-5 rounded-xl">
                <div className={`text-3xl font-display font-bold ${s.color}`}>{s.value}</div>
                <div className="text-silver text-sm mt-1">{s.label}</div>
              </div>
            ))}
          </motion.div>
        )}

        {/* Agent cards */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="grid md:grid-cols-2 gap-4 mb-10"
        >
          {Object.entries(AGENT_META).map(([name, meta]) => {
            const summary = activeAgents.find((a) => a.agentName === name);
            const latestRun = runs.find((r) => r.agentName === name);
            const isRunning = latestRun?.status === 'running';

            return (
              <div key={name} className="glass-panel rounded-xl p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{meta.icon}</span>
                    <div>
                      <h3 className="font-display font-semibold text-starlight">{meta.label}</h3>
                      <p className="text-silver text-sm mt-0.5">{meta.description}</p>
                    </div>
                  </div>
                  {isRunning && (
                    <span className="flex items-center gap-1.5 text-xs px-2 py-1 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse inline-block" />
                      running
                    </span>
                  )}
                </div>

                <div className="flex items-center justify-between">
                  <div className="text-sm text-silver">
                    {summary ? (
                      <>
                        <span className="text-starlight font-medium">{summary._count.id}</span> runs ·{' '}
                        last run {formatRelative(summary._max.startedAt)}
                      </>
                    ) : (
                      'No runs yet'
                    )}
                  </div>
                  <button
                    onClick={() => handleTrigger(name)}
                    disabled={triggering === name || isRunning}
                    className="btn-primary text-sm px-4 py-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {triggering === name ? 'Starting...' : '▶ Run now'}
                  </button>
                </div>
              </div>
            );
          })}
        </motion.div>

        {/* Trigger toast */}
        <AnimatePresence>
          {triggerMsg && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-graphite text-starlight px-5 py-3 rounded-xl text-sm shadow-lg z-50"
            >
              {triggerMsg}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Tab switcher */}
        <div className="flex gap-2 mb-6">
          {(['runs', 'messages'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === tab
                  ? 'bg-mercury-blue text-white'
                  : 'bg-graphite/50 text-silver hover:text-starlight'
              }`}
            >
              {tab === 'runs' ? '📋 Runs & Logs' : `💬 Agent Messages ${messages.length > 0 ? `(${messages.length})` : ''}`}
            </button>
          ))}
        </div>

        {/* Messages view */}
        {activeTab === 'messages' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            {messages.length === 0 ? (
              <div className="glass-panel rounded-xl p-12 text-center text-silver">
                No messages yet — run the Analytics or Trend agent first.
              </div>
            ) : (
              <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
                {messages.map((msg) => {
                  const from = AGENT_META[msg.fromAgent];
                  const to = AGENT_META[msg.toAgent];
                  let payload: any = {};
                  try { payload = JSON.parse(msg.payload); } catch {}
                  return (
                    <motion.div
                      key={msg.id}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="glass-panel rounded-xl p-4"
                    >
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <span className="text-sm font-medium text-starlight">
                          {from?.icon ?? '🤖'} {from?.label ?? msg.fromAgent}
                        </span>
                        <span className="text-graphite text-xs">→</span>
                        <span className="text-sm font-medium text-mercury-blue">
                          {to?.icon ?? '🤖'} {to?.label ?? msg.toAgent}
                        </span>
                        <span className="ml-auto text-xs text-graphite">{formatRelative(msg.createdAt)}</span>
                      </div>
                      <div className="text-xs font-mono text-mercury-blue/70 mb-2">
                        {TYPE_LABEL[msg.type] ?? msg.type}
                      </div>
                      {payload.destinations && (
                        <div className="flex flex-wrap gap-1">
                          {payload.destinations.map((d: string) => (
                            <span key={d} className="text-xs bg-mercury-blue/10 text-mercury-blue px-2 py-0.5 rounded-full">
                              {d}
                            </span>
                          ))}
                        </div>
                      )}
                      {payload.reason && (
                        <p className="text-xs text-silver mt-2">"{payload.reason}"</p>
                      )}
                      <div className="mt-2 flex items-center gap-1">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${msg.read ? 'bg-graphite/50 text-silver' : 'bg-green-500/20 text-green-400'}`}>
                          {msg.read ? 'read' : 'unread'}
                        </span>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </motion.div>
        )}

        {/* Run history + logs */}
        {activeTab === 'runs' && <div className="grid lg:grid-cols-2 gap-6">
          {/* Run list */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <h2 className="text-lg font-display font-semibold text-starlight mb-4">Recent Runs</h2>
            <div className="space-y-2 max-h-[560px] overflow-y-auto pr-1 custom-scrollbar">
              {runs.length === 0 && (
                <div className="text-silver text-center py-12 glass-panel rounded-xl">
                  No agent runs yet. Trigger an agent above to get started.
                </div>
              )}
              {runs.map((run) => {
                const meta = AGENT_META[run.agentName];
                const isSelected = selectedRun?.id === run.id;
                return (
                  <button
                    key={run.id}
                    onClick={() => { setSelectedRun(run); fetchLogs(run.id); }}
                    className={`w-full text-left glass-panel rounded-xl p-4 transition-all border ${
                      isSelected
                        ? 'border-mercury-blue/50 bg-mercury-blue/5'
                        : 'border-transparent hover:border-graphite'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="flex items-center gap-2 font-medium text-starlight text-sm">
                        <span>{meta?.icon ?? '🤖'}</span>
                        {meta?.label ?? run.agentName}
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-mono ${STATUS_STYLE[run.status]}`}>
                        {run.status}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-silver">
                      <span>{formatRelative(run.startedAt)}</span>
                      <span>⏱ {duration(run.startedAt, run.finishedAt)}</span>
                      {run.logs?.[0] && (
                        <span className="truncate max-w-[200px]">{run.logs[0].message}</span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </motion.div>

          {/* Log panel */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
          >
            <h2 className="text-lg font-display font-semibold text-starlight mb-4">
              {selectedRun
                ? `Logs — ${AGENT_META[selectedRun.agentName]?.label ?? selectedRun.agentName}`
                : 'Logs'}
            </h2>
            <div className="glass-panel rounded-xl p-4 h-[560px] overflow-y-auto font-mono text-xs space-y-1 custom-scrollbar">
              {!selectedRun && (
                <div className="text-silver text-center py-20">Select a run to view logs</div>
              )}
              {selectedRun && logs.length === 0 && (
                <div className="text-silver text-center py-20">No logs yet...</div>
              )}
              <AnimatePresence initial={false}>
                {logs.map((log) => (
                  <motion.div
                    key={log.id}
                    initial={{ opacity: 0, x: -4 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex gap-2.5 leading-5"
                  >
                    <span className="text-graphite shrink-0">
                      {new Date(log.createdAt).toLocaleTimeString()}
                    </span>
                    <span className={`shrink-0 ${LOG_COLOR[log.level]}`}>
                      {LOG_ICON[log.level]}
                    </span>
                    <span className={LOG_COLOR[log.level]}>{log.message}</span>
                  </motion.div>
                ))}
              </AnimatePresence>
              <div ref={logsEndRef} />
            </div>
          </motion.div>
        </div>}
      </div>
    </div>
  );
}
