import { LegalLayout, LegalSection } from '../components/legal/LegalLayout';

export default function Terms() {
  return (
    <LegalLayout title="Terms of Service" updated="today">
      <LegalSection title="1. Agreement">
        <p>
          These terms govern your use of Reelforge, a platform that generates video scripts,
          images, and voice narration from a written prompt. By creating an account, you agree
          to these terms. If you do not agree, please do not use the service.
        </p>
      </LegalSection>

      <LegalSection title="2. Your account">
        <p>
          You are responsible for keeping your account credentials secure and for all activity
          that happens under your account. You must provide accurate information when you sign
          up and keep it current. You must be old enough to enter a binding agreement in your
          country to use Reelforge.
        </p>
      </LegalSection>

      <LegalSection title="3. Free trial and subscriptions">
        <p>
          New accounts receive a free trial period with full access to premium generation
          quality. After the trial ends, continued access to premium features requires an
          active paid subscription, billed on a recurring monthly basis. You can cancel at any
          time; cancellation takes effect at the end of the current billing period, and access
          reverts to the free tier rather than being cut off immediately.
        </p>
        <p>
          Prices may change with notice posted on the site or sent to your account email.
          Continuing to use the service after a price change takes effect means you accept the
          new price.
        </p>
      </LegalSection>

      <LegalSection title="4. Generated content">
        <p>
          Scripts, images, and audio you generate through Reelforge are yours to use, edit, and
          publish, subject to the rights of any underlying AI models and to applicable law.
          Reelforge does not claim ownership over content you generate.
        </p>
        <p>
          Generated content is produced by automated systems and may occasionally be
          inaccurate, biased, or unsuitable for your intended use. You are responsible for
          reviewing generated content before publishing it, including for factual accuracy,
          appropriateness, and compliance with the policies of any platform you publish to.
        </p>
      </LegalSection>

      <LegalSection title="5. Acceptable use">
        <p>You agree not to use Reelforge to generate content that:</p>
        <ul>
          <li>Is illegal, or that infringes someone else's rights</li>
          <li>Is intended to harass, defame, or deceive a specific person or group</li>
          <li>Depicts real people in a sexual, violent, or misleading way without consent</li>
          <li>Attempts to abuse, overload, or interfere with the service's normal operation</li>
        </ul>
        <p>We may suspend or terminate accounts that violate this section.</p>
      </LegalSection>

      <LegalSection title="6. Third party processing">
        <p>
          Generating a script, image, or voice track involves sending your prompt and related
          data to third party AI providers for processing. Payments are handled by a third
          party payment processor; Reelforge does not store your full card details. Generated
          files are stored with a third party cloud storage provider so they remain available
          in your projects.
        </p>
      </LegalSection>

      <LegalSection title="7. Termination">
        <p>
          You may stop using Reelforge and delete your account at any time. We may suspend or
          terminate an account that violates these terms, with notice where reasonably
          possible. Projects and generated content tied to a deleted account may be permanently
          removed.
        </p>
      </LegalSection>

      <LegalSection title="8. Disclaimers and liability">
        <p>
          Reelforge is provided as is, without warranties of any kind. We do not guarantee that
          the service will be uninterrupted, error free, or that generated content will meet
          any particular standard. To the extent permitted by law, Reelforge is not liable for
          indirect, incidental, or consequential damages arising from your use of the service.
        </p>
      </LegalSection>

      <LegalSection title="9. Changes to these terms">
        <p>
          We may update these terms from time to time. If a change is material, we will make
          reasonable efforts to notify you before it takes effect. Continued use of the service
          after a change means you accept the updated terms.
        </p>
      </LegalSection>

      <LegalSection title="10. Contact">
        <p>Questions about these terms can be sent to the support address listed on the site.</p>
      </LegalSection>
    </LegalLayout>
  );
}
