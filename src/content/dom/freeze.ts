// =============================================================================
// Animation Freezing
// =============================================================================
//
// Freezes all CSS animations, JS timers, requestAnimationFrame, and video
// playback on the page. Returns a restore function to unfreeze.
// Framework-agnostic — pure DOM/JS APIs only.

let frozen = false;

// Store originals before patching
const originals = {
  setTimeout: globalThis.setTimeout,
  setInterval: globalThis.setInterval,
  requestAnimationFrame: globalThis.requestAnimationFrame,
};

// Track patched timers for cleanup
const pendingTimers: number[] = [];
const pendingFrames: number[] = [];

export function freezeAnimations(): () => void {
  if (frozen) return () => {};
  frozen = true;

  // 1. Pause all CSS animations and transitions
  const style = document.createElement("style");
  style.id = "agenteye-freeze";
  style.textContent = `
    *, *::before, *::after {
      animation-play-state: paused !important;
      transition: none !important;
    }
  `;
  document.head.appendChild(style);

  // 2. Pause all videos
  const videos = document.querySelectorAll("video");
  const playingVideos: HTMLVideoElement[] = [];
  videos.forEach((v) => {
    if (!v.paused) {
      playingVideos.push(v);
      v.pause();
    }
  });

  // 3. Pause Web Animations API
  const animations = document.getAnimations();
  animations.forEach((a) => a.pause());

  // 4. Intercept new timers (prevent new animations from starting)
  globalThis.setTimeout = ((fn: Function, delay?: number, ...args: any[]) => {
    const id = originals.setTimeout.call(globalThis, fn, delay, ...args);
    pendingTimers.push(id as unknown as number);
    return id;
  }) as typeof globalThis.setTimeout;

  globalThis.setInterval = ((fn: Function, delay?: number, ...args: any[]) => {
    const id = originals.setInterval.call(globalThis, fn, delay, ...args);
    pendingTimers.push(id as unknown as number);
    return id;
  }) as typeof globalThis.setInterval;

  globalThis.requestAnimationFrame = ((fn: FrameRequestCallback) => {
    const id = originals.requestAnimationFrame.call(globalThis, fn);
    pendingFrames.push(id);
    return id;
  }) as typeof globalThis.requestAnimationFrame;

  // Return restore function
  return function unfreeze() {
    if (!frozen) return;
    frozen = false;

    // Restore CSS
    const freezeStyle = document.getElementById("agenteye-freeze");
    freezeStyle?.remove();

    // Resume videos
    playingVideos.forEach((v) => {
      v.play().catch(() => {
        // Autoplay policy may prevent resume
      });
    });

    // Resume Web Animations (re-query to catch animations added while frozen)
    document.getAnimations().forEach((a) => {
      try {
        a.play();
      } catch {
        // Animation may have been removed
      }
    });

    // Restore timer functions
    globalThis.setTimeout = originals.setTimeout;
    globalThis.setInterval = originals.setInterval;
    globalThis.requestAnimationFrame = originals.requestAnimationFrame;

    // Clear tracked timers
    pendingTimers.forEach((id) => clearTimeout(id));
    pendingFrames.forEach((id) => cancelAnimationFrame(id));
    pendingTimers.length = 0;
    pendingFrames.length = 0;
  };
}

/** Check if animations are currently frozen */
export function isFrozen(): boolean {
  return frozen;
}

/**
 * Access original timer functions (for extension UI code that needs
 * to run animations even while the page is frozen).
 */
export const originalTimers = originals;
