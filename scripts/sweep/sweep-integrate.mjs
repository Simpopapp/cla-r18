// ===== sweep-integrate.mjs — grava src/data/pte/<tipo>.json + aliases + manifest (Fase 2+) =====
// Dev-time only. Entrada: arquivo validado (saída do sweep-validate + dedupe ok):
//   node scripts/sweep/sweep-integrate.mjs <validated.json>
// Regras (PRD2 §4, §7): dedupe OBRIGATÓRIO antes (sweep-dedupe --candidates);
// ids novos <fonte>-<tipo>-NNN; aliases para matches; build-manifest ao final.
import { existsSync } from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { OUT, TASK_TYPES, makeId, sha1, dedupeKey, readJson, writeJson } from "../bank/lib.mjs";

const file = process.argv[2];
if (!file) {
  console.error("usage: sweep-integrate.mjs <validated.json>");
  process.exit(1);
}

const { valid: items } = readJson(file, { valid: [] });
if (items.length === 0) {
  console.log("nothing to integrate");
  process.exit(0);
}

const aliases = readJson(path.join(OUT, "..", "aliases.json"), {});
const integrated = { added: 0, aliased: 0 };
const byType = new Map();
for (const it of items) {
  if (!byType.has(it.type)) byType.set(it.type, []);
  byType.get(it.type).push(it);
}
for (const [type, group] of byType) {
  const dest = path.join(OUT, `${type}.json`);
  const arr = existsSync(dest) ? readJson(dest, []) : [];
  const existingKeys = new Set(arr.map((q) => sha1(dedupeKey(type, q))));
  for (const it of group) {
    const key = sha1(dedupeKey(type, it));
    if (existingKeys.has(key)) continue; // segurança dupla; dedupe oficial roda antes
    const id = makeId(it.source.id, type, arr.length + 1);
    arr.push({
      id,
      type,
      source: it.source,
      provenance: it.provenance,
      evidenceSummary: it.evidenceSummary ?? null,
      data: it.data,
    });
    if (it.aliasOf) {
      aliases[id] = it.aliasOf;
      integrated.aliased++;
    }
    existingKeys.add(key);
    integrated.added++;
  }
  writeJson(dest, arr);
}
// Manifesto sempre derivado (PRD2 §7.2)
execFileSync("node", [path.join(OUT, "..", "..", "..", "scripts", "bank", "build-manifest.mjs")], {
  stdio: "inherit",
});
console.log(JSON.stringify(integrated, null, 1));
