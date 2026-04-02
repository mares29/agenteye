// =============================================================================
// Annotation Popup
// =============================================================================
// Text input popup shown when clicking an element to annotate.

import type { AgentEyeEngine } from "../engine";
import type { PendingAnnotation, Annotation } from "../types";

export class AnnotationPopup {
  private root: ShadowRoot;
  private container: HTMLElement;
  private textarea: HTMLTextAreaElement;
  private elementLabel: HTMLElement;
  private metaContainer: HTMLElement;
  private engine: AgentEyeEngine;
  private currentPending: PendingAnnotation | null = null;
  private editingAnnotation: Annotation | null = null;

  constructor(root: ShadowRoot, engine: AgentEyeEngine) {
    this.root = root;
    this.engine = engine;

    this.container = document.createElement("div");
    this.container.className = "agenteye-popup hidden";

    // Header
    const header = document.createElement("div");
    header.className = "agenteye-popup-header";

    this.elementLabel = document.createElement("div");
    this.elementLabel.className = "agenteye-popup-element";

    const closeBtn = document.createElement("button");
    closeBtn.className = "agenteye-popup-close";
    closeBtn.textContent = "\u00D7";
    closeBtn.addEventListener("click", () => this.close());

    header.append(this.elementLabel, closeBtn);

    // Textarea
    this.textarea = document.createElement("textarea");
    this.textarea.className = "agenteye-popup-textarea";
    this.textarea.placeholder = "Describe the issue or feedback...";
    this.textarea.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        this.submit();
      }
      if (e.key === "Escape") {
        e.preventDefault();
        this.close();
      }
      // Stop propagation to prevent page handlers
      e.stopPropagation();
    });

    // Meta info
    this.metaContainer = document.createElement("div");
    this.metaContainer.className = "agenteye-popup-meta";

    // Actions
    const actions = document.createElement("div");
    actions.className = "agenteye-popup-actions";

    const cancelBtn = document.createElement("button");
    cancelBtn.className = "agenteye-btn";
    cancelBtn.textContent = "Cancel";
    cancelBtn.addEventListener("click", () => this.close());

    const submitBtn = document.createElement("button");
    submitBtn.className = "agenteye-btn primary";
    submitBtn.textContent = "Add Note";
    submitBtn.addEventListener("click", () => this.submit());

    actions.append(cancelBtn, submitBtn);
    this.container.append(header, this.textarea, this.metaContainer, actions);
    root.appendChild(this.container);
  }

  show(pending: PendingAnnotation): void {
    this.currentPending = pending;
    this.editingAnnotation = null;
    this.container.classList.remove("hidden");
    this.elementLabel.textContent = pending.element;
    this.textarea.value = "";

    // Build meta info (safe DOM construction — no innerHTML)
    this.metaContainer.textContent = "";
    let hasMeta = false;
    if (pending.selectedText) {
      this.metaContainer.appendChild(
        document.createTextNode(`Selected: "${pending.selectedText}"`),
      );
      hasMeta = true;
    }
    if (pending.frameworkInfo) {
      const tag = document.createElement("span");
      tag.className = "framework-tag";
      tag.textContent = `${pending.frameworkInfo.framework}: ${pending.frameworkInfo.hierarchy}`;
      this.metaContainer.appendChild(tag);
      hasMeta = true;
    }
    this.metaContainer.classList.toggle("hidden", !hasMeta);

    // Position popup near the click
    this.positionNear(pending.x, pending.y);

    // Focus textarea
    setTimeout(() => this.textarea.focus(), 50);
  }

  showEdit(annotation: Annotation): void {
    this.editingAnnotation = annotation;
    this.currentPending = null;
    this.container.classList.remove("hidden");
    this.elementLabel.textContent = annotation.element;
    this.textarea.value = annotation.comment;

    this.metaContainer.textContent = "";
    this.metaContainer.classList.add("hidden");

    this.positionNear(annotation.x, annotation.y);
    setTimeout(() => this.textarea.focus(), 50);
  }

  close(): void {
    this.container.classList.add("hidden");
    this.currentPending = null;
    this.editingAnnotation = null;
    this.engine.setPendingAnnotation(null);
  }

  private submit(): void {
    const comment = this.textarea.value.trim();
    if (!comment) return;

    if (this.editingAnnotation) {
      this.engine.updateAnnotation(this.editingAnnotation.id, { comment });
    } else if (this.currentPending) {
      this.engine.addAnnotation({
        ...this.currentPending,
        comment,
      });
    }

    this.close();
  }

  private positionNear(xPercent: number, yAbsolute: number): void {
    const viewportX = (xPercent / 100) * window.innerWidth;
    const viewportY = yAbsolute - window.scrollY;

    // Try to place popup to the right of the click point
    let left = Math.min(viewportX + 20, window.innerWidth - 360);
    let top = Math.min(viewportY - 20, window.innerHeight - 300);

    // Keep on screen
    left = Math.max(10, left);
    top = Math.max(10, top);

    this.container.style.left = `${left}px`;
    this.container.style.top = `${top}px`;
  }

  destroy(): void {
    this.container.remove();
  }
}
