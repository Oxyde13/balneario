import { useState } from 'react';
import { usePhotoUrl } from '../hooks/queries';
import { initials } from '../lib/members';
import { cn } from './ui';

const sizes = {
  sm: 'h-9 w-9 text-xs',
  md: 'h-11 w-11 text-sm',
  lg: 'h-16 w-16 text-lg',
  xl: 'h-28 w-28 text-3xl',
};

/** Member photo, or initials in the club colours when there is none. */
export function Avatar({
  name,
  photoPath,
  size = 'md',
  className,
}: {
  name: string;
  photoPath: string | null;
  size?: keyof typeof sizes;
  className?: string;
}) {
  const { data: url } = usePhotoUrl(photoPath);
  const [failed, setFailed] = useState<string | null>(null);
  const showPhoto = url && failed !== url;

  return (
    <span
      className={cn(
        'relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary font-bold text-primary-foreground ring-2 ring-card',
        sizes[size],
        className,
      )}
      aria-hidden="true"
    >
      {showPhoto ? (
        <img src={url} alt="" loading="lazy" decoding="async" className="h-full w-full object-cover" onError={() => setFailed(url)} />
      ) : (
        initials(name)
      )}
    </span>
  );
}
