import { LegalLayout, LegalSection } from '../components/legal/LegalLayout';

export default function Cookies() {
  return (
    <LegalLayout title="Cookie Policy" updated="today">
      <LegalSection title="How Reelforge actually uses cookies">
        <p>
          Reelforge keeps this section short because it keeps cookie use short. Signing in with
          email and password does not set a cookie at all; your session is kept in your
          browser's local storage instead, and sent with each request you make.
        </p>
        <p>
          The one cookie we do set is used only during Google sign in. It holds a short lived,
          random value that lets us confirm the sign in request that comes back from Google
          matches the one you started, protecting you from a certain kind of forged request. It
          is deleted automatically a few minutes after it is set, whether or not you complete
          sign in, and cannot be read by any script running in your browser.
        </p>
      </LegalSection>

      <LegalSection title="What we do not use">
        <p>
          Reelforge does not currently use advertising cookies, third party tracking pixels, or
          cross site analytics cookies. If that changes, this page will change with it, and
          we'll update the date at the top.
        </p>
      </LegalSection>

      <LegalSection title="Local storage">
        <p>
          Separately from cookies, your browser's local storage holds your sign in token and a
          copy of your basic account details, so you stay signed in between visits. This data
          stays on your device and is cleared when you sign out.
        </p>
      </LegalSection>

      <LegalSection title="Contact">
        <p>Questions about this policy can be sent to the support address listed on the site.</p>
      </LegalSection>
    </LegalLayout>
  );
}
