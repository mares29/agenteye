// =============================================================================
// Hover Overlay
// =============================================================================
// Highlights the element under the cursor when annotation mode is active.

import type { HoverInfo } from "../types";

export class HoverOverlay {
  private container: HTMLElement;
  private label: HTMLElement;
  private currentColor = "#ffffff";

  constructor(root: ShadowRoot) {
    this.container = document.createElement("div");
    this.container.className = "agenteye-hover-overlay hidden";

    this.label = document.createElement("div");
    this.label.className = "agenteye-hover-label";
    this.container.appendChild(this.label);

    root.appendChild(this.container);
  }

  setColor(color: string): void {
    if (this.currentColor === color) return;
    this.currentColor = color;
    this.container.style.borderColor = color;
    this.container.style.background = `${color}10`;
    this.label.style.borderColor = `${color}4d`;
  }

  update(info: HoverInfo | null): void {
    if (!info) {
      this.container.classList.add("hidden");
      return;
    }

    const { boundingBox, name, frameworkInfo } = info;
    this.container.classList.remove("hidden");

    this.container.style.left = `${boundingBox.x}px`;
    this.container.style.top = `${boundingBox.y - window.scrollY}px`;
    this.container.style.width = `${boundingBox.width}px`;
    this.container.style.height = `${boundingBox.height}px`;

    this.label.textContent = "";
    this.label.appendChild(document.createTextNode(name));
    if (frameworkInfo) {
      const span = document.createElement("span");
      span.className = "framework";
      span.textContent = frameworkInfo.hierarchy;
      this.label.appendChild(span);
    }
  }

  destroy(): void {
    this.container.remove();
  }
}
