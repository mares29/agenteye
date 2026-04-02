// =============================================================================
// Annotation Markers
// =============================================================================
// Renders numbered pins on annotated elements.

import type { Annotation } from "../types";

export class AnnotationMarkers {
  private root: ShadowRoot;
  private markers = new Map<string, HTMLElement>();
  private currentAnnotations: Annotation[] = [];
  private scrollHandler: () => void;

  constructor(root: ShadowRoot) {
    this.root = root;

    // Re-position markers on scroll
    this.scrollHandler = () => this.repositionAll();
    window.addEventListener("scroll", this.scrollHandler, { passive: true });
  }

  update(annotations: Annotation[]): void {
    this.currentAnnotations = annotations;
    const currentIds = new Set(annotations.map((a) => a.id));

    // Remove markers for deleted annotations
    for (const [id, el] of this.markers) {
      if (!currentIds.has(id)) {
        el.remove();
        this.markers.delete(id);
      }
    }

    // Add/update markers
    annotations.forEach((annotation, index) => {
      let marker = this.markers.get(annotation.id);

      if (!marker) {
        marker = document.createElement("div");
        marker.className = "agenteye-marker";
        this.root.appendChild(marker);
        this.markers.set(annotation.id, marker);
      }

      marker.textContent = String(index + 1);
      this.positionMarker(marker, annotation);
    });
  }

  private positionMarker(marker: HTMLElement, annotation: Annotation): void {
    const leftPx = (annotation.x / 100) * window.innerWidth;
    marker.style.left = `${leftPx}px`;

    if (annotation.isFixed) {
      marker.style.top = `${annotation.y}px`;
    } else {
      // y is absolute document position — convert to viewport-relative for fixed container
      marker.style.top = `${annotation.y - window.scrollY}px`;
    }
  }

  private repositionAll(): void {
    this.currentAnnotations.forEach((annotation) => {
      const marker = this.markers.get(annotation.id);
      if (marker) this.positionMarker(marker, annotation);
    });
  }

  destroy(): void {
    window.removeEventListener("scroll", this.scrollHandler);
    for (const el of this.markers.values()) {
      el.remove();
    }
    this.markers.clear();
  }
}
