import { useEffect, useState } from 'react';
import { Gem, Trophy, MapPin, Star } from 'lucide-react';
import { motion } from 'framer-motion';
import { apiClient } from '@/lib/apiClient';
import { useAuth } from '@/context/AuthContext';
import { SubmitGemModal } from '@/components/community/SubmitGemModal';

interface CommunityGemItem {
  id: string;
  name: string;
  category: string;
  location: string;
  description: string;
  aiScore: number;
  createdAt: string;
  user: { name: string };
}

interface LeaderEntry {
  userId: string;
  name: string;
  gemCount: number;
}

interface MyGem {
  id: string;
  name: string;
  location: string;
  status: 'approved' | 'rejected' | 'pending';
  aiFeedback: string;
  aiScore: number;
  createdAt: string;
}

const BADGE_COLORS: Record<string, string> = {
  restaurant: '#f5a623', café: '#f5a623', bar: '#f5a623',
  viewpoint: '#4ade80', nature: '#4ade80',
  culture: '#a78bfa', historic: '#a78bfa',
  market: '#60a5fa', activity: '#60a5fa', other: '#60a5fa',
};

export function CommunityPage() {
  const { user } = useAuth();
  const [gems, setGems] = useState<CommunityGemItem[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderEntry[]>([]);
  const [myGems, setMyGems] = useState<MyGem[]>([]);
  const [tab, setTab] = useState<'gems' | 'leaderboard' | 'mine'>('gems');
  const [modalOpen, setModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      apiClient.get('/community/gems').then((r: any) => setGems(r.data.gems)),
      apiClient.get('/community/leaderboard').then((r: any) => setLeaderboard(r.data.leaderboard)),
    ]).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (user) {
      apiClient.get('/community/my-gems').then((r: any) => setMyGems(r.data.gems));
    }
  }, [user]);

  function handleGemSubmitted() {
    setModalOpen(false);
    // Refresh lists
    apiClient.get('/community/gems').then((r: any) => setGems(r.data.gems));
    if (user) apiClient.get('/community/my-gems').then((r: any) => setMyGems(r.data.gems));
  }

  return (
    <div style={{ minHeight: '100vh', background: '#080c14', color: 'white', paddingTop: 80 }}>
      {/* Hero */}
      <div style={{ padding: '48px 24px 32px', maxWidth: 800, margin: '0 auto', textAlign: 'center' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 56, height: 56, borderRadius: '50%', background: 'rgba(245,166,35,0.12)', marginBottom: 16 }}>
          <Gem size={24} style={{ color: '#f5a623' }} />
        </div>
        <h1 style={{ fontSize: 'clamp(1.6rem, 4vw, 2.4rem)', fontWeight: 360, marginBottom: 12 }}>
          Hidden gems, discovered by real travelers
        </h1>
        <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)', maxWidth: 480, margin: '0 auto 24px' }}>
          Every spot here was found by someone on the road. Share yours and help the next traveler find something unforgettable.
        </p>
        <button onClick={() => setModalOpen(true)}
          style={{ borderRadius: 9999, background: '#f5a623', padding: '12px 28px', fontSize: 14, fontWeight: 480, color: '#080c14', cursor: 'pointer', border: 'none', display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          <Gem size={16} /> Share your secret spot
        </button>
      </div>

      {/* Tabs */}
      <div style={{ maxWidth: 900, margin: '0 auto', padding: '0 24px' }}>
        <div style={{ display: 'flex', gap: 4, marginBottom: 24, borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: 0 }}>
          {[
            { key: 'gems', label: `Community gems (${gems.length})` },
            { key: 'leaderboard', label: '🏆 Top contributors' },
            ...(user ? [{ key: 'mine', label: `My submissions (${myGems.length})` }] : []),
          ].map(t => (
            <button key={t.key} onClick={() => setTab(t.key as any)}
              style={{
                padding: '10px 16px', fontSize: 13, fontWeight: 480, cursor: 'pointer', border: 'none', background: 'none',
                color: tab === t.key ? 'white' : 'rgba(255,255,255,0.4)',
                borderBottom: tab === t.key ? '2px solid #f5a623' : '2px solid transparent',
                marginBottom: -1,
              }}>
              {t.label}
            </button>
          ))}
        </div>

        {loading && (
          <div style={{ textAlign: 'center', padding: 48, color: 'rgba(255,255,255,0.4)' }}>Loading...</div>
        )}

        {/* Gems grid */}
        {!loading && tab === 'gems' && (
          gems.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 48 }}>
              <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 14, marginBottom: 16 }}>No gems yet — be the first to share one</p>
              <button onClick={() => setModalOpen(true)}
                style={{ borderRadius: 9999, background: '#f5a623', padding: '10px 24px', fontSize: 13, fontWeight: 480, color: '#080c14', cursor: 'pointer', border: 'none' }}>
                Share a gem
              </button>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16 }}>
              {gems.map((gem, i) => (
                <motion.div key={gem.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04, duration: 0.3 }}
                  style={{ borderRadius: 16, border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.03)', padding: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: 8 }}>
                    <p style={{ fontSize: 14, fontWeight: 480, color: 'white', lineHeight: 1.3 }}>{gem.name}</p>
                    <span style={{ flexShrink: 0, borderRadius: 9999, padding: '2px 8px', fontSize: 10, fontWeight: 480, textTransform: 'capitalize', color: '#080c14', background: BADGE_COLORS[gem.category] ?? '#60a5fa' }}>
                      {gem.category}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'rgba(255,255,255,0.4)', marginBottom: 8 }}>
                    <MapPin size={10} /> {gem.location}
                  </div>
                  <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.55)', lineHeight: 1.5, marginBottom: 10 }}>{gem.description}</p>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>by {gem.user?.name ?? 'Anonymous'}</span>
                    <span style={{ fontSize: 11, color: 'rgba(245,166,35,0.6)', display: 'flex', alignItems: 'center', gap: 3 }}>
                      <Star size={10} /> {gem.aiScore}/100
                    </span>
                  </div>
                </motion.div>
              ))}
            </div>
          )
        )}

        {/* Leaderboard */}
        {!loading && tab === 'leaderboard' && (
          <div style={{ maxWidth: 540 }}>
            {leaderboard.length === 0 ? (
              <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 14, padding: '32px 0' }}>No contributors yet — be the first!</p>
            ) : leaderboard.map((entry, i) => (
              <motion.div key={entry.userId} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '14px 0', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                <div style={{ width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 480, background: i === 0 ? '#f5a623' : i === 1 ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.07)', color: i === 0 ? '#080c14' : 'white' }}>
                  {i < 3 ? ['🥇','🥈','🥉'][i] : i + 1}
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 14, fontWeight: 480, color: 'white', marginBottom: 2 }}>{entry.name}</p>
                  <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>{entry.gemCount} gem{entry.gemCount !== 1 ? 's' : ''} approved</p>
                </div>
                <Trophy size={16} style={{ color: i === 0 ? '#f5a623' : 'rgba(255,255,255,0.2)' }} />
              </motion.div>
            ))}
          </div>
        )}

        {/* My submissions */}
        {!loading && tab === 'mine' && user && (
          myGems.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 48 }}>
              <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 14, marginBottom: 16 }}>You haven't shared any gems yet</p>
              <button onClick={() => setModalOpen(true)}
                style={{ borderRadius: 9999, background: '#f5a623', padding: '10px 24px', fontSize: 13, fontWeight: 480, color: '#080c14', cursor: 'pointer', border: 'none' }}>
                Share your first gem
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {myGems.map(gem => (
                <div key={gem.id} style={{ borderRadius: 14, border: `1px solid ${gem.status === 'approved' ? 'rgba(74,222,128,0.25)' : gem.status === 'rejected' ? 'rgba(248,113,113,0.25)' : 'rgba(255,255,255,0.1)'}`, background: 'rgba(255,255,255,0.03)', padding: '14px 16px' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                    <div>
                      <p style={{ fontSize: 14, fontWeight: 480, color: 'white', marginBottom: 2 }}>{gem.name}</p>
                      <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>{gem.location}</p>
                    </div>
                    <span style={{ flexShrink: 0, borderRadius: 9999, padding: '3px 10px', fontSize: 11, fontWeight: 480, background: gem.status === 'approved' ? 'rgba(74,222,128,0.12)' : gem.status === 'rejected' ? 'rgba(248,113,113,0.12)' : 'rgba(255,255,255,0.08)', color: gem.status === 'approved' ? '#4ade80' : gem.status === 'rejected' ? '#f87171' : 'rgba(255,255,255,0.5)' }}>
                      {gem.status === 'approved' ? '✓ Approved' : gem.status === 'rejected' ? 'Needs revision' : 'Pending'}
                    </span>
                  </div>
                  {gem.aiFeedback && (
                    <p style={{ marginTop: 8, fontSize: 12, color: 'rgba(255,255,255,0.45)', fontStyle: 'italic' }}>"{gem.aiFeedback}"</p>
                  )}
                </div>
              ))}
            </div>
          )
        )}
      </div>

      <SubmitGemModal isOpen={modalOpen} onClose={handleGemSubmitted} />
      <div style={{ height: 80 }} />
    </div>
  );
}
