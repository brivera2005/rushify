/** Deterministic PRNG from seed string (mulberry32). */
export function seededRandom(seed) {
  let h = 1779033703;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(h ^ seed.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return function next() {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    h ^= h >>> 16;
    return (h >>> 0) / 4294967296;
  };
}

export function pick(rng, arr) {
  return arr[Math.floor(rng() * arr.length)];
}

export function rot13(text) {
  return text.replace(/[a-zA-Z]/g, (c) => {
    const base = c <= "Z" ? 65 : 97;
    return String.fromCharCode(((c.charCodeAt(0) - base + 13) % 26) + base);
  });
}

export function toHex(text) {
  return Buffer.from(text, "utf8").toString("hex").toUpperCase();
}

export function fromHex(hex) {
  return Buffer.from(hex.replace(/\s/g, ""), "hex").toString("utf8");
}

export function vigenereEncode(text, key) {
  const clean = text.toUpperCase().replace(/[^A-Z]/g, "");
  const k = key.toUpperCase().replace(/[^A-Z]/g, "");
  let out = "";
  for (let i = 0; i < clean.length; i++) {
    const p = clean.charCodeAt(i) - 65;
    const s = k.charCodeAt(i % k.length) - 65;
    out += String.fromCharCode(((p + s) % 26) + 65);
  }
  return out;
}

export function caesar(text, shift) {
  return text.replace(/[a-zA-Z]/g, (c) => {
    const base = c <= "Z" ? 65 : 97;
    return String.fromCharCode(((c.charCodeAt(0) - base + shift + 26) % 26) + base);
  });
}

export function fakeCoords(rng) {
  const lat = (30 + rng() * 20).toFixed(6);
  const lon = (-120 + rng() * 40).toFixed(6);
  return `${lat}, ${lon}`;
}

export function fakePhone(rng) {
  const area = 200 + Math.floor(rng() * 800);
  const mid = 200 + Math.floor(rng() * 800);
  const last = 1000 + Math.floor(rng() * 9000);
  return `(${area}) ${mid}-${last}`;
}

export function modemAscii() {
  return [
    "ATDT",
    "CONNECT 14400/ARQ/V42bis/LAPM",
    "NO CARRIER",
    "+++ATH0",
  ];
}

export function formatCipherBlock(label, payload) {
  return `\`\`\`\n[${label}]\n${payload}\n\`\`\``;
}
