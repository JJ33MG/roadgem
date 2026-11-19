import { useState } from 'react';
import { X, Gem, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { apiClient } from '@/lib/apiClient';
import { useAuth } from '@/context/AuthContext';
import { Link } from 'react-router-dom';

const CATEGORIES = [
  { value: 'restaurant', label: 'Restaurant', emoji: '🍽' },
  { value: 'café', label: 'Café', emoji: '☕' },
  { value: 'bar', label: 'Bar', emoji: '🍷' },
  { value: 'viewpoint', label: 'Viewpoint', emoji: '🌅' },
  { value: 'nature', label: 'Nature', emoji: '🌿' },
  { value: 'culture', label: 'Culture', emoji: '🏛' },
  { value: 'historic', label: 'Historic', emoji: '🏰' },
  { value: 'market', label: 'Market', emoji: '🛒' },
  { value: 'activity', label: 'Activity', emoji: '🎯' },
  { value: 'other', label: 'Other', emoji: '✨' },
];

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

type Status = 'idle' | 'loading' | 'approved' | 'rejected';

export function SubmitGemModal({ isOpen, onClose }: Props) {
  const { user } = useAuth();
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<Status>('idle');
  const [feedback, setFeedback] = useState('');
  const [score, setScore] = useState(0);

  const isValid = name.trim() && category && location.trim() && description.trim().length >= 30;

  function reset() {
    setName(''); setCategory(''); setLocation(''); setDescription('');
    setStatus('idle'); setFeedback(''); setScore(0);
  }

  function handleClose() {
    reset();
    onClose();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isValid) return;
    setStatus('loading');
    try {
      const res = await apiClient.post('/community/gems', { name, category, location, description });
      setScore(res.data.score);
      setFeedback(res.data.feedback);
      setStatus(res.data.status === 'approved' ? 'approved' : 'rejected');
    } catch (err: any) {
      setFeedback(err?.response?.data?.error ?? 'Something went wrong. Try again.');
      setStatus('rejected');
    }
  }

  if (!isOpen) return null;

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
      onClick={handleClose}
    >
      {/* Backdrop */}
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(8,12,20,0.85)', backdropFilter: 'blur(8px)' }} />

      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 16 }}
        transition={{ duration: 0.2 }}
        onClick={e => e.stopPropagation()}
        style={{
          position: 'relative', width: '100%', maxWidth: 540, maxHeight: '90vh', overflowY: 'auto',
          background: 'var(--color-paper-2)', borderRadius: 20, border: '1px solid var(--color-rule)',
          boxShadow: '0 24px 80px rgba(0,0,0,0.6)',
        }}
      >
        {/* Header */}
        <div style={{ padding: '20px 24px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--color-accent-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Gem size={16} style={{ color: 'var(--color-accent)' }} />
            </div>
            <div>
              <h2 style={{ fontSize: 16, fontWeight: 480, color: 'var(--color-ink)', margin: 0 }}>Share your secret spot</h2>
              <p style={{ fontSize: 12, color: 'var(--color-muted)', margin: 0 }}>Tell us the story of how you found it</p>
            </div>
          </div>
          <button onClick={handleClose} style={{ color: 'var(--color-muted)', cursor: 'pointer', background: 'none', border: 'none', padding: 4 }}>
            <X size={20} />
          </button>
        </div>

        <div style={{ padding: 24 }}>
          {/* Not logged in */}
          {!user && (
            <div style={{ textAlign: 'center', padding: '32px 0' }}>
              <Gem size={32} style={{ color: 'var(--color-accent)', margin: '0 auto 12px' }} />
              <p style={{ color: 'var(--color-ink)', fontSize: 14, marginBottom: 8 }}>You need an account to share gems</p>
              <p style={{ color: 'var(--color-muted)', fontSize: 12, marginBottom: 20 }}>Join the community — it's free</p>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
                <Link to="/login" onClick={handleClose}
                  style={{ borderRadius: 9999, border: '1px solid var(--color-rule)', padding: '8px 20px', fontSize: 14, color: 'var(--color-ink)', textDecoration: 'none' }}>
                  Log in
                </Link>
                <Link to="/signup" onClick={handleClose}
                  style={{ borderRadius: 9999, background: 'var(--color-accent)', padding: '8px 20px', fontSize: 14, fontWeight: 480, color: 'var(--color-paper)', textDecoration: 'none' }}>
                  Sign up free
                </Link>
              </div>
            </div>
          )}

          {/* Result: approved */}
          {user && status === 'approved' && (
            <AnimatePresence>
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                style={{ textAlign: 'center', padding: '32px 0' }}>
                <CheckCircle size={40} style={{ color: 'var(--color-success)', margin: '0 auto 16px' }} />
                <h3 style={{ fontSize: 18, fontWeight: 480, color: 'var(--color-ink)', marginBottom: 8 }}>You're a gem hunter now 💛</h3>
                <p style={{ fontSize: 13, color: 'var(--color-muted)', marginBottom: 12 }}>{feedback}</p>
                <div style={{ display: 'inline-block', borderRadius: 9999, background: 'rgba(74,222,128,0.1)', border: '1px solid rgba(74,222,128,0.3)', padding: '4px 14px', fontSize: 12, color: 'var(--color-success)', marginBottom: 24 }}>
                  Quality score: {score}/100
                </div>
                <br />
                <button onClick={handleClose}
                  style={{ borderRadius: 9999, background: 'var(--color-accent)', padding: '10px 28px', fontSize: 14, fontWeight: 480, color: 'var(--color-paper)', cursor: 'pointer', border: 'none' }}>
                  Done
                </button>
              </motion.div>
            </AnimatePresence>
          )}

          {/* Result: rejected */}
          {user && status === 'rejected' && (
            <AnimatePresence>
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                style={{ textAlign: 'center', padding: '24px 0' }}>
                <XCircle size={36} style={{ color: 'var(--color-error)', margin: '0 auto 16px' }} />
                <h3 style={{ fontSize: 16, fontWeight: 480, color: 'var(--color-ink)', marginBottom: 8 }}>Not quite there yet</h3>
                <p style={{ fontSize: 13, color: 'var(--color-muted)', marginBottom: 24, maxWidth: 360, margin: '0 auto 24px' }}>{feedback}</p>
                <button onClick={() => setStatus('idle')}
                  style={{ borderRadius: 9999, border: '1px solid var(--color-rule)', padding: '10px 24px', fontSize: 14, color: 'var(--color-ink)', cursor: 'pointer', background: 'none' }}>
                  Edit and resubmit
                </button>
              </motion.div>
            </AnimatePresence>
          )}

          {/* Form */}
          {user && (status === 'idle' || status === 'loading') && (
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Name */}
              <div>
                <label style={{ display: 'block', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--color-muted)', marginBottom: 6 }}>
                  Name of the spot
                </label>
                <input
                  value={name} onChange={e => setName(e.target.value)}
                  placeholder="e.g. De Gouden Carolus brewery tap room"
                  style={{ width: '100%', background: 'var(--color-paper-2)', border: '1px solid var(--color-rule)', borderRadius: 10, padding: '10px 14px', fontSize: 14, color: 'var(--color-ink)', outline: 'none', boxSizing: 'border-box' }}
                />
              </div>

              {/* Category */}
              <div>
                <label style={{ display: 'block', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--color-muted)', marginBottom: 6 }}>
                  Category
                </label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {CATEGORIES.map(c => (
                    <button key={c.value} type="button" onClick={() => setCategory(c.value)}
                      style={{
                        borderRadius: 9999, padding: '6px 12px', fontSize: 12, cursor: 'pointer',
                        background: category === c.value ? 'var(--color-accent-soft)' : 'var(--color-paper-2)',
                        border: category === c.value ? '1px solid var(--color-accent)' : '1px solid var(--color-rule)',
                        color: category === c.value ? 'var(--color-accent)' : 'var(--color-muted)',
                      }}>
                      {c.emoji} {c.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Location */}
              <div>
                <label style={{ display: 'block', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--color-muted)', marginBottom: 6 }}>
                  City / Location
                </label>
                <input
                  value={location} onChange={e => setLocation(e.target.value)}
                  placeholder="e.g. Mechelen, Belgium"
                  style={{ width: '100%', background: 'var(--color-paper-2)', border: '1px solid var(--color-rule)', borderRadius: 10, padding: '10px 14px', fontSize: 14, color: 'var(--color-ink)', outline: 'none', boxSizing: 'border-box' }}
                />
              </div>

              {/* Description */}
              <div>
                <label style={{ display: 'block', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--color-muted)', marginBottom: 6 }}>
                  Your story
                </label>
                <textarea
                  value={description} onChange={e => setDescription(e.target.value)}
                  placeholder="How did you find it? Why does it feel special? What makes it local and not touristy?"
                  rows={4}
                  style={{ width: '100%', background: 'var(--color-paper-2)', border: '1px solid var(--color-rule)', borderRadius: 10, padding: '10px 14px', fontSize: 14, color: 'var(--color-ink)', outline: 'none', resize: 'vertical', boxSizing: 'border-box', lineHeight: 1.5 }}
                />
                <p style={{ fontSize: 11, color: description.length >= 30 ? 'rgba(74,222,128,0.6)' : 'var(--color-muted)', marginTop: 4 }}>
                  {description.length}/30 min characters
                </p>
              </div>

              <button type="submit" disabled={!isValid || status === 'loading'}
                style={{
                  borderRadius: 9999, background: isValid ? 'var(--color-accent)' : 'var(--color-accent-soft)',
                  padding: '14px 24px', fontSize: 14, fontWeight: 480,
                  color: isValid ? 'var(--color-paper)' : 'var(--color-muted)',
                  cursor: isValid ? 'pointer' : 'not-allowed', border: 'none',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                }}>
                {status === 'loading' ? (
                  <><Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> Verifying with AI...</>
                ) : (
                  <><Gem size={16} /> Add gem</>
                )}
              </button>

              <p style={{ fontSize: 11, color: 'var(--color-muted)', textAlign: 'center' }}>
                Our AI reviews every submission for authenticity before it goes live
              </p>
            </form>
          )}
        </div>
      </motion.div>
    </div>
  );
}
