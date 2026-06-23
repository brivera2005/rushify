#!/usr/bin/env node
/**
 * Generate M3U playlist from Xtream player_api (when get.php M3U endpoint is blocked).
 */
import { writeFileSync } from "node:fs";

function parseArgs(argv) {
  const args = {};
  for (let i = 2; i < argv.length; i += 2) {
    const key = argv[i]?.replace(/^--/, "");
    const value = argv[i + 1];
    if (key && value) args[key] = value;
  }
  return args;
}

function buildApiUrl(base, user, pass, action, extra = {}) {
  const params = new URLSearchParams({
    username: user,
    password: pass,
    action,
    ...extra,
  });
  return `${base.replace(/\/$/, "")}/player_api.php?${params}`;
}

async function main() {
  const { base, user, pass, out } = parseArgs(process.argv);
  if (!base || !user || !pass || !out) {
    console.error("Usage: generate-m3u-from-xtream.mjs --base URL --user USER --pass PASS --out FILE");
    process.exit(1);
  }

  const [categoriesRes, streamsRes] = await Promise.all([
    fetch(buildApiUrl(base, user, pass, "get_live_categories")),
    fetch(buildApiUrl(base, user, pass, "get_live_streams")),
  ]);

  if (!streamsRes.ok) {
    throw new Error(`get_live_streams failed (${streamsRes.status})`);
  }

  const categories = categoriesRes.ok ? await categoriesRes.json() : [];
  const streams = await streamsRes.json();
  const categoryNames = new Map(
    (Array.isArray(categories) ? categories : []).map((c) => [c.category_id, c.category_name]),
  );

  const lines = ["#EXTM3U"];
  const baseUrl = base.replace(/\/$/, "");

  for (const stream of streams) {
    const group = stream.category_id ? categoryNames.get(stream.category_id) : "";
    const logo = stream.stream_icon || "";
    const tvgId = stream.epg_channel_id || "";
    let name = String(stream.name || `Channel ${stream.stream_id}`).replace(/,/g, " ");
    if (group && !/^[A-Z]{2,}\|/i.test(name)) {
      const region = group.split("|")[0]?.trim();
      if (region) {
        name = `${region}| ${name}`;
      }
    }
    const url = `${baseUrl}/live/${encodeURIComponent(user)}/${encodeURIComponent(pass)}/${stream.stream_id}.m3u8`;

    lines.push(
      `#EXTINF:-1 tvg-id="${tvgId}" tvg-logo="${logo}" group-title="${group || "Live"}",${name}`,
    );
    lines.push(url);
  }

  writeFileSync(out, `${lines.join("\n")}\n`, "utf8");
  console.log(`Generated ${streams.length} channels -> ${out}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
