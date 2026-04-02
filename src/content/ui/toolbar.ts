// =============================================================================
// Floating Toolbar
// =============================================================================
// Main control bar: activate/deactivate, freeze, copy, send, settings.

import type { AgentEyeEngine } from "../engine";
import type { AgentEyeState } from "../types";
import { SettingsPanel } from "./settings-panel";

// -- SVG Icons (16x16, derived from user-provided SVGs) ----------------------

// target-svgrepo-com.svg → Annotate
const ICON_TARGET = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M22 12C22 17.5228 17.5228 22 12 22C6.47715 22 2 17.5228 2 12C2 6.47715 6.47715 2 12 2C17.5228 2 22 6.47715 22 12Z"/><path d="M2 12L5 12"/><path d="M19 12L22 12"/><path d="M12 22L12 19"/><path d="M12 5L12 2"/><path d="M10 12H12H14" stroke-linejoin="round"/><path d="M12 14L12 12L12 10" stroke-linejoin="round"/></svg>`;

// Stop icon (square in circle)
const ICON_STOP = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><rect x="9" y="9" width="6" height="6" rx="1" fill="currentColor"/></svg>`;

// pause-circle-svgrepo-com.svg → Freeze
const ICON_PAUSE = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><path d="M8 9.5C8 9.03406 8 8.80109 8.07612 8.61732C8.17761 8.37229 8.37229 8.17761 8.61732 8.07612C8.80109 8 9.03406 8 9.5 8C9.96594 8 10.1989 8 10.3827 8.07612C10.6277 8.17761 10.8224 8.37229 10.9239 8.61732C11 8.80109 11 9.03406 11 9.5V14.5C11 14.9659 11 15.1989 10.9239 15.3827C10.8224 15.6277 10.6277 15.8224 10.3827 15.9239C10.1989 16 9.96594 16 9.5 16C9.03406 16 8.80109 16 8.61732 15.9239C8.37229 15.8224 8.17761 15.6277 8.07612 15.3827C8 15.1989 8 14.9659 8 14.5V9.5Z"/><path d="M13 9.5C13 9.03406 13 8.80109 13.0761 8.61732C13.1776 8.37229 13.3723 8.17761 13.6173 8.07612C13.8011 8 14.0341 8 14.5 8C14.9659 8 15.1989 8 15.3827 8.07612C15.6277 8.17761 15.8224 8.37229 15.9239 8.61732C16 8.80109 16 9.03406 16 9.5V14.5C16 14.9659 16 15.1989 15.9239 15.3827C15.8224 15.6277 15.6277 15.8224 15.3827 15.9239C15.1989 16 14.9659 16 14.5 16C14.0341 16 13.8011 16 13.6173 15.9239C13.3723 15.8224 13.1776 15.6277 13.0761 15.3827C13 15.1989 13 14.9659 13 14.5V9.5Z"/></svg>`;

// Unfreeze (play in circle)
const ICON_PLAY = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><polygon points="10,8 16,12 10,16" fill="currentColor"/></svg>`;

// copy-svgrepo-com.svg → Copy
const ICON_COPY = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M6 11C6 8.17157 6 6.75736 6.87868 5.87868C7.75736 5 9.17157 5 12 5H15C17.8284 5 19.2426 5 20.1213 5.87868C21 6.75736 21 8.17157 21 11V16C21 18.8284 21 20.2426 20.1213 21.1213C19.2426 22 17.8284 22 15 22H12C9.17157 22 7.75736 22 6.87868 21.1213C6 20.2426 6 18.8284 6 16V11Z"/><path d="M6 19C4.34315 19 3 17.6569 3 16V10C3 6.22876 3 4.34315 4.17157 3.17157C5.34315 2 7.22876 2 11 2H15C16.6569 2 18 3.34315 18 5"/></svg>`;

// Trash (simple)
const ICON_TRASH = `<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><line x1="2" y1="4" x2="14" y2="4"/><path d="M5.5 4V2.5a1 1 0 011-1h3a1 1 0 011 1V4"/><path d="M3.5 4l.8 9.5a1 1 0 001 .9h5.4a1 1 0 001-.9L12.5 4"/></svg>`;

// settings-svgrepo-com.svg → Settings
const ICON_SETTINGS = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="3"/><path d="M13.7654 2.15224C13.3978 2 12.9319 2 12 2C11.0681 2 10.6022 2 10.2346 2.15224C9.74457 2.35523 9.35522 2.74458 9.15223 3.23463C9.05957 3.45834 9.0233 3.7185 9.00911 4.09799C8.98826 4.65568 8.70226 5.17189 8.21894 5.45093C7.73564 5.72996 7.14559 5.71954 6.65219 5.45876C6.31645 5.2813 6.07301 5.18262 5.83294 5.15102C5.30704 5.08178 4.77518 5.22429 4.35436 5.5472C4.03874 5.78938 3.80577 6.1929 3.33983 6.99993C2.87389 7.80697 2.64092 8.21048 2.58899 8.60491C2.51976 9.1308 2.66227 9.66266 2.98518 10.0835C3.13256 10.2756 3.3397 10.437 3.66119 10.639C4.1338 10.936 4.43789 11.4419 4.43786 12C4.43783 12.5581 4.13375 13.0639 3.66118 13.3608C3.33965 13.5629 3.13248 13.7244 2.98508 13.9165C2.66217 14.3373 2.51966 14.8691 2.5889 15.395C2.64082 15.7894 2.87379 16.193 3.33973 17C3.80568 17.807 4.03865 18.2106 4.35426 18.4527C4.77508 18.7756 5.30694 18.9181 5.83284 18.8489C6.07289 18.8173 6.31632 18.7186 6.65204 18.5412C7.14547 18.2804 7.73556 18.27 8.2189 18.549C8.70224 18.8281 8.98826 19.3443 9.00911 19.9021C9.02331 20.2815 9.05957 20.5417 9.15223 20.7654C9.35522 21.2554 9.74457 21.6448 10.2346 21.8478C10.6022 22 11.0681 22 12 22C12.9319 22 13.3978 22 13.7654 21.8478C14.2554 21.6448 14.6448 21.2554 14.8477 20.7654C14.9404 20.5417 14.9767 20.2815 14.9909 19.902C15.0117 19.3443 15.2977 18.8281 15.781 18.549C16.2643 18.2699 16.8544 18.2804 17.3479 18.5412C17.6836 18.7186 17.927 18.8172 18.167 18.8488C18.6929 18.9181 19.2248 18.7756 19.6456 18.4527C19.9612 18.2105 20.1942 17.807 20.6601 16.9999C21.1261 16.1929 21.3591 15.7894 21.411 15.395C21.4802 14.8691 21.3377 14.3372 21.0148 13.9164C20.8674 13.7243 20.6602 13.5628 20.3387 13.3608C19.8662 13.0639 19.5621 12.558 19.5621 11.9999C19.5621 11.4418 19.8662 10.9361 20.3387 10.6392C20.6603 10.4371 20.8675 10.2757 21.0149 10.0835C21.3378 9.66273 21.4803 9.13087 21.4111 8.60497C21.3592 8.21055 21.1262 7.80703 20.6602 7C20.1943 6.19297 19.9613 5.78945 19.6457 5.54727C19.2249 5.22436 18.693 5.08185 18.1671 5.15109C17.9271 5.18269 17.6837 5.28136 17.3479 5.4588C16.8545 5.71959 16.2644 5.73002 15.7811 5.45096C15.2977 5.17191 15.0117 4.65566 14.9909 4.09794C14.9767 3.71848 14.9404 3.45833 14.8477 3.23463C14.6448 2.74458 14.2554 2.35523 13.7654 2.15224Z"/></svg>`;

export class Toolbar {
  private container: HTMLElement;
  private engine: AgentEyeEngine;
  private settings: SettingsPanel;

  // Buttons
  private activateBtn: HTMLButtonElement;
  private freezeBtn: HTMLButtonElement;
  private copyBtn: HTMLButtonElement;
  private clearBtn: HTMLButtonElement;
  private settingsBtn: HTMLButtonElement;
  private badge: HTMLElement;

  constructor(root: ShadowRoot, engine: AgentEyeEngine) {
    this.engine = engine;
    this.settings = new SettingsPanel(root, engine);

    this.container = document.createElement("div");
    this.container.className = "agenteye-toolbar inactive";

    // Activate button
    this.activateBtn = this.createButton(
      ICON_TARGET,
      "Annotate",
      "primary",
      () => {
        const state = engine.getState();
        if (state.active) {
          engine.deactivate();
        } else {
          engine.activate();
        }
      },
    );

    // Badge (annotation count)
    this.badge = document.createElement("span");
    this.badge.className = "agenteye-badge hidden";

    // Freeze button
    this.freezeBtn = this.createButton(ICON_PAUSE, "Freeze", "", () => {
      engine.setFrozen(!engine.getState().frozen);
    });

    // Copy button
    this.copyBtn = this.createButton(ICON_COPY, "Copy", "", () => {
      this.flashCopyButton();
      engine.copyOutput();
    });

    // Clear button
    this.clearBtn = this.createButton(ICON_TRASH, "Clear", "danger", () => {
      engine.clearAnnotations();
    });

    // Settings button
    this.settingsBtn = this.createButton(ICON_SETTINGS, "", "", () => {
      this.settings.toggle();
    });

    // Dividers
    const div1 = this.createDivider();
    const div2 = this.createDivider();

    this.container.append(
      this.activateBtn,
      this.badge,
      div1,
      this.freezeBtn,
      this.copyBtn,
      this.clearBtn,
      div2,
      this.settingsBtn,
    );

    root.appendChild(this.container);
  }

  update(state: AgentEyeState): void {
    // Activate button
    if (state.active) {
      this.setButtonContent(this.activateBtn, ICON_STOP, "Stop");
      this.activateBtn.classList.add("active");
      this.activateBtn.classList.remove("primary");
      this.container.classList.remove("inactive");
    } else {
      this.setButtonContent(this.activateBtn, ICON_TARGET, "Annotate");
      this.activateBtn.classList.remove("active");
      this.activateBtn.classList.add("primary");
      this.container.classList.add("inactive");
    }

    // Badge
    const count = state.annotations.length;
    if (count > 0) {
      this.badge.textContent = String(count);
      this.badge.classList.remove("hidden");
    } else {
      this.badge.classList.add("hidden");
    }

    // Freeze button
    if (state.frozen) {
      this.setButtonContent(this.freezeBtn, ICON_PLAY, "Unfreeze");
      this.freezeBtn.classList.add("active");
    } else {
      this.setButtonContent(this.freezeBtn, ICON_PAUSE, "Freeze");
      this.freezeBtn.classList.remove("active");
    }

    // Copy button disabled when no annotations
    this.copyBtn.disabled = count === 0;
    this.copyBtn.style.opacity = count === 0 ? "0.4" : "1";

    // Clear button hidden when no annotations
    this.clearBtn.classList.toggle("hidden", count === 0);
  }

  getContainer(): HTMLElement {
    return this.container;
  }

  destroy(): void {
    this.settings.destroy();
    this.container.remove();
  }

  private flashCopyButton(): void {
    const ICON_CHECK = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`;
    this.setButtonContent(this.copyBtn, ICON_CHECK, "Copied!");
    this.copyBtn.classList.add("copied");
    setTimeout(() => {
      this.setButtonContent(this.copyBtn, ICON_COPY, "Copy");
      this.copyBtn.classList.remove("copied");
    }, 1200);
  }

  private createButton(
    iconSvg: string,
    text: string,
    className: string,
    onClick: () => void,
  ): HTMLButtonElement {
    const btn = document.createElement("button");
    btn.className = `agenteye-btn ${className}`.trim();
    this.setButtonContent(btn, iconSvg, text);
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      onClick();
    });
    return btn;
  }

  private setButtonContent(
    btn: HTMLButtonElement,
    iconSvg: string,
    text: string,
  ): void {
    btn.textContent = "";
    const iconSpan = document.createElement("span");
    iconSpan.className = "agenteye-btn-icon";
    iconSpan.innerHTML = iconSvg;
    btn.appendChild(iconSpan);
    if (text) {
      const textSpan = document.createElement("span");
      textSpan.className = "agenteye-btn-text";
      textSpan.textContent = text;
      btn.appendChild(textSpan);
    }
  }

  private createDivider(): HTMLElement {
    const div = document.createElement("div");
    div.className = "agenteye-divider";
    return div;
  }
}
