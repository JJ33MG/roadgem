import { useNavigate } from 'react-router-dom';
import { Crown, Check, ArrowRight } from 'lucide-react';
import { Modal } from './Modal';
import { useTranslation } from 'react-i18next';
import { formatMoney } from '@/i18n/format';

interface PaywallModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  message: string;
}

const PERKS = ['pricing.plus1', 'pricing.everyGem', 'pricing.filters', 'pricing.cheapest', 'pricing.pdf'];

export function PaywallModal({ isOpen, onClose, title, message }: PaywallModalProps) {
  const navigate = useNavigate();
  const { t } = useTranslation();

  function handleUpgrade() {
    onClose();
    navigate('/pricing');
  }

  return (
    <Modal isOpen={isOpen} title={title ?? 'RoamGem Plus'} onClose={onClose}>
      <div className="flex items-center gap-10 rounded-container border border-mercury-blue/20 bg-mercury-blue/10 p-12">
        <Crown size={16} className="flex-shrink-0 text-mercury-blue" />
        <p className="text-body-sm text-silver">{message}</p>
      </div>

      <ul className="mt-16 flex flex-col gap-8">
        {PERKS.map((perk) => (
          <li key={perk} className="flex items-center gap-8 text-body-sm text-starlight">
            <Check size={13} className="flex-shrink-0 text-mercury-blue" />
            {t(perk)}
          </li>
        ))}
      </ul>

      <p className="mt-12 text-caption text-silver">{t('paywall.from', { price: formatMoney(9, undefined, { whole: true }) })}</p>

      <div className="mt-24 flex gap-12">
        <button
          onClick={handleUpgrade}
          className="btn-primary inline-flex items-center gap-8"
        >
          {t('paywall.seePlans')} <ArrowRight size={14} />
        </button>
        <button onClick={onClose} className="btn-header">
          {t('paywall.notNow')}
        </button>
      </div>
    </Modal>
  );
}
