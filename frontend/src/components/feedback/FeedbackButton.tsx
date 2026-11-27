import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import axios from 'axios';
import { apiClient } from '@/lib/apiClient';
import { useAuth } from '@/context/AuthContext';
import { Modal } from '@/components/utility/Modal';
import { Button } from '@/components/ui';
import { useTranslation } from 'react-i18next';

const TYPES = [
  ['bug', 'feedback.bug'],
  ['idea', 'feedback.idea'],
  ['other', 'feedback.other'],
] as const;

/** Feedback from any page in two clicks (27 Nov, ready for testers): it reaches the team on Telegram. */
export function FeedbackButton() {
  const { pathname } = useLocation();
  const { user } = useAuth();
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<(typeof TYPES)[number][0]>('bug');
  const [message, setMessage] = useState('');
  const [email, setEmail] = useState('');
  const [state, setState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [error, setError] = useState('');

  async function send() {
    setState('sending');
    try {
      await apiClient.post('/feedback', { type, message: message.trim(), page: pathname, email: email.trim() });
      setState('sent');
      setMessage('');
    } catch (err) {
      setError((axios.isAxiosError(err) && (err.response?.data as { error?: string } | undefined)?.error) || t('feedback.failed'));
      setState('error');
    }
  }

  function close() {
    setOpen(false);
    if (state === 'sent') setState('idle');
  }

  return (
    <>
      <button type="button" className="feedback-fab" onClick={() => setOpen(true)}>
        {t('feedback.button')}
      </button>
      <Modal isOpen={open} title={t('feedback.title')} onClose={close}>
        {state === 'sent' ? (
          <div className="grid gap-16 py-8">
            <p className="text-[18px] text-ink">{t('feedback.thanks')}</p>
            <Button variant="primary" onClick={close}>{t('common.close')}</Button>
          </div>
        ) : (
          <form
            className="grid gap-16"
            onSubmit={(e) => {
              e.preventDefault();
              if (message.trim()) void send();
            }}
          >
            <div role="radiogroup" aria-label={t('feedback.kind')} className="flex flex-wrap gap-8">
              {TYPES.map(([value, label]) => (
                <button key={value} type="button" role="radio" aria-checked={type === value} onClick={() => setType(value)} className={`gem-filter ${type === value ? 'is-on' : ''}`}>
                  {t(label)}
                </button>
              ))}
            </div>
            <label className="grid gap-6 text-[16px] text-muted" style={{ fontWeight: 500 }}>
              {t('feedback.message')}
              <textarea id="feedback-message" rows={5} maxLength={2000} value={message} onChange={(e) => setMessage(e.target.value)} className="rounded-input border border-rule bg-paper p-12 text-[17px] text-ink" />
            </label>
            {!user && (
              <label className="grid gap-6 text-[16px] text-muted" style={{ fontWeight: 500 }}>
                {t('feedback.email')}
                <input id="feedback-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="h-[48px] rounded-input border border-rule bg-paper px-12 text-[17px] text-ink" />
              </label>
            )}
            {state === 'error' && <p className="text-error" role="alert">{error}</p>}
            <Button variant="primary" type="submit" disabled={!message.trim() || state === 'sending'}>
              {state === 'sending' ? t('feedback.sending') : t('feedback.send')}
            </Button>
          </form>
        )}
      </Modal>
    </>
  );
}
