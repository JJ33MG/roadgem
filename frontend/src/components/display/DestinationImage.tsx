import { useState, useEffect } from 'react';
import clsx from 'clsx';
import { motion } from 'framer-motion';
import { usePlacePhotos } from '@/hooks/usePlacePhotos';

interface DestinationImageProps {
  query: string;
  alt?: string;
  className?: string;
}

export function DestinationImage({ query, alt, className }: DestinationImageProps) {
  const { photos } = usePlacePhotos(query, 1);
  const [src, setSrc] = useState<string | null>(null);
  const [errored, setErrored] = useState(false);

  // Update src whenever photos list changes — picks up retries after URL bug fix
  useEffect(() => {
    if (photos[0]) {
      setSrc(photos[0]);
      setErrored(false);
    }
  }, [photos]);

  const fullSrc = src ? `${import.meta.env.VITE_BACKEND_URL}${src}` : null;

  return (
    <div className={clsx('relative overflow-hidden', className)}>
      {/* Gradient fallback — always present, photo fades over it */}
      <div
        aria-hidden
        className="absolute inset-0 bg-gradient-to-br from-[#2a1245] via-[#1a0a35] to-[#090909]"
      />
      {/* Subtle noise texture for depth */}
      <div
        aria-hidden
        className="absolute inset-0 opacity-30"
        style={{
          backgroundImage: `radial-gradient(ellipse at 30% 50%, rgba(175,80,255,0.25) 0%, transparent 60%),
                            radial-gradient(ellipse at 80% 20%, rgba(127,86,217,0.15) 0%, transparent 50%)`,
        }}
      />

      {fullSrc && !errored && (
        <motion.img
          key={fullSrc}
          src={fullSrc}
          alt={alt ?? query}
          loading="eager"
          onError={() => setErrored(true)}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6 }}
          className="absolute inset-0 h-full w-full object-cover"
        />
      )}
    </div>
  );
}
