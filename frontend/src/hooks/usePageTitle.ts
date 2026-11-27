import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';

/** Sets the browser tab title ("Pricing | RoamGem"); the home page keeps the full default title. */
export function usePageTitle(title?: string) {
  const { t } = useTranslation();
  const home = t('meta.homeTitle');
  useEffect(() => {
    document.title = title ? `${title} | RoamGem` : home;
  }, [title, home]);
}
