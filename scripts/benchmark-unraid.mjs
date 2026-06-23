#!/usr/bin/env node
/**
 * Benchmark IPTV segment latency: direct CDN vs Rushify proxy.
 * Run on unRAID: node scripts/benchmark-unraid.mjs http://192.168.0.19:8096
 */

import fs from "node:fs";
import path from "node:path";

const base = (process.argv[2] ?? "http://192.168.0.19:8096").replace(/\/$/, "");
const appDir = process.argv[3] ?? "/mnt/user/appdata/rushify";
const ua =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

function readCredentials() {
  const env = fs.readFileSync(path.join(appDir, ".env"), "utf8");
  const match = env.match(/RUSHIFY_USERS=(\[.+\])/);
  if (match) {
    try {
      const users = JSON.parse(match[1]);
      if (users[0]) return { username: users[0].username, password: users[0].password };
    } catch {
      // fall through
    }
  }
  const username = env.match(/RUSHIFY_ADMIN_USERNAME=(.+)/)?.[1]?.trim() ?? "admin";
  const password = env.match(/RUSHIFY_ADMIN_PASSWORD=(.+)/)?.[1]?.trim() ?? "admin";
  return { username, password };
}

async function timedFetch(label, url, cookie) {
  const start = performance.now();
  const response = await fetch(url, {
    headers: { "User-Agent": ua, ...(cookie ? { Cookie: `rushify_session=${cookie}` } : {}) },
    redirect: "follow",
  });
  await response.arrayBuffer();
  const elapsedMs = Math.round(performance.now() - start);
  return { label, status: response.status, elapsedMs, bytes: Number(response.headers.get("content-length") ?? 0) };
}

async function login() {
  const { username, password } = readCredentials();
  const response = await fetch(`${base}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  const cookie = response.headers.getSetCookie?.()?.find((c) => c.startsWith("rushify_session="));
  const value = cookie?.match(/rushify_session=([^;]+)/)?.[1];
  if (!value) throw new Error("Login failed — no session cookie");
  console.log(`Logged in as ${username}`);
  return value;
}

async function main() {
  console.log(`=== Rushify IPTV stream benchmark ===\nBase: ${base}\n`);

  const health = await timedFetch("health", `${base}/api/health`);
  console.log(`health: ${health.status} in ${health.elapsedMs}ms\n`);

  const cookie = await login();
  const channelsRes = await fetch(`${base}/api/iptv/channels`, {
    headers: { Cookie: `rushify_session=${cookie}` },
  });
  const payload = await channelsRes.json();
  let channels = (payload?.data?.channels ?? []).filter((c) =>
    /BBC|CNN|Sky|ITV|ABC|NBC|FOX|News/i.test(c.name),
  );
  if (channels.length < 3) channels = (payload?.data?.channels ?? []).slice(0, 3);
  else channels = channels.slice(0, 3);

  console.log(`Testing ${channels.length} channels:\n`);

  const summary = [];

  for (const channel of channels) {
    console.log(`=== ${channel.name} ===`);
    const manifestRes = await fetch(`${base}${channel.streamUrl}`, {
      headers: { "User-Agent": ua, Cookie: `rushify_session=${cookie}` },
    });
    const manifest = await manifestRes.text();
    const segmentLine = manifest.split(/\r?\n/).map((l) => l.trim()).find((l) => l && !l.startsWith("#"));

    if (!segmentLine) {
      console.log("  No segment in manifest\n");
      continue;
    }

    const isDirect = segmentLine.startsWith("http");
    console.log(`  Mode: ${isDirect ? "HYBRID (segments direct to CDN)" : "FULL PROXY"}`);
    console.log(`  Segment: ${segmentLine.slice(0, 90)}...`);

    const proxyUrl = isDirect
      ? `${base}/api/stream/iptv/${encodeURIComponent(channel.id)}/asset?path=${encodeURIComponent(segmentLine)}`
      : `${base}${segmentLine.startsWith("/") ? segmentLine : `/${segmentLine}`}`;

    const directUrl = isDirect
      ? segmentLine
      : new URL(proxyUrl).searchParams.get("path") ?? "";

    const proxyTimes = [];
    const directTimes = [];

    for (let i = 0; i < 3; i += 1) {
      const proxy = await timedFetch("proxy", proxyUrl, cookie);
      proxyTimes.push(proxy.elapsedMs);
      console.log(`  proxy sample ${i + 1}: ${proxy.elapsedMs}ms (${proxy.status})`);

      if (directUrl) {
        const direct = await timedFetch("direct", directUrl);
        directTimes.push(direct.elapsedMs);
        console.log(`  direct sample ${i + 1}: ${direct.elapsedMs}ms (${direct.status})`);
      }
    }

    const avg = (arr) => Math.round(arr.reduce((a, b) => a + b, 0) / arr.length);
    summary.push({
      name: channel.name,
      mode: isDirect ? "hybrid" : "proxy",
      proxyAvgMs: avg(proxyTimes),
      directAvgMs: directTimes.length ? avg(directTimes) : null,
    });
    console.log("");
  }

  console.log("=== Summary (avg of 3 segment fetches) ===");
  for (const row of summary) {
    const saved =
      row.directAvgMs != null ? row.proxyAvgMs - row.directAvgMs : null;
    console.log(
      `${row.name}: proxy=${row.proxyAvgMs}ms direct=${row.directAvgMs ?? "n/a"}ms` +
        (saved != null ? ` (proxy overhead: ${saved > 0 ? "+" : ""}${saved}ms)` : ""),
    );
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
