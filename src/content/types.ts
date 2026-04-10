// =============================================================================
// Core Types
// =============================================================================

export type Annotation = {
  id: string;
  x: number; // % of viewport width
  y: number; // px from top of document
  comment: string;
  element: string; // human-readable element name
  elementPath: string; // CSS selector path
  timestamp: number;
  selectedText?: string;
  boundingBox?: BoundingBox;
  nearbyText?: string;
  cssClasses?: string;
  nearbyElements?: string;
  computedStyles?: string;
  fullPath?: string;
  accessibility?: string;
  isMultiSelect?: boolean;
  isFixed?: boolean;
  frameworkInfo?: FrameworkComponentInfo;
  sourceFile?: string;

  // Sync fields
  sessionId?: string;
  url?: string;
  status?: AnnotationStatus;
  createdAt?: string;
  updatedAt?: string;
};

export type AnnotationInput = Omit<Annotation, "id" | "timestamp">;

export type AnnotationStatus =
  | "pending"
  | "acknowledged"
  | "resolved"
  | "dismissed";

export type BoundingBox = {
  x: number;
  y: number;
  width: number;
  height: number;
};

// =============================================================================
// Framework Detection
// =============================================================================

export type FrameworkComponentInfo = {
  framework: string; // 'react' | 'svelte' | ...
  hierarchy: string; // "<App> <Dashboard> <Button>"
  sourceFile?: string; // "src/Button.tsx:42"
  props?: Record<string, unknown>;
};

// =============================================================================
// Engine State
// =============================================================================

export type OutputDetailLevel =
  | "compact"
  | "standard"
  | "detailed"
  | "forensic";

export type HoverInfo = {
  element: Element;
  name: string;
  path: string;
  boundingBox: BoundingBox;
  frameworkInfo?: FrameworkComponentInfo;
};

export type PendingAnnotation = {
  x: number;
  y: number;
  element: string;
  elementPath: string;
  boundingBox: BoundingBox;
  selectedText?: string;
  nearbyText?: string;
  cssClasses?: string;
  nearbyElements?: string;
  computedStyles?: string;
  fullPath?: string;
  accessibility?: string;
  frameworkInfo?: FrameworkComponentInfo;
  sourceFile?: string;
  isFixed?: boolean;
};

export type SyncStatus = "idle" | "syncing" | "synced" | "error";

export type AgentEyeState = {
  active: boolean;
  annotations: Annotation[];
  frozen: boolean;
  outputDetail: OutputDetailLevel;
  clearAfterCopy: boolean;
  hoverColor: string;
  hoverInfo: HoverInfo | null;
  pendingAnnotation: PendingAnnotation | null;
  syncStatus: SyncStatus;
  sessionId: string | null;
  detectedFrameworks: string[];
};

// =============================================================================
// Config
// =============================================================================

export type AgentEyeConfig = {
  /** Server endpoint for sync. Omit for local-only. */
  endpoint?: string;
  /** Pre-existing session ID. */
  sessionId?: string;
  /** Default output detail level. */
  outputDetail?: OutputDetailLevel;
};

// =============================================================================
// Events
// =============================================================================

export type AgentEyeEvents = {
  "state:change": (state: AgentEyeState, prev: AgentEyeState) => void;
  "annotation:add": (annotation: Annotation) => void;
  "annotation:update": (annotation: Annotation) => void;
  "annotation:delete": (annotation: Annotation) => void;
  "annotations:clear": () => void;
  "hover:change": (info: HoverInfo | null) => void;
  "pending:change": (pending: PendingAnnotation | null) => void;
  "freeze:change": (frozen: boolean) => void;
  "active:change": (active: boolean) => void;
};

// =============================================================================
// Sync Types
// =============================================================================

export type Session = {
  id: string;
  url: string;
  status: "active" | "approved" | "closed";
  createdAt: string;
  updatedAt?: string;
};

export type ActionResponse = {
  success: boolean;
  annotationCount: number;
  delivered: {
    sseListeners: number;
    webhooks: number;
    total: number;
  };
};
