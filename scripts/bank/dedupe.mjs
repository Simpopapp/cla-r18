// ===== dedupe — exata + quase (PRD §6.4) =====
// Uso: node scripts/bank/dedupe.mjs <tipo>
// Lê todos os arquivos brutos declarados no sources.json do tipo, une, deduplica e grava
// .opencode/work/bank/deduped/<tipo>.json + aliases.json parcial.
import {
  TASK_TYPES,
  WORK,
  OUT,
  readJson,
  writeJson,
  dedupeKey,
  dedupeTokens,
  jaccard,
  diceTrigram,
  tokens,
  normalizeText,
  NEAR_THRESHOLD,
  ensureDirs,
} from "./lib.mjs";
import path from "node:path";

export function dedupeList(items, type, existing = []) {
  // vence maior proveniência (verificada > comunitaria); empate: item mais antigo (ordem de entrada)
  const rank = (q) => (q.provenance === "verificada" ? 1 : 0);
  const all = [...existing, ...items];
  const byKey = new Map();
  for (const q of all) {
    const key = dedupeKey(type, q);
    if (!key) continue;
    const prev = byKey.get(key);
    if (!prev || rank(q) > rank(prev)) {
      if (prev) q.__aliasOf = prev.__aliasOf ?? prev.id;
      byKey.set(key, q);
    } else if (prev) {
      q.__aliasOf = prev.__aliasOf ?? prev.id;
    }
  }
  const kept = [...byKey.values()];

  // quase-duplicatas: prefixo normalizado de 200 chars igual OU max(Jaccard, Dice) ≥ 0,85
  const buckets = new Map();
  for (const q of kept) {
    const pre = normalizeText(dedupeKey(type, q)).slice(0, 200);
    const arr = buckets.get(pre) ?? [];
    arr.push(q);
    buckets.set(pre, arr);
  }
  const discarded = [];
  const final = [];
  for (const arr of buckets.values()) {
    arr.sort((a, b) => rank(b) - rank(a));
    for (let i = 0; i < arr.length; i++) {
      const q = arr[i];
      let dup = false;
      for (const k of final) {
        const sim = Math.max(
          jaccard(dedupeTokens(type, q), dedupeTokens(type, k)),
          diceTrigram(dedupeTokens(type, q), dedupeTokens(type, k)),
        );
        if (sim >= NEAR_THRESHOLD) {
          dup = true;
          break;
        }
      }
      if (dup) {
        q.__aliasOf = q.__aliasOf ?? findAlias(type, q, final);
        discarded.push(q);
      } else final.push(q);
    }
  }
  return { kept: final, discarded };
}

function findAlias(type, q, final) {
  const tq = dedupeTokens("", q) ?? tokens(dedupeKey("", q));
  let best = null,
    bestSim = 0;
  for (const k of final) {
    const sim = Math.max(
      jaccard(dedupeTokens("", q), dedupeTokens("", k)),
      diceTrigram(dedupeTokens("", q), dedupeTokens("", k)),
    );
    if (sim > bestSim) {
      bestSim = sim;
      best = k;
    }
  }
  return best?.id ?? null;
}

// CLI
const isMain = process.argv[1] && process.argv[1].endsWith("dedupe.mjs");
if (isMain) {
  ensureDirs();
  const type = process.argv[2];
  if (!TASK_TYPES.includes(type)) {
    console.error(`tipo inválido: ${type}`);
    process.exit(2);
  }
  const sources = readJson(path.join(WORK, "sources.json"), { sources: [] }).sources.filter(
    (s) => s.types?.includes(type) && s.status === "aprovada",
  );
  const extracted = readJson(path.join(WORK, "extracted", `${type}.json`), []);
  const existing = readJson(path.join(OUT, `${type}.json`), []);
  const { kept, discarded } = dedupeList(extracted, type, existing);
  writeJson(path.join(WORK, "deduped", `${type}.json`), kept);
  const aliases = readJson(path.join(OUT, "..", "aliases.json") ?? "", {});
  const aliasMap = {};
  for (const d of discarded) if (d.__aliasOf) aliasMap[d.id] = d.__aliasOf;
  writeJson(path.join(WORK, "aliases-new.json"), {
    ...readJson(path.join(WORK, "aliases-new.json"), {}),
    ...aliasMap,
  });
  console.log(
    `${type}: entrada ${existing.length + extracted.length} → mantidas ${kept.length} · descartadas ${discarded.length}`,
  );
}
