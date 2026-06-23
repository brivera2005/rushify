import { Card, CardDescription, CardTitle } from "@/components/ui/Card";

const vpnChecklist = [
  {
    title: "Same Wi‑Fi as server?",
    body: "Use your local address (e.g. 192.168.x.x:8096) and turn VPN off on your device.",
  },
  {
    title: "Remote access?",
    body: "Ensure port forwarding or secure remote access is configured. Try VPN off first; if your ISP throttles streaming, try VPN on.",
  },
  {
    title: "Live TV buffering?",
    body: "Refresh the EPG, try a different channel, and check your connection speed.",
  },
  {
    title: "Movie won't play?",
    body: "Try a different quality setting in the player.",
  },
  {
    title: "Still stuck?",
    body: "Contact support through your Rushify administrator or the support link in the footer.",
  },
];

export function SupportTroubleshooting() {
  return (
    <Card glow id="support-troubleshooting">
      <CardTitle>Support &amp; Troubleshooting</CardTitle>
      <CardDescription>
        Common fixes for streaming issues on the Rushify service.
      </CardDescription>

      <section className="mt-6 space-y-4">
        <h3 className="text-base font-semibold text-rush-foreground">VPN / Streaming troubleshooting</h3>
        <p className="text-sm leading-6 text-rush-muted">
          Rushify runs on a secured home server. You typically do <strong className="text-rush-foreground">not</strong> need a VPN to use Rushify on your home network.
        </p>
        <p className="text-sm leading-6 text-rush-muted">
          If streaming fails or buffers, try toggling VPN on your device (phone, tablet, or TV) <strong className="text-rush-foreground">off</strong> first. A device VPN can route traffic away from your local server and cause playback problems.
        </p>
        <p className="text-sm leading-6 text-rush-muted">
          If you are accessing Rushify remotely (outside your home), your server&apos;s connection handles secure access. A device VPN may help or hurt depending on your provider. Try the opposite state if one approach fails.
        </p>

        <ol className="mt-4 list-decimal space-y-3 pl-5 text-sm leading-6 text-rush-muted">
          {vpnChecklist.map((item) => (
            <li key={item.title}>
              <strong className="text-rush-foreground">{item.title}</strong> {item.body}
            </li>
          ))}
        </ol>
      </section>

      <section className="mt-8 space-y-3">
        <h3 className="text-base font-semibold text-rush-foreground">Other troubleshooting</h3>
        <ul className="list-disc space-y-2 pl-5 text-sm leading-6 text-rush-muted">
          <li>Clear your browser cache or perform a hard refresh (Ctrl+Shift+R or Cmd+Shift+R).</li>
          <li>Sign out and sign back in to refresh your session.</li>
          <li>Check that Rushify loads your home screen and Live TV guide normally.</li>
        </ul>
      </section>
    </Card>
  );
}
