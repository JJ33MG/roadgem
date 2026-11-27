import { useEffect, useId, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Globe } from 'lucide-react';
import { LANGUAGES, currentLang, setLanguage, type Lang } from '@/i18n';

/** The language button at the top: the current language, a list of six in their own names. */
export function LanguageSwitcher({ wide = false }: { wide?: boolean }) {
  const { t, i18n } = useTranslation();
  const [open, setOpen] = useState(false);
  const listId = useId();
  const box = useRef<HTMLDivElement>(null);
  const now = LANGUAGES.find((l) => l.code === (i18n.language as Lang)) ?? LANGUAGES[0];

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent ? e.key === 'Escape' : !box.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', close);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('keydown', close);
    };
  }, [open]);

  return (
    <div ref={box} className={`lang${wide ? ' lang-wide' : ''}`}>
      <button
        type="button"
        className="lang-button"
        aria-label={t('nav.language', { name: now.name })}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => setOpen((o) => !o)}
      >
        <Globe size={18} aria-hidden="true" />
        <span>{wide ? now.name : now.code.toUpperCase()}</span>
      </button>
      {open && (
        <div id={listId} role="menu" aria-label={t('nav.chooseLanguage')} className="lang-list">
          {LANGUAGES.map((l) => (
            <button
              key={l.code}
              type="button"
              role="menuitemradio"
              aria-checked={l.code === currentLang()}
              lang={l.code}
              className="lang-item"
              onClick={() => { setLanguage(l.code); setOpen(false); }}
            >
              {l.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
