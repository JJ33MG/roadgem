import { useEffect, useId, useRef, useState } from 'react';
import { apiClient } from '@/lib/apiClient';
import { citiesStartingWith } from '@/lib/cities';

type Props = { id: string; label: string; value: string; placeholder?: string; onChange: (v: string) => void };

const MAX = 6;

/** A town field that suggests cities from the first letter: a built-in list at once, Google's matches a moment later. */
export function CityField({ id, label, value, placeholder, onChange }: Props) {
  const listId = useId();
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [remote, setRemote] = useState<string[]>([]);
  const typed = useRef(false);

  const local = citiesStartingWith(value, MAX);
  const options = [...local, ...remote.filter((r) => !local.some((l) => l.toLowerCase() === r.toLowerCase()))].slice(0, MAX);
  const expanded = open && options.length > 0;

  useEffect(() => {
    const q = value.trim();
    if (!typed.current || q.length < 2) {
      setRemote([]);
      return;
    }
    let live = true;
    const t = setTimeout(() => {
      apiClient
        .get<string[]>('/destinations/suggestions', { params: { query: q } })
        .then((res) => live && setRemote(Array.isArray(res.data) ? res.data : []))
        .catch(() => live && setRemote([]));
    }, 200);
    return () => {
      live = false;
      clearTimeout(t);
    };
  }, [value]);

  const choose = (city: string) => {
    typed.current = false;
    onChange(city);
    setOpen(false);
    setActive(-1);
  };

  return (
    <div className="relative">
      <label htmlFor={id} className="flex flex-col gap-[6px] text-[16px] text-muted" style={{ fontWeight: 500 }}>
        {label}
        <input
          id={id}
          role="combobox"
          aria-expanded={expanded}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={expanded && active >= 0 ? `${listId}-${active}` : undefined}
          className="h-[56px] w-full rounded-input border border-rule bg-paper px-16 text-[19px] text-ink"
          value={value}
          placeholder={placeholder}
          autoComplete="off"
          onChange={(e) => {
            typed.current = true;
            onChange(e.target.value);
            setOpen(true);
            setActive(-1);
          }}
          onFocus={() => value && setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 120)}
          onKeyDown={(e) => {
            if (e.key === 'ArrowDown' && options.length) {
              e.preventDefault();
              setOpen(true);
              setActive((a) => (a + 1) % options.length);
            } else if (e.key === 'ArrowUp' && options.length) {
              e.preventDefault();
              setActive((a) => (a <= 0 ? options.length - 1 : a - 1));
            } else if (e.key === 'Enter' && expanded && active >= 0) {
              e.preventDefault();
              choose(options[active]);
            } else if (e.key === 'Escape') {
              setOpen(false);
            }
          }}
        />
      </label>
      <ul
        id={listId}
        role="listbox"
        aria-label={`${label} suggestions`}
        hidden={!expanded}
        className="absolute left-0 right-0 z-30 mt-4 overflow-hidden rounded-input border border-rule bg-paper p-0 shadow-panel"
        style={{ listStyle: 'none' }}
      >
        {options.map((city, i) => (
          <li
            key={city}
            id={`${listId}-${i}`}
            role="option"
            aria-selected={i === active}
            className={`flex min-h-[52px] cursor-pointer items-center px-16 text-[18px] text-ink ${i === active ? 'bg-paper-2' : ''}`}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => choose(city)}
          >
            {city}
          </li>
        ))}
      </ul>
    </div>
  );
}
