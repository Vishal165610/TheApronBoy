import { createFileRoute } from "@tanstack/react-router";
import { FileText } from "lucide-react";
import { LegalLayout, LegalSection } from "@/components/legal/LegalLayout";

export const Route = createFileRoute("/legal/terms")({
  component: TermsPage,
});

function TermsPage() {
  return (
    <LegalLayout
      icon={FileText}
      eyebrow="Legal"
      title="Terms of Service"
      lastUpdated="July 18, 2026"
    >
      <LegalSection title="1. The EDURACK Marketplace">
        <p>
          EDURACK operates an open marketplace connecting students with independent
          mentors — AIIMS and top-tier college rankers who create and run their own
          mentorship batches. EDURACK is the platform that hosts, discovers, and
          processes payment for these batches; it is not the instructor of record for
          any individual batch.
        </p>
      </LegalSection>

      <LegalSection title="2. Mentors Set Their Own Rates">
        <p>
          Every mentor independently sets the pricing tier, batch structure, and
          content roadmap for their mentorship space. EDURACK does not fix, cap, or
          negotiate mentor pricing on a mentor's behalf. Students should review a
          batch's listed price, inclusions, and mentor credentials before purchasing.
        </p>
      </LegalSection>

      <LegalSection title="3. Content Ownership">
        <p>
          Mentors retain full ownership of the syllabus material, planners, videos,
          and other resources they upload to their mentorship space. EDURACK is
          granted a limited license to host and deliver this content to enrolled
          students for the duration of their access period, and does not claim
          ownership over mentor-created intellectual property.
        </p>
      </LegalSection>

      <LegalSection title="4. Platform Fee">
        <p>
          EDURACK charges a transaction-based platform fee on each successful
          mentorship batch or bundle purchase. This fee funds payment processing,
          hosting, discovery, and support infrastructure. The platform fee is
          deducted from the mentor's payout and does not change the price a student
          sees or pays at checkout.
        </p>
      </LegalSection>

      <LegalSection title="5. Student Access & Conduct">
        <p>
          Access to a mentorship batch or CBT mock test series is granted per the
          terms listed on that specific product page. Sharing login credentials,
          reselling access, or redistributing mentor content outside the platform is
          not permitted and may result in access being revoked without refund.
        </p>
      </LegalSection>

      <LegalSection title="6. Changes to These Terms">
        <p>
          EDURACK may update these terms as the platform evolves. Material changes
          will be reflected by an updated "Last updated" date on this page.
          Continued use of EDURACK after changes take effect constitutes acceptance
          of the revised terms.
        </p>
      </LegalSection>
    </LegalLayout>
  );
}