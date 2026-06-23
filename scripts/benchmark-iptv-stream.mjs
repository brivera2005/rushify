#!/usr/bin/env node
/**
 * Benchmark IPTV segment path: direct CDN vs Rushify proxy.
 * Usage on unRAID host or dev machine:
 *   node scripts/benchmark-iptv-stream.mjs http://192.168.0.19:8096
 *
 * Requires valid Rushify session cookie or run from localhost with auth disabled.
 */

const baseUrl = process.argv[2]?.replace(/\/$/, "") ?? "http://192.168.0.19:8096";

const IPTV_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
};

async function timedFetch(label, url, init = {}) {
  const start = performance.now();
  const response = await fetch(url, { ...init, redirect: "follow" });
  const elapsed = performance.now() - start;
  const size = Number(response.headers.get("content-length") ?? 0);
  return { label, url, status: response.status, elapsedMs: Math.round(elapsed), size };
}

async function fetchManifest(proxyUrl) {
  const response = await fetch(proxyUrl, { headers: IPTV_HEADERS });
  if (!response.ok) throw new Error(`Manifest failed: ${response.status}`);
  const text = await response.text();
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const segmentLine = lines.find((l) => !l.startsWith("#"));
  if (!segmentLine) throw new Error("No segment URL in manifest");
  if (segmentLine.startsWith("/")) {
    return new URL(segmentLine, baseUrl).href;
  }
  return segmentLine;
}

async function main() {
  console.log(`Rushify base: ${baseUrl}\n`);

  const channelsRes = await fetch(`${baseUrl}/api/iptv/channels`);
  if (!channelsRes.ok) {
    console.error("Failed to load channels — log in via browser and pass session cookie if needed.");
    process.exit(1);
  }

  const payload = await channelsRes.json();
  const channels = payload?.data?.channels ?? [];
  const english = channels.filter((c) => /^(US|UK|CA|AU)\s/i.test(c.name) || /english/i.test(c.group ?? ""));
  const sample = (english.length >= 3 ? english : channels).slice(0, 3);

  if (sample.length === 0) {
    console.error("No channels found.");
    process.exit(1);
  }

  console.log("Channels under test:");
  sample.forEach((c) => console.log(`  - ${c.name} (${c.id})`));
  console.log("");

  for (const channel of sample) {
    console.log(`=== ${channel.name} ===`);
    const manifestUrl = `${baseUrl}${channel.streamUrl}`;
    let segmentUrl;
    try {
      segmentUrl = await fetchManifest(manifestUrl);
    } catch (error) {
      console.log(`  Manifest error: ${error instanceof Error ? error.message : error}`);
      continue;
    }

    const isProxied = segmentUrl.includes("/api/stream/iptv/");
    console.log(`  Segment URL: ${isProxied ? "proxied" : "direct CDN"}`);

    const tests = [];
    if (isProxied) {
      tests.push(await timedFetch("proxy", segmentUrl, { headers: IPTV_HEADERS }));
      const directParam = new URL(segmentUrl).searchParams.get("path");
      if (directParam) {
        tests.push(await timedFetch("direct CDN", directParam, { headers: IPTV_HEADERS }));
      }
    } else {
      tests.push(await timedFetch("direct CDN", segmentUrl, { headers: IPTV_HEADERS }));
      const proxyAsset = `${baseUrl}/api/stream/iptv/${encodeURIComponent(channel.id)}/asset?path=${encodeURIComponent(segmentUrl)}`;
      tests.push(await timedFetch("proxy", proxyAsset, { headers: IPTV_HEADERS }));
    }

    for (const result of tests) {
      console.log(
        `  ${result.label.padEnd(12)} ${result.elapsedMs}ms  status=${result.status}  size=${result.size || "?"}`,
      );
    }
    console.log("");
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
