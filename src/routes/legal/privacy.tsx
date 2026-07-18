import { createFileRoute } from "@tanstack/react-router";
import { ShieldCheck } from "lucide-react";
import { LegalLayout, LegalSection } from "@/components/legal/LegalLayout";

export const Route = createFileRoute("/legal/privacy")({
  component: PrivacyPage,
});

function PrivacyPage() {
  return (
    <LegalLayout
      icon={ShieldCheck}
      eyebrow="Legal"
      title="Privacy Policy"
      lastUpdated="July 18, 2026"
    >
      <LegalSection title="1. Authentication & Account Security">
        <p>
          EDURACK uses Firebase Authentication to manage sign-up and login. Your
          password is never stored on EDURACK's own servers — Firebase issues a
          signed session token after verifying your credentials, and EDURACK's
          backend validates that token via the Firebase Admin SDK on every request
          that needs to confirm who you are.
        </p>
      </LegalSection>

      <LegalSection title="2. What We Store">
        <p>
          Beyond authentication, EDURACK's database stores the information needed to
          run your account and deliver mentorship content: your profile details
          (name, email, exam track, class), the bundles or mentorship batches you've
          purchased, and platform activity like test attempts and progress tracking.
        </p>
        <p>
          Sensitive one-time codes, such as password-reset or email-verification
          OTPs, are never stored in plain text. They are hashed before being written
          to the database and automatically expire shortly after being issued.
        </p>
      </LegalSection>

      <LegalSection title="3. Database Storage Boundaries">
        <p>
          Student data and mentor data are logically separated within EDURACK's
          database. A mentor can see aggregate information about their own batch's
          enrolled students (for delivering their program) but cannot access another
          mentor's student list, payment details, or private account information.
        </p>
      </LegalSection>

      <LegalSection title="4. Payment & Transaction Data">
        <p>
          Payment processing for mentorship batches and bundles is handled through a
          PCI-compliant payment gateway. EDURACK does not store your full card or
          UPI credentials on its own servers — only the transaction status,
          amount, and reference ID needed for order history and mentor payouts are
          retained.
        </p>
      </LegalSection>

      <LegalSection title="5. Third-Party Services">
        <p>
          EDURACK uses a small number of trusted third-party services to operate the
          platform, including Firebase for authentication, a transactional email
          provider for OTPs and notifications, and a payment gateway for checkout.
          Each of these providers only receives the minimum data required to perform
          their specific function.
        </p>
      </LegalSection>

      <LegalSection title="6. Your Rights">
        <p>
          You can request a copy of your account data or ask EDURACK to delete your
          account at any time by contacting our team. Some transaction records may
          be retained for a limited period where required for accounting or legal
          compliance.
        </p>
      </LegalSection>
    </LegalLayout>
  );
}