import { useTranslation } from 'react-i18next';
import { LegalLayout, OPERATOR, Section } from './LegalLayout';

export function PrivacyPage() {
  const { t } = useTranslation();
  const list = (keys: string[]) => (
    <ul className="grid gap-8 pl-24">
      {keys.map((k) => <li key={k}>{t(k)}</li>)}
    </ul>
  );
  return (
    <LegalLayout title={t('privacy.title')}>
      <p className="mt-24 text-[19px]">{t('privacy.intro', { name: OPERATOR.name, address: OPERATOR.address, email: OPERATOR.email })}</p>

      <Section title={t('privacy.collectTitle')}>
        {list([1, 2, 3, 4, 5, 6].map((n) => `privacy.collect${n}`))}
        <p>{t('privacy.collectUse')}</p>
      </Section>

      <Section title={t('privacy.whoTitle')}>
        {list([1, 2, 3, 4, 5, 6].map((n) => `privacy.who${n}`))}
      </Section>

      <Section title={t('privacy.keepTitle')}>
        <p>{t('privacy.keep')}</p>
      </Section>

      <Section title={t('privacy.rightsTitle')}>
        <p>{t('privacy.rights', { email: OPERATOR.email })}</p>
      </Section>

      <Section title={t('privacy.cookiesTitle')}>
        <p>{t('privacy.cookies')}</p>
      </Section>
    </LegalLayout>
  );
}
