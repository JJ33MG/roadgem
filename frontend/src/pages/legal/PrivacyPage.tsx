import { LegalLayout, OPERATOR, Section } from './LegalLayout';

export function PrivacyPage() {
  return (
    <LegalLayout title="Privacy">
      <p className="mt-24 text-[19px]">
        {`Routify is run by ${OPERATOR.name}, ${OPERATOR.address} ("we"). We keep as little about you as we can, and never sell it. Questions: ${OPERATOR.email}.`}
      </p>

      <Section title="What we collect">
        <ul className="grid gap-8 pl-24">
          <li>Your trips: where you start and end, the days, your vehicle and settings, and the plan we make. Trips are saved so you can open and share them.</li>
          <li>An account, if you make one: your email address and your password, stored only as a secure hash.</li>
          <li>Whether you have Plus or a Trip pass. Payments are handled by Stripe; we never see your card.</li>
          <li>Clicks on booking links (which partner, which trip), so we know which partners help travellers. Not what you book.</li>
          <li>Community photos you post, with the place you took them. We check the photo was taken near the gem; the photo is public only after a check.</li>
          <li>Technical data every website receives, such as your IP address, used to keep the service safe and to limit misuse.</li>
        </ul>
        <p>We use this to plan and save your trips, run your account and payments, show community photos, and keep Routify working and safe (contract and legitimate interest under the GDPR).</p>
      </Section>

      <Section title="Who processes it">
        <ul className="grid gap-8 pl-24">
          <li>Railway: hosts Routify and its database (servers may be outside the EU, under the EU standard contractual clauses).</li>
          <li>Anthropic (Claude): writes the trip plan from your route and settings. No account details are sent.</li>
          <li>Google Maps Platform: routes, places, photos and maps.</li>
          <li>Stripe: payments for Plus and the Trip pass.</li>
          <li>OpenFreeMap: the map tiles of the globe.</li>
          <li>Booking partners (such as Booking.com, Pitchup, Vrbo, GetYourGuide): only when you click through to them. What happens there falls under their privacy policy.</li>
        </ul>
      </Section>

      <Section title="How long we keep it">
        <p>Trips and your account stay until you delete them or ask us to. Click counts hold no personal details beyond your account, if you were signed in, and go when your account goes. Server logs are kept for a short time only, for safety.</p>
      </Section>

      <Section title="Your rights">
        <p>{`You may see, correct, download or delete your data, object to its use, and withdraw consent. Email ${OPERATOR.email} and we answer within a month. You may also complain to your data protection authority.`}</p>
      </Section>

      <Section title="Cookies and storage">
        <p>Routify uses no advertising or tracking cookies. Your browser stores only what Routify needs to work: that you are signed in, and the key that lets you change a trip you planned on this device. That is why there is no cookie banner. Booking partners may set their own cookies once you visit their sites.</p>
      </Section>
    </LegalLayout>
  );
}
