# Rushify Android — PWA & native APK path

Rushify is installable on Android tonight as a **Progressive Web App (PWA)**. A **Capacitor** scaffold is included for a future Play Store APK.

## Phase 1: Install PWA on Android (recommended tonight)

1. Open Chrome on your phone (same Wi‑Fi as unRAID).
2. Go to **http://192.168.0.19:8096/login** and sign in.
3. Tap the **⋮** menu → **Add to Home screen** (or **Install app** if Chrome shows a banner).
4. Confirm **Rushify** — the app opens fullscreen without browser chrome.

### PWA features

- Standalone display (no URL bar)
- Theme color `#7C5CFF` on splash/status bar
- Home screen shortcuts to Live TV and Library
- Offline shell caching via service worker (`/sw.js`)

### Troubleshooting

| Issue | Fix |
|-------|-----|
| No “Install” prompt | Use Chrome; visit `/` while logged in; check `manifest.json` loads |
| Login loop | Ensure `SESSION_COOKIE_SECURE=false` for HTTP, or enable `RUSHIFY_TLS=true` |
| Streams won't play | PWA uses same APIs as browser — verify IPTV status at `/api/iptv/status` |

---

## Phase 2: Capacitor native APK (future)

The `mobile/` folder contains a Capacitor scaffold. Build steps when you're ready for a signed APK:

```bash
# From project root
npm run build
npx cap sync android
cd mobile/android
./gradlew assembleDebug
# APK: mobile/android/app/build/outputs/apk/debug/app-debug.apk
```

### First-time Capacitor setup

```bash
npm install @capacitor/core @capacitor/cli @capacitor/android
npx cap init Rushify com.rushify.app --web-dir=.next/standalone/public
# Or point webDir at your deployed URL for remote wrapper builds
```

Edit `mobile/capacitor.config.ts` — set `server.url` to your Rushify URL for a **remote wrapper** (simplest for homelab):

```typescript
server: {
  url: "http://192.168.0.19:8096",
  cleartext: true, // LAN HTTP only — use HTTPS for production
},
```

Then:

```bash
npx cap add android
npx cap open android   # opens Android Studio
```

Build **Release** APK/AAB in Android Studio with your signing key.

### Trusted Web Activity (TWA) alternative

For a minimal Play Store listing without maintaining native code:

1. Deploy Rushify with HTTPS (`RUSHIFY_TLS=true` or a real domain).
2. Use [Bubblewrap](https://github.com/GoogleChromeLabs/bubblewrap) or [PWA Builder](https://www.pwabuilder.com/) to wrap `https://your-domain`.
3. Verify `/.well-known/assetlinks.json` for domain association.

---

## Security note for mobile access outside LAN

Prefer **Tailscale** or **Cloudflare Tunnel** over raw port forwarding. See main README security section.
