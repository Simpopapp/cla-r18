// ===== sweep-fetch.mjs — download com cache (PRD2 §6.1, §6.4) =====
// Dev-time only. 1 req/s, UA identificado, cache por hash da URL em
// .opencode/work/sweep/raw/. Uso (Fase 1+):
//   node scripts/sweep/sweep-fetch.mjs <url> [<url> ...]
import { createHash } from "node:crypto";
import { writeFileSync, existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { RAW_DIR } from "./sweep-lib.mjs";
import { UA } from "../bank/lib.mjs";

const urls = process.argv.slice(2);
if (urls.length === 0) {
  console.error("usage: sweep-fetch.mjs <url> ...");
  process.exit(1);
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
for (const url of urls) {
  const name =
    createHash("sha1").update(url).digest("hex").slice(0, 16) +
      path.extname(new URL(url).pathname || ".html").slice(0, 8) || "index.html";
  const dest = path.join(RAW_DIR(), name || "index.html");
  if (existsSync(dest)) {
    console.log(`cache ${url} -> ${path.basename(dest)}`);
    continue;
  }
  try {
    const res = await fetch(url, { headers: { "user-agent": UA }, redirect: "follow" });
    if (!res.ok) {
      console.error(`HTTP ${res.status} ${url}`);
      continue;
    }
    const buf = Buffer.from(await res.arrayBuffer());
    writeFileSync(dest, buf);
    console.log(`saved ${url} -> ${path.basename(dest)} (${buf.length} bytes)`);
  } catch (e) {
    console.error(`fetch failed ${url}: ${String(e)}`);
  }
  await sleep(1000); // 1 req/s
}
