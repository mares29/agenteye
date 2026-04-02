// =============================================================================
// Chrome Storage Adapter
// =============================================================================

import type { Annotation } from "./types";

const STORAGE_KEY_PREFIX = "agenteye:";
const ANNOTATIONS_KEY = `${STORAGE_KEY_PREFIX}annotations`;
const SETTINGS_KEY = `${STORAGE_KEY_PREFIX}settings`;
const RETENTION_DAYS = 7;

function isExtensionContext(): boolean {
  return typeof chrome !== "undefined" && !!chrome.storage?.local;
}

// =============================================================================
// Annotations
// =============================================================================

export async function loadAnnotations(pathname: string): Promise<Annotation[]> {
  const key = `${ANNOTATIONS_KEY}:${pathname}`;

  if (isExtensionContext()) {
    const result = await chrome.storage.local.get(key);
    const annotations: Annotation[] = result[key] ?? [];
    return filterExpired(annotations);
  }

  // Fallback to localStorage for testing / non-extension contexts
  try {
    const raw = localStorage.getItem(key);
    return raw ? filterExpired(JSON.parse(raw)) : [];
  } catch {
    return [];
  }
}

export async function saveAnnotations(
  pathname: string,
  annotations: Annotation[],
): Promise<void> {
  const key = `${ANNOTATIONS_KEY}:${pathname}`;

  if (isExtensionContext()) {
    await chrome.storage.local.set({ [key]: annotations });
    return;
  }

  try {
    localStorage.setItem(key, JSON.stringify(annotations));
  } catch {
    // Storage full or disabled
  }
}

export async function clearAnnotations(pathname: string): Promise<void> {
  const key = `${ANNOTATIONS_KEY}:${pathname}`;

  if (isExtensionContext()) {
    await chrome.storage.local.remove(key);
    return;
  }

  try {
    localStorage.removeItem(key);
  } catch {
    // Ignore
  }
}

// =============================================================================
// Settings
// =============================================================================

export async function loadSettings<T extends Record<string, unknown>>(
  defaults: T,
): Promise<T> {
  if (isExtensionContext()) {
    const result = await chrome.storage.local.get(SETTINGS_KEY);
    return { ...defaults, ...(result[SETTINGS_KEY] ?? {}) };
  }

  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    return raw ? { ...defaults, ...JSON.parse(raw) } : defaults;
  } catch {
    return defaults;
  }
}

export async function saveSettings(
  settings: Record<string, unknown>,
): Promise<void> {
  if (isExtensionContext()) {
    await chrome.storage.local.set({ [SETTINGS_KEY]: settings });
    return;
  }

  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    // Storage full or disabled
  }
}

// =============================================================================
// Helpers
// =============================================================================

function filterExpired(annotations: Annotation[]): Annotation[] {
  const cutoff = Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000;
  return annotations.filter((a) => a.timestamp > cutoff);
}
