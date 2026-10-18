// ===== integrate — grava src/data/pte/<tipo>.json + aliases.json (PRD §6.3 passo 7) =====
// Uso: node scripts/bank/integrate.mjs <tipo>
import { TASK_TYPES, WORK, OUT, ROOT, readJson, writeJson, ensureDirs } from "./lib.mjs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const type = process.argv[2];
if (!TASK_TYPES.includes(type)) {
  console.error(`tipo inválido: ${type}`);
  process.exit(2);
}
ensureDirs();

const deduped = readJson(path.join(WORK, "deduped", `${type}.json`), null);
if (!Array.isArray(deduped)) {
  console.error("rode dedupe primeiro");
  process.exit(1);
}

const items = deduped.map(({ __aliasOf, ...q }) => q);
writeJson(path.join(OUT, `${type}.json`), items);

// aliases
const aliasesPath = path.join(ROOT, "src", "data", "aliases.json");
const aliasesNew = readJson(path.join(WORK, "aliases-new.json"), {});
const aliases = readJson(aliasesPath, {});
for (const [from, to] of Object.entries(aliasesNew)) aliases[from] = to;
writeJson(aliasesPath, aliases);

execFileSync("node", [path.join(ROOT, "scripts", "bank", "build-manifest.mjs")], {
  stdio: "inherit",
});
console.log(`${type}: ${items.length} integrados em src/data/pte/${type}.json`);
