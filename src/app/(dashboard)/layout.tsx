import { AppShell } from "@/components/layout/AppShell";
import { IptvWarmup } from "@/components/live/IptvWarmup";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AppShell>
      <IptvWarmup />
      {children}
    </AppShell>
  );
}
