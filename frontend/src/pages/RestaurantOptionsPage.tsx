import { useParams } from 'react-router-dom';
import { useState } from 'react';
import { useRestaurantOptions } from '@/hooks/useBookingOptions';
import { RestaurantOptionCard } from '@/components/display/RestaurantOptionCard';
import { Modal } from '@/components/utility/Modal';
import { LoadingSpinner } from '@/components/utility/LoadingSpinner';
import { bookingsApi } from '@/lib/api';
import type { RestaurantOption } from '@/types';

export function RestaurantOptionsPage() {
  const { tripId } = useParams<{ tripId: string }>();
  const { restaurants, isLoading } = useRestaurantOptions(tripId);
  const [selectedRestaurant, setSelectedRestaurant] = useState<RestaurantOption | null>(null);

  async function handleConfirmBooking() {
    if (!tripId || !selectedRestaurant) return;
    await bookingsApi.book(tripId, { type: 'restaurant', optionId: selectedRestaurant.id });
    setSelectedRestaurant(null);
  }

  return (
    <div className="section py-40">
      <h1 className="text-heading font-display font-w360 text-starlight">Restaurant options</h1>

      {isLoading ? (
        <div className="flex justify-center py-40">
          <LoadingSpinner size={28} />
        </div>
      ) : (
        <div className="mt-32 grid gap-16 sm:grid-cols-2 lg:grid-cols-3">
          {restaurants.map((restaurant) => (
            <RestaurantOptionCard
              key={restaurant.id}
              restaurant={restaurant}
              onSelect={setSelectedRestaurant}
            />
          ))}
        </div>
      )}

      <Modal
        isOpen={!!selectedRestaurant}
        title="Confirm booking"
        onClose={() => setSelectedRestaurant(null)}
      >
        {selectedRestaurant && (
          <div>
            <p className="text-body-sm text-silver">
              Confirm booking at <span className="text-starlight">{selectedRestaurant.name}</span>.
            </p>
            <div className="mt-24 flex gap-12">
              <button onClick={handleConfirmBooking} className="btn-primary">
                Confirm
              </button>
              <button onClick={() => setSelectedRestaurant(null)} className="btn-header">
                Cancel
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
