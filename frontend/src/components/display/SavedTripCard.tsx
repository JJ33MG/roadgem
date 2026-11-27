import { Link } from 'react-router-dom';
import { formatDate, formatMoney, formatNumber } from '@/i18n/format';
import clsx from 'clsx';
import { DestinationImage } from '@/components/display/DestinationImage';
import type { Trip } from '@/types';
import { useTranslation } from 'react-i18next';

interface SavedTripCardProps {
  trip: Trip;
}


export function SavedTripCard({ trip }: SavedTripCardProps) {
  const { t } = useTranslation();
  return (
    <Link to={`/trips/${trip.id}`} className="card-interactive block overflow-hidden p-0">
      <DestinationImage query={trip.destination} alt={trip.destination} className="h-[120px] w-full" />
      <div className="p-24">
        <div className="flex items-center justify-between">
          <h3 className="text-heading-sm font-display font-w480 text-starlight">{trip.destination}</h3>
          <span className={clsx('badge', trip.status === 'saved' ? 'badge-premium' : 'badge-free')}>
            {t(`dash.status.${trip.status}`)}
          </span>
        </div>

        <p className="mt-8 text-body-sm text-silver">
          {t('dash.dates', { start: formatDate(String(trip.startDate), undefined, { day: 'numeric', month: 'short' }), end: formatDate(String(trip.endDate)) })}
        </p>

        <p className="mt-12 text-body-sm font-w480 text-starlight">
          {formatMoney(Math.round(trip.totalCost), undefined, { whole: true })} &middot; {formatNumber(Math.round(trip.totalDistance))} km
        </p>
      </div>
    </Link>
  );
}
