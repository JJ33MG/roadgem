import { Car, MapPin, ExternalLink, Calendar } from 'lucide-react';
import type { RentalCarOption } from '@/types';

interface RentalCarCardProps {
  rental: RentalCarOption;
}

export function RentalCarCard({ rental }: RentalCarCardProps) {
  return (
    <div className="rounded-container border border-starlight/10 bg-starlight/[0.03] p-16">
      <div className="flex items-center gap-8 mb-12">
        <div className="flex h-32 w-32 items-center justify-center rounded-full bg-mercury-blue/10">
          <Car size={16} className="text-mercury-blue" />
        </div>
        <p className="text-body-sm font-w480 text-starlight">Rental car</p>
      </div>

      <div className="flex flex-col gap-8 text-caption text-silver">
        <div className="flex items-start gap-6">
          <MapPin size={12} className="mt-[2px] flex-shrink-0 text-mercury-blue/60" />
          <span>
            <span className="text-starlight">Pick-up:</span> {rental.pickupLocation}
          </span>
        </div>
        <div className="flex items-start gap-6">
          <MapPin size={12} className="mt-[2px] flex-shrink-0 text-mercury-blue/60" />
          <span>
            <span className="text-starlight">Drop-off:</span> {rental.dropoffLocation}
          </span>
        </div>
        <div className="flex items-center gap-6">
          <Calendar size={12} className="flex-shrink-0 text-mercury-blue/60" />
          <span>{rental.pickupDate} → {rental.dropoffDate}</span>
        </div>
      </div>

      <div className="mt-12 flex gap-8">
        <a
          href={rental.rentalcarsUrl}
          target="_blank"
          rel="noopener noreferrer sponsored"
          className="btn-header flex flex-1 items-center justify-center gap-6 text-caption"
        >
          Rentalcars.com <ExternalLink size={11} />
        </a>
        <a
          href={rental.autoeuropeUrl}
          target="_blank"
          rel="noopener noreferrer sponsored"
          className="btn-header flex flex-1 items-center justify-center gap-6 text-caption"
        >
          AutoEurope <ExternalLink size={11} />
        </a>
      </div>
    </div>
  );
}
