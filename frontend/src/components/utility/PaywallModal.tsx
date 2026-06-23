import { useNavigate } from 'react-router-dom';
import { Crown, Check, ArrowRight } from 'lucide-react';
import { Modal } from './Modal';

interface PaywallModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  message: string;
}

const PREMIUM_PERKS = [
  'Unlimited saved road trips',
  'Curated hidden gems & local favourites',
  'Multi-stop planning (5+ stops)',
  'PDF export',
  'Priority generation speed',
];

export function PaywallModal({ isOpen, onClose, title = 'Upgrade to Premium', message }: PaywallModalProps) {
  const navigate = useNavigate();

  function handleUpgrade() {
    onClose();
    navigate('/pricing');
  }

  return (
    <Modal isOpen={isOpen} title={title} onClose={onClose}>
      <div className="flex items-center gap-10 rounded-container border border-mercury-blue/20 bg-mercury-blue/10 p-12">
        <Crown size={16} className="flex-shrink-0 text-mercury-blue" />
        <p className="text-body-sm text-silver">{message}</p>
      </div>

      <ul className="mt-16 flex flex-col gap-8">
        {PREMIUM_PERKS.map((perk) => (
          <li key={perk} className="flex items-center gap-8 text-body-sm text-starlight">
            <Check size={13} className="flex-shrink-0 text-mercury-blue" />
            {perk}
          </li>
        ))}
      </ul>

      <p className="mt-12 text-caption text-silver">From €9 / month · Cancel anytime</p>

      <div className="mt-24 flex gap-12">
        <button
          onClick={handleUpgrade}
          className="btn-primary inline-flex items-center gap-8"
        >
          See plans <ArrowRight size={14} />
        </button>
        <button onClick={onClose} className="btn-header">
          Not now
        </button>
      </div>
    </Modal>
  );
}
