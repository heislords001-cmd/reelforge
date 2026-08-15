import { LegalLayout, LegalSection } from '../components/legal/LegalLayout';

export default function Privacy() {
  return (
    <LegalLayout title="Privacy Policy" updated="today">
      <LegalSection title="1. What we collect">
        <p>When you use Reelforge, we collect:</p>
        <ul>
          <li>Account information: your name, email address, and a securely hashed password, or your Google account identifier if you sign in with Google</li>
          <li>Content you create: prompts, generated scripts, images, and audio, and any edits you make to them</li>
          <li>Billing information: your subscription status and payment history. Full card details are handled entirely by our payment processor and never reach our servers</li>
          <li>Basic technical data such as sign in timestamps, used for account security</li>
        </ul>
      </LegalSection>

      <LegalSection title="2. How we use it">
        <p>We use the information above to:</p>
        <ul>
          <li>Provide the service: generate your scripts, images, and voice narration, and save your projects</li>
          <li>Operate your account: authentication, billing, and customer support</li>
          <li>Improve the service: understanding what breaks or what features get used, in aggregate</li>
          <li>Communicate with you about your account, such as billing receipts or a trial ending soon</li>
        </ul>
        <p>We do not sell your personal information to advertisers or data brokers.</p>
      </LegalSection>

      <LegalSection title="3. Who we share it with">
        <p>
          To generate content, your prompt and related project data are sent to third party AI
          providers for processing. To bill a subscription, your billing details are handled by
          a third party payment processor. Generated files are stored with a third party cloud
          storage provider. Each of these providers only receives what it needs to perform its
          function, and is bound by its own data protection obligations.
        </p>
        <p>
          We do not share your personal information with third parties for their own marketing
          purposes.
        </p>
      </LegalSection>

      <LegalSection title="4. Data retention">
        <p>
          We keep your account and project data for as long as your account is active. If you
          delete your account, we remove your personal information and generated content within
          a reasonable period, except where we are required to retain certain records, such as
          billing history, for legal or accounting purposes.
        </p>
      </LegalSection>

      <LegalSection title="5. Your rights">
        <p>
          You can access, correct, or delete your account information at any time from within
          the app, or by contacting support. Depending on where you live, you may have
          additional rights under local law, such as requesting a copy of your data or
          objecting to certain uses of it.
        </p>
      </LegalSection>

      <LegalSection title="6. Security">
        <p>
          Passwords are stored using industry standard hashing, never in plain text. Access to
          production data is limited to what is needed to operate the service. No system is
          perfectly secure, and we cannot guarantee absolute security, but we take reasonable
          measures to protect your information.
        </p>
      </LegalSection>

      <LegalSection title="7. Children">
        <p>
          Reelforge is not directed at children, and we do not knowingly collect personal
          information from anyone under the age required to hold an account in their country.
        </p>
      </LegalSection>

      <LegalSection title="8. Changes to this policy">
        <p>
          We may update this policy as the service changes. If a change is material, we will
          make reasonable efforts to notify you before it takes effect.
        </p>
      </LegalSection>

      <LegalSection title="9. Contact">
        <p>Questions about this policy can be sent to the support address listed on the site.</p>
      </LegalSection>
    </LegalLayout>
  );
}
