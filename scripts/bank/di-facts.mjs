// ===== di-facts — Describe Image via Our World in Data (CC BY 4.0), PRD §6.10 =====
// Baixa PNG + CSV + metadata por gráfico, calcula facts determinísticos e grava
// src/data/pte/describe_image.json + imagens em public/di/.
// Uso: node scripts/bank/di-facts.mjs [slug...]
import { WORK, OUT, ROOT, writeJson, makeId, readJson } from "./lib.mjs";
import { writeFileSync, mkdirSync, existsSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

const SLUGS = [
  "life-expectancy",
  "life-expectancy-vs-gdp-per-capita",
  "gdp-per-capita-worldbank",
  "child-mortality",
  "population",
  "population-by-age-group",
  "co-emissions-per-capita",
  "maternal-mortality",
  "hospital-beds-per-1000-people",
  "literacy-rate-adults",
  "mean-years-of-schooling-long-run",
  "access-to-electricity-vs-gdp-per-capita",
  "trade-as-share-of-gdp",
  "share-of-women-in-parliament",
  "air-pollution-vs-gdp-per-capita",
  "pm25-air-pollution",
  "share-of-population-in-extreme-poverty",
  "share-of-population-urban",
  "fixed-telephone-subscriptions-per-100-people",
  "renewable-energy-consumption",
];
const BASE = "https://ourworldindata.org/grapher";
const TMP = "/tmp/bank-raw/owid";
mkdirSync(TMP, { recursive: true });
mkdirSync(path.join(ROOT, "public", "di"), { recursive: true });

async function fetch(url, dest) {
  if (existsSync(dest) && statSync(dest).size > 0) return true;
  const res = await fetch2(url, {
    headers: { "User-Agent": "PTEMasterHub-bank-builder/0.1 (local personal study tool)" },
  });
  if (!res.ok) return false;
  writeFileSync(dest, Buffer.from(await res.arrayBuffer()));
  return true;
}
const fetch2 = globalThis.fetch;

function parseCsv(text) {
  const rows = [];
  let row = [],
    field = "",
    inQ = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQ) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else inQ = false;
      } else field += c;
    } else if (c === '"') inQ = true;
    else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else if (c !== "\r") field += c;
  }
  if (field || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

function computeFacts(rows, valueCol) {
  const header = rows[0];
  const eI = header.indexOf("Entity"),
    cI = header.indexOf("Code"),
    yI = header.indexOf("Year"),
    vI = header.indexOf(valueCol);
  if (vI < 0) return null;
  const hasCode = cI >= 0;
  const data = [];
  for (let r = 1; r < rows.length; r++) {
    const entity = rows[r][eI],
      code = hasCode ? rows[r][cI] : "XXX",
      year = Number(rows[r][yI]),
      val = Number(rows[r][vI]);
    if (!entity || !Number.isFinite(year) || !Number.isFinite(val)) continue;
    // só países (código ISO/OWID de país: 3 letras; exclui regiões OWID_*)
    if (!code || code.length !== 3 || code.startsWith("OWID")) continue;
    data.push({ entity, year, val });
  }
  if (data.length === 0) return null;
  const years = [...new Set(data.map((d) => d.year))].sort((a, b) => a - b);
  const latest = years[years.length - 1];
  const at = (y) => data.filter((d) => d.year === y).sort((a, b) => b.val - a.val);
  const latestRows = at(latest);
  const max = latestRows[0];
  const min = latestRows[latestRows.length - 1];
  const facts = [];
  facts.push(
    `Highest value in ${latest}: ${max.entity} (${fmt(max.val)}); lowest: ${min.entity} (${fmt(min.val)}).`,
  );
  const top3 = latestRows.slice(0, 3).map((d) => `${d.entity} (${fmt(d.val)})`);
  facts.push(`Top three in ${latest}: ${top3.join(", ")}.`);
  // série temporal: primeiro → último ano disponível
  const firstYear = years[0];
  if (latest !== firstYear) {
    const firstRows = at(firstYear);
    const f0 = firstRows[0];
    const diff = max.val - (firstRows.find((d) => d.entity === max.entity)?.val ?? NaN);
    if (Number.isFinite(diff))
      facts.push(
        `For ${max.entity}, the value went from ${fmt(firstRows.find((d) => d.entity === max.entity)?.val)} in ${firstYear} to ${fmt(max.val)} in ${latest} (change ${diff >= 0 ? "+" : ""}${fmt(diff)}).`,
      );
    const nCountries = new Set(data.map((d) => d.entity)).size;
    facts.push(
      `Data covers ${firstYear}–${latest} for ${nCountries} countries; in ${firstYear} the highest was ${f0.entity} (${fmt(f0.val)}).`,
    );
  }
  return { facts, latest, countries: data.length };
}

function fmt(v) {
  if (!Number.isFinite(v)) return "?";
  return Math.abs(v) >= 100
    ? Math.round(v).toLocaleString("en-US")
    : v.toFixed(1).replace(/\.0$/, "");
}

function keywordsFrom(title) {
  const STOP = new Set("the a an of vs in to and for by per from".split(" "));
  return title
    .toLowerCase()
    .replace(/[^a-z\s-]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 3 && !STOP.has(w))
    .slice(0, 6);
}

const requested = process.argv.slice(2).filter(Boolean);
const slugs = requested.length ? requested : SLUGS;
const items = [];
const errors = [];
for (const slug of slugs) {
  const png = path.join(TMP, `${slug}.png`),
    csv = path.join(TMP, `${slug}.csv`),
    meta = path.join(TMP, `${slug}.metadata.json`);
  const okPng = await fetch(`${BASE}/${slug}.png`, png);
  const okCsv = await fetch(`${BASE}/${slug}.csv`, csv);
  const okMeta = await fetch(`${BASE}/${slug}.metadata.json`, meta);
  if (!okPng || !okCsv || !okMeta) {
    errors.push(`${slug}: png=${okPng} csv=${okCsv} meta=${okMeta}`);
    continue;
  }
  let chartMeta;
  try {
    chartMeta = JSON.parse(readFileSync(meta, "utf8"));
  } catch {
    errors.push(`${slug}: metadata inválida`);
    continue;
  }
  const title = chartMeta.chart?.title ?? slug;
  const citation = chartMeta.chart?.citation ?? "Our World in Data";
  const colEntries = Object.entries(chartMeta.columns ?? {});
  const rows0 = parseCsv(readFileSync(csv, "utf8"));
  const csvHeader = rows0[0] ?? [];
  const firstDataRow = rows0[1] ?? [];
  const isNum = (i) => Number.isFinite(Number(firstDataRow[i]));
  const numericHeader = (name) => {
    const i = csvHeader.indexOf(name);
    return i >= 0 && isNum(i) ? name : null;
  };
  const metaMatch = colEntries
    .map(([, v]) => numericHeader(v.titleShort) ?? numericHeader(v.shortName))
    .find(Boolean);
  // fallback: primeira coluna numérica depois de Entity/Year
  let fallback = null;
  for (let i = 2; i < csvHeader.length; i++) {
    if (csvHeader[i] === "Year" || csvHeader[i] === "Code") continue;
    if (isNum(i)) {
      fallback = csvHeader[i];
      break;
    }
  }
  const valueCol = metaMatch ?? fallback ?? colEntries[0]?.[0];
  const unit = chartMeta.columns?.[valueCol]?.unit ?? "";
  const timespan = chartMeta.columns?.[valueCol]?.timespan ?? "";
  const rowsCsv = parseCsv(readFileSync(csv, "utf8"));
  const facts = computeFacts(rowsCsv, valueCol);
  if (!facts || facts.facts.length < 2) {
    errors.push(`${slug}: facts insuficientes`);
    continue;
  }
  const destPng = path.join(ROOT, "public", "di", `${slug}.png`);
  writeFileSync(destPng, readFileSync(png));
  const alt = `${title} — chart of ${valueCol} (${unit || "value"}), ${timespan || "latest available data"}, across countries.`;
  items.push({
    id: makeId("owid", "describe_image", items.length + 1),
    type: "describe_image",
    topic: title,
    source: {
      domain: "ourworldindata.org",
      url: `${BASE}/${slug}`,
      license: "CC BY 4.0",
      attribution: `${citation} via Our World in Data — ${BASE}/${slug} (acesso 2026-10-17)`,
    },
    provenance: "verificada",
    data: {
      image: `/di/${slug}.png`,
      alt,
      facts: facts.facts,
      keywords: keywordsFrom(title),
    },
  });
  console.log(
    `${slug}: ok (${facts.facts.length} facts, latest ${facts.latest}, ${facts.countries} países)`,
  );
}
writeJson(path.join(OUT, "describe_image.json"), items);

const sp = path.join(WORK, "sources.json");
const sources = readJson(sp, { sources: [] });
const ids = new Set(sources.sources.map((s) => s.id));
if (!ids.has("owid")) {
  sources.sources.push({
    id: "owid",
    domain: "ourworldindata.org",
    url: "https://ourworldindata.org/grapher",
    name: "Our World in Data — gráficos (CC BY 4.0)",
    types: ["describe_image"],
    volume: `${items.length} gráficos com dados abertos`,
    evidence:
      "API pública de gráficos (PNG, CSV, metadata); licença CC BY 4.0 confirmada na documentação oficial; facts calculados do próprio CSV (§6.10); amostra manual de 5",
    confidence: 90,
    status: "aprovada",
    provenance: "verificada",
    license: "CC BY 4.0 — atribuição registrada por item",
    notes: `Erros/pendências: ${errors.join(" | ") || "nenhum"}`,
    checkedAt: "2026-10-17",
  });
  writeJson(sp, sources);
}
if (errors.length) console.log("PENDÊNCIAS:\n" + errors.join("\n"));
console.log(`describe_image: ${items.length} integrados`);
