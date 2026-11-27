import { useTranslation } from 'react-i18next';
import { LegalLayout, OPERATOR, Section } from './LegalLayout';

export function TermsPage() {
  const { t } = useTranslation();
  return (
    <LegalLayout title={t('terms.title')}>
      <p className="mt-24 text-[19px]">{t('terms.intro', { name: OPERATOR.name, address: OPERATOR.address })}</p>

      <Section title={t('terms.whatTitle')}>
        <p>{t('terms.what')}</p>
      </Section>

      <Section title={t('terms.estimatesTitle')}>
        <p>{t('terms.estimates')}</p>
      </Section>

      <Section title={t('terms.partnersTitle')}>
        <p>{t('terms.partners')}</p>
      </Section>

      <Section title={t('terms.plusTitle')}>
        <ul className="grid gap-8 pl-24">
          {[1, 2, 3].map((n) => <li key={n}>{t(`terms.plus${n}`)}</li>)}
        </ul>
      </Section>

      <Section title={t('terms.communityTitle')}>
        <p>{t('terms.community')}</p>
      </Section>

      <Section title={t('terms.liabilityTitle')}>
        <p>{t('terms.liability')}</p>
      </Section>

      <Section title={t('terms.changesTitle')}>
        <p>{t('terms.changes', { country: OPERATOR.country, email: OPERATOR.email })}</p>
      </Section>
    </LegalLayout>
  );
}
