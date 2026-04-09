// =============================================================================
// AgentEye Engine
// =============================================================================

import { Emitter } from "./emitter";
import {
  loadAnnotations,
  saveAnnotations,
  clearAnnotations as clearStoredAnnotations,
  loadSettings,
  saveSettings,
} from "./storage";
import { generateOutput } from "./output";
import { requestAction } from "./sync";
import type {
  Annotation,
  AnnotationInput,
  ActionResponse,
  AgentEyeConfig,
  AgentEyeEvents,
  AgentEyeState,
  HoverInfo,
  OutputDetailLevel,
  PendingAnnotation,
} from "./types";

export type AgentEyeEngine = {
  getState(): AgentEyeState;

  // Commands
  activate(): void;
  deactivate(): void;
  addAnnotation(data: AnnotationInput): Annotation;
  updateAnnotation(id: string, data: Partial<Annotation>): void;
  deleteAnnotation(id: string): void;
  clearAnnotations(): void;
  setFrozen(frozen: boolean): void;
  setOutputDetail(level: OutputDetailLevel): void;
  setClearAfterCopy(enabled: boolean): void;
  setHoverColor(color: string): void;
  setHoverInfo(info: HoverInfo | null): void;
  setPendingAnnotation(pending: PendingAnnotation | null): void;
  generateOutput(): string;
  copyOutput(): Promise<void>;
  sendToAgent(): Promise<ActionResponse>;

  // Events
  on<K extends keyof AgentEyeEvents>(
    event: K,
    handler: AgentEyeEvents[K],
  ): () => void;

  // Lifecycle
  destroy(): void;
};

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function cloneState(state: AgentEyeState): AgentEyeState {
  return {
    ...state,
    annotations: state.annotations.map((a) => ({ ...a })),
    detectedFrameworks: [...state.detectedFrameworks],
  };
}

export function createAgentEye(config?: AgentEyeConfig): AgentEyeEngine {
  const emitter = new Emitter<AgentEyeEvents>();

  const state: AgentEyeState = {
    active: false,
    annotations: [],
    frozen: false,
    outputDetail: config?.outputDetail ?? "standard",
    clearAfterCopy: false,
    hoverColor: "#ffffff",
    hoverInfo: null,
    pendingAnnotation: null,
    syncStatus: "idle",
    sessionId: config?.sessionId ?? null,
    detectedFrameworks: [],
  };

  function emitStateChange(prev: AgentEyeState): void {
    emitter.emit("state:change", cloneState(state), prev);
  }

  // Load persisted annotations on creation
  const pathname =
    typeof window !== "undefined" ? window.location.pathname : "/";
  loadAnnotations(pathname)
    .then((stored) => {
      if (stored.length > 0) {
        const prev = cloneState(state);
        state.annotations = stored;
        emitStateChange(prev);
      }
    })
    .catch((err) =>
      console.error("[AgentEye] Failed to load annotations:", err),
    );

  // Load persisted settings on creation
  loadSettings({
    outputDetail: state.outputDetail,
    clearAfterCopy: state.clearAfterCopy,
    hoverColor: state.hoverColor,
  })
    .then((saved) => {
      const prev = cloneState(state);
      let changed = false;
      if (saved.outputDetail !== state.outputDetail) {
        state.outputDetail = saved.outputDetail;
        changed = true;
      }
      if (saved.clearAfterCopy !== state.clearAfterCopy) {
        state.clearAfterCopy = saved.clearAfterCopy;
        changed = true;
      }
      if (saved.hoverColor !== state.hoverColor) {
        state.hoverColor = saved.hoverColor;
        changed = true;
      }
      if (changed) emitStateChange(prev);
    })
    .catch((err) => console.error("[AgentEye] Failed to load settings:", err));

  function persist(): void {
    saveAnnotations(pathname, state.annotations);
  }

  function persistSettings(): void {
    saveSettings({
      outputDetail: state.outputDetail,
      clearAfterCopy: state.clearAfterCopy,
      hoverColor: state.hoverColor,
    });
  }

  const engine: AgentEyeEngine = {
    getState() {
      return cloneState(state);
    },

    activate() {
      if (state.active) return;
      const prev = cloneState(state);
      state.active = true;
      emitter.emit("active:change", true);
      emitStateChange(prev);
    },

    deactivate() {
      if (!state.active) return;
      const prev = cloneState(state);
      state.active = false;
      state.hoverInfo = null;
      state.pendingAnnotation = null;
      emitter.emit("active:change", false);
      emitter.emit("hover:change", null);
      emitter.emit("pending:change", null);
      emitStateChange(prev);
    },

    addAnnotation(data: AnnotationInput): Annotation {
      const prev = cloneState(state);
      const annotation: Annotation = {
        ...data,
        id: generateId(),
        timestamp: Date.now(),
      };
      state.annotations.push(annotation);
      state.pendingAnnotation = null;
      persist();
      emitter.emit("annotation:add", annotation);
      emitter.emit("pending:change", null);
      emitStateChange(prev);
      return annotation;
    },

    updateAnnotation(id: string, data: Partial<Annotation>) {
      const idx = state.annotations.findIndex((a) => a.id === id);
      if (idx === -1) return;
      const prev = cloneState(state);
      const updated = { ...state.annotations[idx], ...data };
      state.annotations[idx] = updated;
      persist();
      emitter.emit("annotation:update", updated);
      emitStateChange(prev);
    },

    deleteAnnotation(id: string) {
      const idx = state.annotations.findIndex((a) => a.id === id);
      if (idx === -1) return;
      const prev = cloneState(state);
      const [deleted] = state.annotations.splice(idx, 1);
      persist();
      emitter.emit("annotation:delete", deleted);
      emitStateChange(prev);
    },

    clearAnnotations() {
      if (state.annotations.length === 0) return;
      const prev = cloneState(state);
      state.annotations = [];
      clearStoredAnnotations(pathname);
      emitter.emit("annotations:clear");
      emitStateChange(prev);
    },

    setFrozen(frozen: boolean) {
      if (state.frozen === frozen) return;
      const prev = cloneState(state);
      state.frozen = frozen;
      emitter.emit("freeze:change", frozen);
      emitStateChange(prev);
    },

    setOutputDetail(level: OutputDetailLevel) {
      if (state.outputDetail === level) return;
      const prev = cloneState(state);
      state.outputDetail = level;
      persistSettings();
      emitStateChange(prev);
    },

    setClearAfterCopy(enabled: boolean) {
      if (state.clearAfterCopy === enabled) return;
      const prev = cloneState(state);
      state.clearAfterCopy = enabled;
      persistSettings();
      emitStateChange(prev);
    },

    setHoverColor(color: string) {
      if (state.hoverColor === color) return;
      const prev = cloneState(state);
      state.hoverColor = color;
      persistSettings();
      emitStateChange(prev);
    },

    setHoverInfo(info: HoverInfo | null) {
      const prev = cloneState(state);
      state.hoverInfo = info;
      emitter.emit("hover:change", info);
      emitStateChange(prev);
    },

    setPendingAnnotation(pending: PendingAnnotation | null) {
      const prev = cloneState(state);
      state.pendingAnnotation = pending;
      emitter.emit("pending:change", pending);
      emitStateChange(prev);
    },

    generateOutput(): string {
      return generateOutput(state.annotations, pathname, state.outputDetail);
    },

    async copyOutput(): Promise<void> {
      const output = generateOutput(
        state.annotations,
        pathname,
        state.outputDetail,
      );
      try {
        await navigator.clipboard.writeText(output);
      } catch {
        // Fallback for content scripts where clipboard API may be blocked
        const textarea = document.createElement("textarea");
        textarea.value = output;
        textarea.style.cssText =
          "position:fixed;left:-9999px;top:-9999px;opacity:0";
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand("copy");
        textarea.remove();
      }
      if (state.clearAfterCopy) {
        engine.clearAnnotations();
      }
      if (state.active) {
        engine.deactivate();
      }
    },

    async sendToAgent(): Promise<ActionResponse> {
      if (!config?.endpoint || !state.sessionId) {
        throw new Error("No endpoint or session configured");
      }
      const prev = cloneState(state);
      state.syncStatus = "syncing";
      emitStateChange(prev);

      try {
        const output = generateOutput(
          state.annotations,
          pathname,
          state.outputDetail,
        );
        const result = await requestAction(
          config.endpoint,
          state.sessionId,
          output,
        );
        const prev2 = cloneState(state);
        state.syncStatus = "synced";
        emitStateChange(prev2);
        return result;
      } catch (err) {
        const prev2 = cloneState(state);
        state.syncStatus = "error";
        emitStateChange(prev2);
        throw err;
      }
    },

    on(event, handler) {
      return emitter.on(event, handler);
    },

    destroy() {
      emitter.removeAll();
    },
  };

  return engine;
}
