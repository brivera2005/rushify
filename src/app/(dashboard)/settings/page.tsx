import { AdminSettingsPanel } from "@/components/settings/AdminSettingsPanel";
import { UserSettings } from "@/components/settings/UserSettings";
import { isAdminRole } from "@/lib/auth/rushify-users";
import { getSession } from "@/lib/auth/session";

export default async function SettingsPage() {
  const session = await getSession();
  const isAdmin = session ? isAdminRole(session) : false;
  const username = session?.username ?? "User";

  return (
    <div className="space-y-6">
      <div className={isAdmin ? undefined : "mx-auto max-w-3xl"}>
        <p className="text-sm uppercase tracking-[0.35em] text-rush-accent">Settings</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight">
          {isAdmin ? "Admin Control Panel" : "Settings"}
        </h1>
        <p className="mt-2 max-w-2xl text-rush-muted">
          {isAdmin
            ? "Service status, client access, and server configuration for your Rushify deployment."
            : "Your account, service status, and tips for watching on any device."}
        </p>
      </div>

      {isAdmin ? <AdminSettingsPanel /> : <UserSettings username={username} />}
    </div>
  );
}
