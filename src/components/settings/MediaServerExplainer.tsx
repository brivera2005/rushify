import Link from "next/link";

import { Card, CardDescription, CardTitle } from "@/components/ui/Card";

const serverChecklist = [
  "Open your server management UI in a browser (usually your tower or NAS IP).",
  "Go to the Docker tab and confirm your media library container is running.",
  "Verify the library API port is published to the host.",
  "From this network, open the library server URL in a browser to confirm it responds.",
  "Add the server URL and API key to Rushify environment configuration, then restart the service.",
];

export function MediaServerExplainer() {
  return (
    <Card glow className="border-amber-400/25 bg-amber-400/[0.03]">
      <CardTitle>Library backend not connected</CardTitle>
      <CardDescription className="text-rush-muted">
        The Rushify service requires a configured library backend to serve movies, shows, and music.
        Rushify does not host your media library itself.
      </CardDescription>

      <div className="mt-6 space-y-4 text-sm leading-6 text-rush-muted">
        <p>
          <strong className="text-rush-foreground">What Rushify provides:</strong> a unified media
          access experience for authorized subscribers: live TV and your personal library in one
          interface.
        </p>
        <p>
          <strong className="text-rush-foreground">What must be running:</strong> a media library
          server on your network with API access enabled for Rushify.
        </p>
        <p>
          The scan below checks whether Rushify can reach that backend from this server. If nothing
          is found, the backend may be stopped, on a different network path, or not yet configured.
        </p>
      </div>

      <div className="mt-6 rounded-xl border border-rush-border bg-rush-canvas/50 p-5">
        <h3 className="text-sm font-semibold text-rush-foreground">Server setup checklist</h3>
        <ol className="mt-4 list-decimal space-y-2 pl-5 text-sm leading-6 text-rush-muted">
          {serverChecklist.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
      </div>

      <p className="mt-4 text-sm text-rush-muted">
        Once the backend responds, use{" "}
        <strong className="text-rush-foreground">Scan for Library Server</strong> below or add the
        address to your <code className="text-rush-accent">.env</code> file.
      </p>
    </Card>
  );
}

export function HomeConnectionBanner() {
  return (
    <section className="rounded-2xl border border-rush-border/80 bg-rush-canvas/40 p-6 lg:p-8">
      <h2 className="text-lg font-semibold text-rush-foreground">Rushify Media Service</h2>
      <ul className="mt-4 space-y-3 text-sm leading-6 text-rush-muted">
        <li>
          <strong className="text-rush-foreground">Authorized access only</strong>: sign in with
          your subscriber credentials to use the service.
        </li>
        <li>
          <strong className="text-rush-foreground">Live TV and library</strong>: watch channels and
          browse your personal collection in one place.
        </li>
        <li>
          <strong className="text-rush-foreground">Need help?</strong> Visit Support in Settings
          or the footer links for troubleshooting.
        </li>
      </ul>
      <Link
        href="/settings"
        className="mt-5 inline-flex text-sm font-medium text-rush-accent hover:text-rush-accent/80"
      >
        Open Settings →
      </Link>
    </section>
  );
}
