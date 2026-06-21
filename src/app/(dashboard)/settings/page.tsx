import { Card, CardDescription, CardTitle } from "@/components/ui/Card";

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm uppercase tracking-[0.35em] text-rush-accent">Settings</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight">Configuration</h1>
        <p className="mt-2 max-w-2xl text-rush-muted">
          Server credentials and upstream endpoints are managed through environment
          variables. User authentication flows will be added in a later phase.
        </p>
      </div>

      <Card glow>
        <CardTitle>Environment-backed services</CardTitle>
        <CardDescription>
          Rushify reads Jellyfin and IPTV settings on the server only.
        </CardDescription>
        <ul className="mt-5 space-y-3 text-sm text-rush-muted">
          <li className="rounded-xl border border-rush-border bg-rush-canvas/60 px-4 py-3">
            Media library backend URL and API key
          </li>
          <li className="rounded-xl border border-rush-border bg-rush-canvas/60 px-4 py-3">
            IPTV M3U playlist URL
          </li>
          <li className="rounded-xl border border-rush-border bg-rush-canvas/60 px-4 py-3">
            IPTV XMLTV EPG URL
          </li>
        </ul>
      </Card>
    </div>
  );
}
