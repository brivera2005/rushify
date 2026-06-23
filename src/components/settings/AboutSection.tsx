import packageJson from "../../../package.json";

import { Card, CardDescription, CardTitle } from "@/components/ui/Card";

export function AboutSection() {
  return (
    <Card glow id="about">
      <CardTitle>About</CardTitle>
      <CardDescription>Rushify Media Service</CardDescription>

      <dl className="mt-5 space-y-3 text-sm text-rush-muted">
        <div className="flex justify-between gap-4">
          <dt>Service</dt>
          <dd className="text-rush-foreground">Rushify Media Service</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt>Developed by</dt>
          <dd className="text-rush-foreground">Benjamin Rivera</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt>Version</dt>
          <dd className="text-rush-foreground">{packageJson.version}</dd>
        </div>
      </dl>

      <p className="mt-5 rounded-xl border border-rush-border bg-rush-canvas/60 px-4 py-3 text-sm text-rush-muted">
        Authorized subscriber access only. Use of the Rushify service is subject to the{" "}
        <a href="/legal" className="text-rush-accent hover:text-rush-accent/80">
          Terms of Service
        </a>
        .
      </p>
    </Card>
  );
}
