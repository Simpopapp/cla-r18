// Store global do estado do aluno — PRD §7.3, C2.
// `useSyncExternalStore` com snapshot de servidor = estado vazio idêntico ao
// 1º render do cliente; a hidratação (leitura do localStorage) ocorre em efeito.
// Versão futura do estado = somente leitura: nenhuma mutação grava (D8).

import { useEffect, useSyncExternalStore } from "react";
import {
  EMPTY_STATE,
  flushWrites,
  isPersistFailed,
  load,
  onPersistError,
  requestPersistentStorage,
  schedulePersist,
} from "@/lib/storage";
import type { AppState, LoadStatus } from "@/lib/storage";

let state: AppState = EMPTY_STATE;
let hydrated = false;
let status: LoadStatus = "empty";
let raw: string | null = null;
let flushListenersBound = false;

const listeners = new Set<() => void>();

function notify(): void {
  for (const listener of listeners) listener();
  for (const listener of statusListeners) listener();
}

function bindFlushListeners(): void {
  if (flushListenersBound || typeof window === "undefined") return;
  flushListenersBound = true;
  window.addEventListener("pagehide", flushWrites);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") flushWrites();
  });
}

/** Lê o localStorage uma única vez, por sessão de página. */
export function hydrateAppState(): void {
  if (hydrated) return;
  hydrated = true;
  bindFlushListeners();
  const loaded = load();
  state = loaded.state;
  status = loaded.status;
  raw = loaded.raw;
  notify();
}

/**
 * Aplica uma mutação pura e agenda a gravação coalescida.
 * No-op antes da hidratação e no modo somente-leitura (versão futura).
 */
export function mutateAppState(mutate: (state: AppState) => AppState): void {
  if (!hydrated || status === "future") return;
  const next = mutate(state);
  if (next === state) return;
  state = next;
  schedulePersist(next);
  notify();
  void requestPersistentStorage();
}

export function getAppState(): AppState {
  return state;
}

export function getAppStatus(): LoadStatus {
  return status;
}

export function isStateReadonly(): boolean {
  return status === "future";
}

/** Payload bruto preservado (quarentena/versão futura) para diagnóstico. */
export function getPreservedRaw(): string | null {
  return raw;
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getClientSnapshot(): AppState {
  return state;
}

function getServerSnapshot(): AppState {
  return EMPTY_STATE;
}

export function useAppState(): AppState {
  useEffect(() => {
    hydrateAppState();
  }, []);
  return useSyncExternalStore(subscribe, getClientSnapshot, getServerSnapshot);
}

function getHydrated(): boolean {
  return hydrated;
}

function getServerHydrated(): boolean {
  return false;
}

/** true após a primeira leitura do localStorage — antes disso o estado é o vazio. */
export function useAppHydrated(): boolean {
  useEffect(() => {
    hydrateAppState();
  }, []);
  return useSyncExternalStore(subscribe, getHydrated, getServerHydrated);
}

export function usePersistFailed(): boolean {
  return useSyncExternalStore(subscribePersistError, isPersistFailed, () => false);
}

export function useAppStateStatus(): LoadStatus {
  useEffect(() => {
    hydrateAppState();
  }, []);
  return useSyncExternalStore(subscribeStatus, getStatus, getServerStatus);
}

const statusListeners = new Set<() => void>();

function subscribePersistError(listener: () => void): () => void {
  const off = onPersistError(listener);
  return off;
}

function subscribeStatus(listener: () => void): () => void {
  statusListeners.add(listener);
  return () => {
    statusListeners.delete(listener);
  };
}

function getStatus(): LoadStatus {
  return status;
}

function getServerStatus(): LoadStatus {
  return "empty";
}
