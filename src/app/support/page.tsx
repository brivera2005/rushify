import { LegalDocumentLayout } from "@/components/legal/LegalDocumentLayout";
import { SupportTroubleshooting } from "@/components/settings/SupportTroubleshooting";

export default function SupportPage() {
  return (
    <LegalDocumentLayout title="Support">
      <p>
        Help for authorized Rushify subscribers experiencing streaming or access issues.
      </p>
      <div className="not-prose">
        <SupportTroubleshooting />
      </div>
    </LegalDocumentLayout>
  );
}
