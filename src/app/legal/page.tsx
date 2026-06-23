import Link from "next/link";

import { LegalDocumentLayout } from "@/components/legal/LegalDocumentLayout";

export default function TermsPage() {
  return (
    <LegalDocumentLayout title="Terms of Service">
      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-rush-foreground">1. The Rushify Service</h2>
        <p>
          Rushify is a media access service provided to authorized subscribers. By accessing or using
          the Rushify service, you agree to these Terms of Service. If you do not agree, do not use
          the service.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-rush-foreground">2. Authorized Use</h2>
        <p>
          Access is limited to subscribers authorized by the service operator. You are responsible for
          maintaining the confidentiality of your credentials and for all activity under your account.
        </p>
        <p>
          You agree to use the Rushify service only for lawful purposes and in compliance with
          applicable laws. You are solely responsible for ensuring that your use of any content
          accessed through the service is lawful in your jurisdiction.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-rush-foreground">3. Account Sharing</h2>
        <p>
          Account sharing is prohibited unless explicitly authorized by the service operator.
          Unauthorized sharing may result in suspension or termination of access.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-rush-foreground">4. Service Availability</h2>
        <p>
          The Rushify service is provided on an &ldquo;as is&rdquo; and &ldquo;as available&rdquo;
          basis, without warranties of any kind, whether express or implied, including but not
          limited to implied warranties of merchantability, fitness for a particular purpose, or
          non-infringement.
        </p>
        <p>
          Rushify does not guarantee uninterrupted, error-free, or buffer-free playback. We are not
          liable for third-party stream availability, service interruptions, buffering, latency, or
          content that is temporarily or permanently unavailable.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-rush-foreground">5. Changes to the Service</h2>
        <p>
          Features, channels, library content, and service configuration may change, be updated, or
          be discontinued at any time without prior notice. Continued use of the service after
          changes constitutes acceptance of those changes.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-rush-foreground">6. Limitation of Liability</h2>
        <p>
          To the fullest extent permitted by law, Rushify and its operator shall not be liable for
          any indirect, incidental, special, consequential, or punitive damages arising from your use
          of or inability to use the service, including loss of data, loss of access, or playback
          failures.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-rush-foreground">7. Privacy</h2>
        <p>
          Your use of the service is also governed by our{" "}
          <Link href="/legal/privacy" className="text-rush-accent hover:text-rush-accent/80">
            Privacy Policy
          </Link>
          .
        </p>
      </section>

      <section className="space-y-3" id="support">
        <h2 className="text-lg font-semibold text-rush-foreground">8. Support</h2>
        <p>
          For technical issues, see the{" "}
          <Link href="/support" className="text-rush-accent hover:text-rush-accent/80">
            Support &amp; Troubleshooting
          </Link>{" "}
          page. For account or access questions, contact your Rushify service administrator.
        </p>
        <p className="text-rush-muted/80">Developed by Benjamin Rivera</p>
      </section>
    </LegalDocumentLayout>
  );
}
