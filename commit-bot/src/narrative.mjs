import {
  seededRandom,
  pick,
  rot13,
  toHex,
  vigenereEncode,
  caesar,
  fakeCoords,
  fakePhone,
  modemAscii,
  formatCipherBlock,
} from "./ciphers.mjs";

/** Maze graph — each node has exits; bot walks with seeded + random choices. */
export const MAZE = {
  gate: {
    name: "GATE // BOOT SECTOR",
    exits: ["modem-well", "bbs-lobby", "dead-drop"],
    tone: "entry",
  },
  "modem-well": {
    name: "MODEM WELL // 14400 BAUD",
    exits: ["gate", "static-cathedral", "relay-9"],
    tone: "tech",
  },
  "bbs-lobby": {
    name: "BBS LOBBY // LAST LOGIN 1994-11-03",
    exits: ["gate", "archive-pit", "phone-tree"],
    tone: "bbs",
  },
  "dead-drop": {
    name: "DEAD DROP // COORDINATES UNRELIABLE",
    exits: ["gate", "catacomb-7", "mirror-hall"],
    tone: "geo",
  },
  "static-cathedral": {
    name: "STATIC CATHEDRAL",
    exits: ["modem-well", "relay-9", "null-room"],
    tone: "horror",
  },
  "relay-9": {
    name: "RELAY 9 // DO NOT TRUST THE HANDshake",
    exits: ["modem-well", "static-cathedral", "operator-desk"],
    tone: "tech",
  },
  "archive-pit": {
    name: "ARCHIVE PIT // FILES MARKED [CORRUPT]",
    exits: ["bbs-lobby", "catacomb-7", "red-herring-a"],
    tone: "archive",
  },
  "phone-tree": {
    name: "PHONE TREE // ALL PATHS SAY GOODBYE",
    exits: ["bbs-lobby", "operator-desk", "red-herring-b"],
    tone: "phone",
  },
  "catacomb-7": {
    name: "CATACOMB 7 // SEVEN TURNS, NO RETURN",
    exits: ["dead-drop", "archive-pit", "mirror-hall"],
    tone: "horror",
  },
  "mirror-hall": {
    name: "MIRROR HALL // YOU ARE NOT ALONE",
    exits: ["dead-drop", "catacomb-7", "null-room"],
    tone: "horror",
  },
  "operator-desk": {
    name: "OPERATOR DESK // COFFEE STILL WARM",
    exits: ["relay-9", "phone-tree", "root-node"],
    tone: "mystery",
  },
  "null-room": {
    name: "NULL ROOM // 0x00",
    exits: ["static-cathedral", "mirror-hall", "root-node"],
    tone: "void",
  },
  "root-node": {
    name: "ROOT NODE // ACCESS DENIED (ALWAYS)",
    exits: ["operator-desk", "null-room", "gate"],
    tone: "core",
  },
  "red-herring-a": {
    name: "WELCOME TO THE MAZE (FAKE)",
    exits: ["archive-pit"],
    tone: "fake",
  },
  "red-herring-b": {
    name: "CONGRATULATIONS YOU WIN (LIE)",
    exits: ["phone-tree"],
    tone: "fake",
  },
};

/** Master narrative shards — combined over hundreds of commits into one long clue. */
const MASTER_SHARDS = [
  "THE SERVER NEVER SHUT DOWN",
  "SOMEONE IS STILL LOGGED IN AS OPERATOR",
  "THE MAZE IS NOT ON THE MAP",
  "FOLLOW THE STATIC BETWEEN STATIONS",
  "NODE SEVEN REMembers YOUR NAME",
  "DO NOT TRUST THE MIRROR",
  "THE PASSWORD IS IN THE NOISE",
  "1994 WAS NOT AN ACCIDENT",
  "THE TRAIL LEADS UNDER THE SWITCHBOARD",
  "YOU ARE ALREADY INSIDE",
  "THE NEXT FRAGMENT IS NOT IN THIS REPO",
  "LOOK FOR THE HAND THAT NEVER HUNG UP",
  "SEVEN RED COMMITS ON THE SEVENTH DAY",
  "THE COORDINATES ARE A LIE EXCEPT ONE",
  "ASCII ART IS A DOOR",
  "THE BBS WELCOME MESSAGE IS THE KEY",
  "ROT THIRTEEN THE OPERATOR LOG",
  "THE CATACOMB HAS NO FLOOR",
  "RELAY NINE REPEATS WHAT YOU TYPE",
  "THE MAZE COMMITS BACK",
];

const BBS_USERS = ["PHANTOM_OP", "DEADLINE_K", "NULLSET", "CARRIER_LOST", "SYSOP???", "GUEST_0"];

const COMMIT_MESSAGES = [
  "signal detected",
  "fragment recovered",
  "node heartbeat",
  "maze: trail update",
  "relay ping",
  "archive write",
  "static burst",
  "operator left something",
  "do not merge",
  "trace route incomplete",
  "bbs sync",
  "catacomb echo",
  "14400",
  "NO CARRIER (retry)",
  "manifest delta",
];

export function advanceMaze(state) {
  const node = MAZE[state.currentNode] ?? MAZE.gate;
  const rng = seededRandom(`${state.masterSeed}:${state.fragmentIndex}:${state.currentNode}`);
  const exits = node.exits.filter((e) => e !== state.currentNode);
  const nextNode = pick(rng, exits.length ? exits : node.exits);
  state.currentNode = nextNode;
  state.pathTaken.push(nextNode);
  if (state.pathTaken.length > 200) {
    state.pathTaken = state.pathTaken.slice(-100);
  }
  return nextNode;
}

export function generateFragment(state) {
  const seq = state.fragmentIndex + 1;
  const nodeId = state.currentNode;
  const node = MAZE[nodeId] ?? MAZE.gate;
  const rng = seededRandom(`${state.masterSeed}:frag:${seq}:${nodeId}`);

  const shardIndex = seq % MASTER_SHARDS.length;
  const masterShard = MASTER_SHARDS[shardIndex];
  const fragmentType = pickFragmentType(node.tone, rng);
  const body = buildBody(fragmentType, { rng, seq, node, nodeId, masterShard, state });
  const title = pick(rng, COMMIT_MESSAGES).toUpperCase();

  return {
    seq,
    nodeId,
    nodeName: node.name,
    fragmentType,
    title,
    body,
    masterShard,
    isRedHerring: node.tone === "fake" || fragmentType === "red_herring",
  };
}

function pickFragmentType(tone, rng) {
  const pools = {
    entry: ["bbs_log", "modem_artifact", "path_marker", "cipher_piece"],
    tech: ["modem_artifact", "cipher_piece", "hex_dump", "path_marker"],
    bbs: ["bbs_log", "cipher_piece", "ascii_sigil", "path_marker"],
    geo: ["coordinates", "path_marker", "cipher_piece", "red_herring"],
    horror: ["memory", "ascii_sigil", "cipher_piece", "path_marker"],
    archive: ["hex_dump", "bbs_log", "memory", "cipher_piece"],
    phone: ["phone_trace", "bbs_log", "red_herring", "path_marker"],
    mystery: ["memory", "cipher_piece", "path_marker", "coordinates"],
    void: ["hex_dump", "memory", "ascii_sigil", "cipher_piece"],
    core: ["master_reveal", "cipher_piece", "path_marker", "memory"],
    fake: ["red_herring", "red_herring", "coordinates"],
  };
  return pick(rng, pools[tone] ?? pools.entry);
}

function buildBody(type, ctx) {
  const { rng, seq, node, nodeId, masterShard, state } = ctx;
  const key = `MAZE${state.dayNumber}${nodeId.slice(0, 3).toUpperCase()}`;

  switch (type) {
    case "bbs_log":
      return bbsLog(rng, node, masterShard);
    case "modem_artifact":
      return modemArtifact(rng, seq);
    case "cipher_piece":
      return cipherPiece(rng, masterShard, key, seq);
    case "path_marker":
      return pathMarker(rng, node, nodeId, state);
    case "coordinates":
      return coordinates(rng, masterShard, seq);
    case "hex_dump":
      return hexDump(masterShard, seq);
    case "memory":
      return memory(rng, node);
    case "ascii_sigil":
      return asciiSigil(rng, seq);
    case "phone_trace":
      return phoneTrace(rng);
    case "red_herring":
      return redHerring(rng);
    case "master_reveal":
      return masterReveal(masterShard, seq, state);
    default:
      return cipherPiece(rng, masterShard, key, seq);
  }
}

function bbsLog(rng, node, shard) {
  const user = pick(rng, BBS_USERS);
  const lines = [
    `CONNECT 14400 ARQ`,
    `LOGIN: ${user}`,
    `PASS: ********`,
    `LAST CALL: 1994-11-03 02:17:44`,
    `BOARD: ${node.name}`,
    ``,
    `> ${shard.split(" ").slice(0, 4).join(" ")}...`,
    `> [TRANSMISSION TRUNCATED]`,
    `> CARRIER LOST`,
  ];
  return formatCipherBlock("BBS SESSION // PARTIAL RECOVERY", lines.join("\n"));
}

function modemArtifact(rng, seq) {
  const cmds = modemAscii();
  const noise = Array.from({ length: 4 }, () =>
    pick(rng, ["▓", "░", "▒", "█", "~", "#"])
  ).join("");
  return [
    "```",
    cmds.join("\n"),
    `SEQ=${seq} // SCRAMBLE=${noise}`,
    "LISTEN BETWEEN THE TONES",
    "```",
  ].join("\n");
}

function cipherPiece(rng, shard, key, seq) {
  const method = pick(rng, ["rot13", "vigenere", "caesar", "hex"]);
  let encoded;
  let hint;
  switch (method) {
    case "rot13":
      encoded = rot13(shard);
      hint = "CLASSIC. THEY ALL USED IT. THEY THOUGHT NO ONE WOULD LOOK.";
      break;
    case "vigenere":
      encoded = vigenereEncode(shard, key);
      hint = `KEY MATERIAL: ${key.slice(0, 8)}... (INCOMPLETE)`;
      break;
    case "caesar":
      encoded = caesar(shard, 3 + (seq % 7));
      hint = `SHIFT VARIANCE DETECTED (+${3 + (seq % 7)})`;
      break;
    default:
      encoded = toHex(shard);
      hint = "RAW HEX FROM THE ARCHIVE PIT";
  }
  return [
    formatCipherBlock(`${method.toUpperCase()} // FRAGMENT ${seq}`, encoded),
    "",
    `> ${hint}`,
  ].join("\n");
}

function pathMarker(rng, node, nodeId, state) {
  const exits = node.exits.map((e) => `- \`${e}\` — ${MAZE[e]?.name ?? e}`);
  const crumbs = state.pathTaken.slice(-5).map((n) => n).join(" → ");
  return [
    "## PATH MARKER",
    "",
    `YOU ARE IN: **${node.name}** (\`${nodeId}\`)`,
    "",
    "EXITS (UNVERIFIED):",
    ...exits,
    "",
    "RECENT TRAIL:",
    "```",
    crumbs || nodeId,
    "```",
    "",
    pick(rng, [
      "THE MAZE REMembers WHERE YOU HAVE BEEN.",
      "DO NOT BACKTRACK. THE GATE MOVES.",
      "SEVEN STEPS FORWARD. ONE STEP SIDEWAYS.",
      "THE OPERATOR WALKED THIS PATH ONCE.",
    ]),
  ].join("\n");
}

function coordinates(rng, shard, seq) {
  const coord = fakeCoords(rng);
  const alt = fakeCoords(rng);
  return [
    "## COORDINATE SLIP",
    "",
    `PRIMARY: \`${coord}\`  // confidence: LOW`,
    `SHADOW:  \`${alt}\`  // confidence: NONE`,
    "",
    `NOTE: Only one of these intersects fragment ${seq}.`,
    "",
    formatCipherBlock("GROUND TRUTH (ENCRYPTED)", toHex(shard.slice(0, 20))),
  ].join("\n");
}

function hexDump(shard, seq) {
  const hex = toHex(shard);
  const lines = hex.match(/.{1,32}/g) ?? [hex];
  return [
    formatCipherBlock(`HEX DUMP // OFFSET ${(seq * 16).toString(16).toUpperCase()}`, lines.join("\n")),
    "",
    "*some bytes smell like copper*",
  ].join("\n");
}

function memory(rng, node) {
  const memories = [
    "The operator said the maze would outlive the building. The building is gone.",
    "There was a hum. Not from the machine. From behind the machine.",
    "Guest accounts don't expire here. Guest_0 has been online since November.",
    "They found a body in the server room. They also found the server still running.",
    "The welcome message changed itself. No one with sysop access admitted it.",
    "Seven people entered the catacomb. The log shows eight logins.",
  ];
  return [
    "## RECOVERED MEMORY",
    "",
    `LOCATION: ${node.name}`,
    "",
    `> ${pick(rng, memories)}`,
    "",
    "```",
    "END OF LINE.",
    "```",
  ].join("\n");
}

function asciiSigil(rng, seq) {
  const sigils = [
    "    /\\_/\\   ",
    "   ( o.o )  ",
    "    > ^ <   ",
    "  NODE OPEN",
    "    /\\\\",
    "   /  \\\\",
    "  | ?? |",
    "   \\\\  /",
    "    \\\\/",
  ];
  return [
    "```",
    ...sigils,
    `MARKER ${seq}`,
    "```",
    "",
    "THE SIGIL REPEATS ON EVERY SEVENTH COMMIT. COUNT THEM.",
  ].join("\n");
}

function phoneTrace(rng) {
  return [
    "## PHONE TREE TRACE",
    "",
    `CALLER ID: ${fakePhone(rng)}`,
    `DURATION: ${120 + Math.floor(rng() * 400)}s`,
    `STATUS: STILL CONNECTED`,
    "",
    "> Press 1 if you remember.",
    "> Press 2 if you want to forget.",
    "> Press 7 if you know about the catacomb.",
    "> [NO OPTION FOR HANG UP]",
  ].join("\n");
}

function redHerring(rng) {
  const lies = [
    "CONGRATULATIONS. YOU FOUND THE END. STOP READING.",
    "THE MAZE IS A HOAX. GO OUTSIDE.",
    "SYSOP HERE. EVERYTHING IS FINE. DELETE THIS FOLDER.",
    "FINAL ANSWER: RUSHIFY. (THIS IS WRONG ON PURPOSE.)",
    "ALL FRAGMENTS DECODE TO 'HELLO WORLD'.",
  ];
  return [
    "## ⚠ UNVERIFIED TRANSMISSION",
    "",
    `> ${pick(rng, lies)}`,
    "",
    "*trust nothing that ends too cleanly*",
  ].join("\n");
}

function masterReveal(shard, seq, state) {
  return [
    "## ROOT NODE LEAK",
    "",
    `FRAGMENT ${seq} OF ∞`,
    `DAY ${state.dayNumber}`,
    "",
    formatCipherBlock("PLAINTEXT SHARD (RARE)", shard),
    "",
    "THE OPERATOR LEFT THE CONSOLE OPEN.",
    "THIS SHOULD NOT HAVE COMMITTED.",
  ].join("\n");
}

export function commitMessage(fragment) {
  const prefix = fragment.isRedHerring ? "?" : "maze";
  return `${prefix}: ${fragment.title.toLowerCase()} [${fragment.nodeId}] #${fragment.seq}`;
}

export function renderFragmentMarkdown(fragment, state) {
  const now = new Date().toISOString();
  return [
    "---",
    `id: frag-${String(fragment.seq).padStart(4, "0")}`,
    `sequence: ${fragment.seq}`,
    `day: ${state.dayNumber}`,
    `node: ${fragment.nodeId}`,
    `type: ${fragment.fragmentType}`,
    `red_herring: ${fragment.isRedHerring}`,
    `committed_at: ${now}`,
    "---",
    "",
    `# ${fragment.nodeName}`,
    "",
    fragment.body,
    "",
    "---",
    "",
    `*fragment ${fragment.seq} · day ${state.dayNumber} · node \`${fragment.nodeId}\`*`,
    "",
  ].join("\n");
}

export { COMMIT_MESSAGES };
