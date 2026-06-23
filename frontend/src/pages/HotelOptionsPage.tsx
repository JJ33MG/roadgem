import { useParams } from 'react-router-dom';
import { useState } from 'react';
import { useHotelOptions } from '@/hooks/useBookingOptions';
import { HotelOptionCard } from '@/components/display/HotelOptionCard';
import { Modal } from '@/components/utility/Modal';
import { LoadingSpinner } from '@/components/utility/LoadingSpinner';
import { bookingsApi } from '@/lib/api';
import type { HotelOption } from '@/types';

export function HotelOptionsPage() {
  const { tripId } = useParams<{ tripId: string }>();
  const { hotels, isLoading } = useHotelOptions(tripId);
  const [selectedHotel, setSelectedHotel] = useState<HotelOption | null>(null);

  async function handleConfirmBooking() {
    if (!tripId || !selectedHotel) return;
    await bookingsApi.book(tripId, { type: 'hotel', optionId: selectedHotel.id });
    setSelectedHotel(null);
  }

  return (
    <div className="section py-40">
      <h1 className="text-heading font-display font-w360 text-starlight">Hotel options</h1>

      {isLoading ? (
        <div className="flex justify-center py-40">
          <LoadingSpinner size={28} />
        </div>
      ) : (
        <div className="mt-32 grid gap-16 sm:grid-cols-2 lg:grid-cols-3">
          {hotels.map((hotel) => (
            <HotelOptionCard key={hotel.id} hotel={hotel} onSelect={setSelectedHotel} />
          ))}
        </div>
      )}

      <Modal isOpen={!!selectedHotel} title="Confirm booking" onClose={() => setSelectedHotel(null)}>
        {selectedHotel && (
          <div>
            <p className="text-body-sm text-silver">
              Confirm booking <span className="text-starlight">{selectedHotel.name}</span> at{' '}
              &euro;{selectedHotel.pricePerNight.toLocaleString()} / night.
            </p>
            <div className="mt-24 flex gap-12">
              <button onClick={handleConfirmBooking} className="btn-primary">
                Confirm
              </button>
              <button onClick={() => setSelectedHotel(null)} className="btn-header">
                Cancel
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
