import Link from "next/link";

import { LegalDocumentLayout } from "@/components/legal/LegalDocumentLayout";

export default function PrivacyPage() {
  return (
    <LegalDocumentLayout title="Privacy Policy">
      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-rush-foreground">Overview</h2>
        <p>
          This Privacy Policy describes how the Rushify service handles information when you access
          your authorized subscription. Rushify is operated as a private media service, not a
          commercial data platform.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-rush-foreground">Data Storage</h2>
        <p>
          Service data is stored locally on the operator&apos;s server. Your viewing preferences,
          session information, and cached guide data remain on that server rather than on third-party
          cloud infrastructure controlled by Rushify.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-rush-foreground">Credentials</h2>
        <p>
          Login credentials and service configuration are stored server-side only. Sensitive
          credentials used to connect to media sources are never exposed to your browser or embedded
          in client-side code.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-rush-foreground">Session Cookies</h2>
        <p>
          Rushify uses session cookies to keep you signed in and to protect access to the service.
          These cookies are essential for authentication and are not used for advertising or
          cross-site tracking.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-rush-foreground">Third Parties</h2>
        <p>
          Rushify does not sell your personal data to third parties. Media streams and guide data
          may be retrieved from configured content sources as part of delivering the service to you;
          those sources operate under their own terms and policies.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-rush-foreground">Your Rights</h2>
        <p>
          Because data is held locally on the service operator&apos;s infrastructure, questions
          about access, correction, or deletion should be directed to your Rushify administrator.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-rush-foreground">Related Policies</h2>
        <p>
          See also our{" "}
          <Link href="/legal" className="text-rush-accent hover:text-rush-accent/80">
            Terms of Service
          </Link>
          .
        </p>
        <p className="text-rush-muted/80">Developed by Benjamin Rivera</p>
      </section>
    </LegalDocumentLayout>
  );
}
