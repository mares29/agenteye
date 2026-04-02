// =============================================================================
// Typed Event Emitter
// =============================================================================

type EventMap = Record<string, (...args: any[]) => void>;

export class Emitter<T extends EventMap> {
  private listeners = new Map<keyof T, Set<Function>>();

  on<K extends keyof T>(event: K, handler: T[K]): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(handler);
    return () => this.listeners.get(event)?.delete(handler);
  }

  emit<K extends keyof T>(event: K, ...args: Parameters<T[K]>): void {
    this.listeners.get(event)?.forEach((handler) => handler(...args));
  }

  removeAll(): void {
    this.listeners.clear();
  }
}
