// ===== sweep-lib.mjs — paths/consts do pipeline de varredura (PRD2 §6.1) =====
import path from "node:path";
import { fileURLToPath } from "node:url";
import { mkdirSync } from "node:fs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
export const ROOT = path.resolve(HERE, "..", "..");
export const SWEEP_DIR = path.join(ROOT, ".opencode", "work", "sweep");

export function ensureSweepDirs() {
  for (const d of [
    SWEEP_DIR,
    path.join(SWEEP_DIR, "raw"),
    path.join(SWEEP_DIR, "extracted"),
    path.join(SWEEP_DIR, "lots"),
  ])
    mkdirSync(d, { recursive: true });
}

export function SWEEP_FILE() {
  ensureSweepDirs();
  return path.join(SWEEP_DIR, "sources-sweep.json");
}
export function RAW_DIR() {
  ensureSweepDirs();
  return path.join(SWEEP_DIR, "raw");
}
export function EXTRACTED_DIR() {
  ensureSweepDirs();
  return path.join(SWEEP_DIR, "extracted");
}
export function LOTS_DIR() {
  ensureSweepDirs();
  return path.join(SWEEP_DIR, "lots");
}
export function CORROBORATION_FILE() {
  ensureSweepDirs();
  return path.join(SWEEP_DIR, "corroboration.json");
}
export function REVIEW_FILE() {
  ensureSweepDirs();
  return path.join(SWEEP_DIR, "review.json");
}
export function BASELINE_FILE() {
  ensureSweepDirs();
  return path.join(SWEEP_DIR, "baseline.json");
}

// Tiers do PRD2 §2.3/§2.4
export const TIERS = {
  verificada: { min: 80, weight: 1.0 },
  corroborada: { min: 65, weight: 0.95 },
  comunitaria: { min: 50, weight: 0.85 },
  reprovada: { min: 0, weight: 0 },
};

// Caminhos de autenticidade obrigatórios por item novo (PRD2 §1.4)
export const EVIDENCE_KINDS = ["corroboration", "exam-mention", "editorial", "official"];
