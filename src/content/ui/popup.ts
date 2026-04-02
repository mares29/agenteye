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

    // Details (framework + source accordions)
    this.metaContainer = document.createElement("div");
    this.metaContainer.className = "agenteye-popup-details";

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

    // Build detail accordions
    this.metaContainer.textContent = "";
    let hasDetails = false;

    // Framework component tree accordion
    if (pending.frameworkInfo) {
      const components = pending.frameworkInfo.hierarchy
        .split(" ")
        .map((s) => s.replace(/^<|>$/g, ""));

      this.metaContainer.appendChild(
        this.createAccordion(
          pending.frameworkInfo.framework,
          pending.frameworkInfo.framework,
          () => this.buildTreeView(components),
          true,
        ),
      );
      hasDetails = true;
    }

    // Source file accordion
    if (pending.sourceFile) {
      this.metaContainer.appendChild(
        this.createAccordion("Source", "source", () => {
          return this.buildSourceBlock(pending.sourceFile!);
        }),
      );
      hasDetails = true;
    }

    // Selected text accordion
    if (pending.selectedText) {
      this.metaContainer.appendChild(
        this.createAccordion("Selection", "source", () => {
          const block = document.createElement("code");
          block.className = "agenteye-source-block";
          block.textContent = pending.selectedText!;
          return block;
        }),
      );
      hasDetails = true;
    }

    this.metaContainer.classList.toggle("hidden", !hasDetails);

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

  private createAccordion(
    label: string,
    badgeClass: string,
    buildContent: () => HTMLElement,
    startOpen = false,
  ): HTMLElement {
    const accordion = document.createElement("div");
    accordion.className = "agenteye-accordion" + (startOpen ? " open" : "");

    const trigger = document.createElement("button");
    trigger.className = "agenteye-accordion-trigger";

    // Badge with colored dot
    const badge = document.createElement("span");
    badge.className = `badge ${badgeClass}`;
    const dot = document.createElement("span");
    dot.className = "dot";
    badge.appendChild(dot);
    badge.appendChild(document.createTextNode(label));

    // Chevron SVG
    const chevronWrap = document.createElement("span");
    chevronWrap.className = "chevron-icon";
    chevronWrap.innerHTML =
      '<svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M3 4.5L6 7.5L9 4.5"/></svg>';

    trigger.append(badge, chevronWrap);

    // Content with inner wrapper for smooth grid animation
    const content = document.createElement("div");
    content.className = "agenteye-accordion-content";
    const inner = document.createElement("div");
    inner.className = "agenteye-accordion-inner";
    inner.appendChild(buildContent());
    content.appendChild(inner);

    trigger.addEventListener("click", (e) => {
      e.stopPropagation();
      accordion.classList.toggle("open");
    });

    accordion.append(trigger, content);
    return accordion;
  }

  /** Build a visual tree view from component names */
  private buildTreeView(components: string[]): HTMLElement {
    const tree = document.createElement("div");
    tree.className = "agenteye-tree";

    components.forEach((name, i) => {
      const item = document.createElement("div");
      item.className = "agenteye-tree-item";

      // Indent guides
      if (i > 0) {
        const indent = document.createElement("span");
        indent.className = "tree-indent";
        for (let level = 0; level < i; level++) {
          const guide = document.createElement("span");
          guide.className =
            "tree-guide" +
            (level === i - 1 && i === components.length - 1 ? " last" : "");
          indent.appendChild(guide);
        }
        item.appendChild(indent);
      }

      // Component icon
      const icon = document.createElement("span");
      icon.className = "tree-icon " + (i === 0 ? "root" : "component");
      icon.textContent = i === 0 ? "\u25C6" : "\u25CB"; // ◆ or ○
      item.appendChild(icon);

      // Component name
      const nameEl = document.createElement("span");
      nameEl.className = "tree-name";
      nameEl.textContent = name;
      item.appendChild(nameEl);

      tree.appendChild(item);
    });

    return tree;
  }

  /** Build a source file code block with highlighted filename */
  private buildSourceBlock(source: string): HTMLElement {
    const block = document.createElement("code");
    block.className = "agenteye-source-block";

    // Split into path and line number
    const colonIdx = source.lastIndexOf(":");
    if (colonIdx > 0) {
      const path = source.slice(0, colonIdx);
      const line = source.slice(colonIdx);

      const fileSpan = document.createElement("span");
      fileSpan.className = "source-file";
      fileSpan.textContent = path;

      const lineSpan = document.createElement("span");
      lineSpan.className = "source-line";
      lineSpan.textContent = line;

      block.append(fileSpan, lineSpan);
    } else {
      block.textContent = source;
    }

    return block;
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
