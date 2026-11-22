import { LegalLayout, OPERATOR, Section } from './LegalLayout';

export function TermsPage() {
  return (
    <LegalLayout title="Terms">
      <p className="mt-24 text-[19px]">{`These terms apply to Routify, run by ${OPERATOR.name}, ${OPERATOR.address}. By using Routify you agree to them.`}</p>

      <Section title="What Routify does">
        <p>Routify plans road trips: the days, where to sleep, gems on the way and what it may cost. It is a planning aid. You stay responsible for your journey, your vehicle and following the road rules.</p>
      </Section>

      <Section title="Estimates, not promises">
        <p>Costs, tolls, vignettes, prices of stays and driving times are estimates from public prices and tables, and change over time. Gems are real places found on Google with their ratings, but opening hours, access and conditions change. Check them before you go, and always follow the road signs, local rules and limits for your vehicle (height, weight, low-emission zones).</p>
      </Section>

      <Section title="Partner links">
        <p>Some links lead to partners such as Booking.com, Pitchup, Vrbo, Roadsurfer, Indie Campers and GetYourGuide. When you book through them we may earn a commission, at no extra cost to you. Your booking is a contract between you and that partner.</p>
      </Section>

      <Section title="Plus and the Trip pass">
        <ul className="grid gap-8 pl-24">
          <li>Plus is a monthly subscription. It renews every month until you stop it; you can stop it any time and it keeps working until the end of the paid month.</li>
          <li>The Trip pass is a one-off payment: every Plus feature, for one trip.</li>
          <li>Both start right away when you pay. Because the service starts at once, the 14-day right of withdrawal ends when you ask us to start it. If something does not work, email us and we will put it right.</li>
        </ul>
      </Section>

      <Section title="Community photos and gems">
        <p>You keep the rights to photos you post. You allow Routify to show them in the app and in its own promotion, with your explorer name. Post only your own photos, nothing unsafe, offensive or private about others. We may remove posts and suggested gems that break these rules.</p>
      </Section>

      <Section title="Liability">
        <p>We do our best to keep Routify correct and available, but cannot promise it is always error-free. We are not liable for indirect damage, or for what partners and places do. Nothing in these terms limits rights you have as a consumer by law.</p>
      </Section>

      <Section title="Changes and law">
        <p>{`We may update these terms; the date at the top shows the latest version. The law of ${OPERATOR.country} applies, without taking away the protection of the law where you live. Questions: ${OPERATOR.email}.`}</p>
      </Section>
    </LegalLayout>
  );
}
