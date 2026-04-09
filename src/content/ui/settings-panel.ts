// =============================================================================
// Settings Panel
// =============================================================================
// Output detail level selector and toggle options.

import type { AgentEyeEngine } from "../engine";
import type { OutputDetailLevel } from "../types";
import { detectFrameworks, getActiveFrameworks } from "../detection/registry";

const DETAIL_OPTIONS: { value: OutputDetailLevel; label: string }[] = [
  { value: "compact", label: "Compact" },
  { value: "standard", label: "Standard" },
  { value: "detailed", label: "Detailed" },
  { value: "forensic", label: "Forensic" },
];

const HOVER_COLORS = [
  "#ffffff",
  "#e6d520",
  "#4ade80",
  "#61dafb",
  "#ff6b3d",
  "#ff8a8a",
  "#a78bfa",
  "#f472b6",
];

export class SettingsPanel {
  private container: HTMLElement;
  private engine: AgentEyeEngine;
  private unsubscribe: (() => void) | null = null;

  constructor(root: ShadowRoot, engine: AgentEyeEngine) {
    this.engine = engine;

    this.container = document.createElement("div");
    this.container.className = "agenteye-settings hidden";

    const title = document.createElement("div");
    title.className = "agenteye-settings-title";
    title.textContent = "Settings";

    // Detail level selector
    const detailOption = document.createElement("div");
    detailOption.className = "agenteye-settings-option";

    const detailLabel = document.createElement("label");
    detailLabel.textContent = "Detail Level";

    const detailSelect = document.createElement("select");
    detailSelect.className = "agenteye-select";
    for (const opt of DETAIL_OPTIONS) {
      const option = document.createElement("option");
      option.value = opt.value;
      option.textContent = opt.label;
      if (opt.value === engine.getState().outputDetail) {
        option.selected = true;
      }
      detailSelect.appendChild(option);
    }
    detailSelect.addEventListener("change", () => {
      engine.setOutputDetail(detailSelect.value as OutputDetailLevel);
    });

    detailOption.append(detailLabel, detailSelect);

    // Clear after copy toggle
    const clearOption = document.createElement("div");
    clearOption.className = "agenteye-settings-option";

    const clearLabel = document.createElement("label");
    clearLabel.textContent = "Clear after copy";

    const clearToggle = document.createElement("label");
    clearToggle.className = "agenteye-toggle";
    const clearCheckbox = document.createElement("input");
    clearCheckbox.type = "checkbox";
    clearCheckbox.checked = engine.getState().clearAfterCopy;
    clearCheckbox.addEventListener("change", () => {
      engine.setClearAfterCopy(clearCheckbox.checked);
    });
    const clearTrack = document.createElement("span");
    clearTrack.className = "agenteye-toggle-track";
    clearToggle.append(clearCheckbox, clearTrack);

    clearOption.append(clearLabel, clearToggle);

    // Hover color picker
    const colorOption = document.createElement("div");
    colorOption.className = "agenteye-settings-option agenteye-color-option";

    const colorLabel = document.createElement("label");
    colorLabel.textContent = "Hover Color";

    const colorSwatches = document.createElement("div");
    colorSwatches.className = "agenteye-color-swatches";

    const swatchEls: HTMLButtonElement[] = [];
    for (const color of HOVER_COLORS) {
      const swatch = document.createElement("button");
      swatch.className = "agenteye-color-swatch";
      if (color === engine.getState().hoverColor) {
        swatch.classList.add("selected");
      }
      swatch.style.setProperty("--swatch-color", color);
      swatch.addEventListener("click", () => {
        engine.setHoverColor(color);
      });
      swatchEls.push(swatch);
      colorSwatches.appendChild(swatch);
    }

    colorOption.append(colorLabel, colorSwatches);

    // Sync UI when state changes (e.g. async settings load)
    this.unsubscribe = engine.on("state:change", (newState) => {
      detailSelect.value = newState.outputDetail;
      clearCheckbox.checked = newState.clearAfterCopy;
      for (let i = 0; i < HOVER_COLORS.length; i++) {
        swatchEls[i].classList.toggle(
          "selected",
          HOVER_COLORS[i] === newState.hoverColor,
        );
      }
    });

    // Detected framework info
    const frameworkRow = document.createElement("div");
    frameworkRow.className = "agenteye-settings-option";

    const frameworkLabel = document.createElement("label");
    frameworkLabel.textContent = "Framework";

    const frameworkValue = document.createElement("span");
    frameworkValue.className = "agenteye-settings-framework";
    frameworkValue.textContent = "detecting...";

    frameworkRow.append(frameworkLabel, frameworkValue);

    // Detect async — bridge may not have responded yet
    const updateFramework = () => {
      detectFrameworks();
      const active = getActiveFrameworks();
      frameworkValue.textContent =
        active.length > 0 ? active.join(", ") : "vanilla";
    };
    // Try immediately, then retry after a short delay for SPAs
    updateFramework();
    setTimeout(updateFramework, 1500);

    this.container.append(
      title,
      frameworkRow,
      detailOption,
      clearOption,
      colorOption,
    );
    root.appendChild(this.container);
  }

  toggle(): void {
    this.container.classList.toggle("hidden");
  }

  hide(): void {
    this.container.classList.add("hidden");
  }

  destroy(): void {
    this.unsubscribe?.();
    this.container.remove();
  }
}
