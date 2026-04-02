// =============================================================================
// Markdown Output Generator
// =============================================================================
// Generates structured feedback markdown from annotations at varying detail levels.

import type { Annotation, OutputDetailLevel } from "./types";

export function generateOutput(
  annotations: Annotation[],
  pathname: string,
  detail: OutputDetailLevel = "standard",
): string {
  if (annotations.length === 0) return "No annotations.";

  const lines: string[] = [`# Feedback for \`${pathname}\``, ""];

  for (let i = 0; i < annotations.length; i++) {
    const a = annotations[i];
    const num = i + 1;

    switch (detail) {
      case "compact":
        lines.push(formatCompact(a, num));
        break;
      case "standard":
        lines.push(...formatStandard(a, num));
        break;
      case "detailed":
        lines.push(...formatDetailed(a, num));
        break;
      case "forensic":
        lines.push(...formatForensic(a, num));
        break;
    }
  }

  return lines.join("\n");
}

// =============================================================================
// Format Functions
// =============================================================================

function formatCompact(a: Annotation, num: number): string {
  let line = `${num}. **${a.element}**`;
  if (a.sourceFile) line += ` (${a.sourceFile})`;
  if (a.selectedText) line += ` — "${truncate(a.selectedText, 50)}"`;
  line += `: ${a.comment}`;
  return line;
}

function formatStandard(a: Annotation, num: number): string[] {
  const lines: string[] = [];
  lines.push(`## ${num}. ${a.element}`);
  lines.push("");

  if (a.sourceFile) lines.push(`- **Source:** \`${a.sourceFile}\``);
  if (a.elementPath) lines.push(`- **Selector:** \`${a.elementPath}\``);
  if (a.frameworkInfo) {
    lines.push(
      `- **${a.frameworkInfo.framework}:** ${a.frameworkInfo.hierarchy}`,
    );
  }
  if (a.selectedText)
    lines.push(`- **Selected text:** "${truncate(a.selectedText, 100)}"`);

  lines.push("");
  lines.push(`> ${a.comment}`);
  lines.push("");

  return lines;
}

function formatDetailed(a: Annotation, num: number): string[] {
  const lines = formatStandard(a, num);

  // Insert additional details before the comment
  const insertIdx = lines.indexOf("") + 1; // after the metadata block
  const extra: string[] = [];

  if (a.cssClasses) extra.push(`- **Classes:** \`${a.cssClasses}\``);
  if (a.boundingBox) {
    const bb = a.boundingBox;
    extra.push(
      `- **Bounding box:** ${Math.round(bb.x)},${Math.round(bb.y)} ${Math.round(bb.width)}x${Math.round(bb.height)}`,
    );
  }
  if (a.nearbyText)
    extra.push(`- **Nearby text:** ${truncate(a.nearbyText, 150)}`);

  if (extra.length > 0) {
    lines.splice(insertIdx, 0, ...extra);
  }

  return lines;
}

function formatForensic(a: Annotation, num: number): string[] {
  const lines = formatDetailed(a, num);

  const extra: string[] = [];
  if (a.fullPath) extra.push(`- **Full DOM path:** \`${a.fullPath}\``);
  if (a.computedStyles)
    extra.push(`- **Computed styles:** ${a.computedStyles}`);
  if (a.accessibility) extra.push(`- **Accessibility:** ${a.accessibility}`);
  if (a.nearbyElements)
    extra.push(`- **Nearby elements:** ${a.nearbyElements}`);

  // Add viewport info
  if (typeof window !== "undefined") {
    extra.push(`- **Viewport:** ${window.innerWidth}x${window.innerHeight}`);
    extra.push(`- **URL:** ${window.location.href}`);
    extra.push(`- **User agent:** ${navigator.userAgent}`);
  }
  extra.push(`- **Timestamp:** ${new Date(a.timestamp).toISOString()}`);

  if (extra.length > 0) {
    // Insert before the quote block
    const quoteIdx = lines.findIndex((l) => l.startsWith("> "));
    if (quoteIdx > 0) {
      lines.splice(quoteIdx, 0, ...extra, "");
    } else {
      lines.push(...extra);
    }
  }

  return lines;
}

// =============================================================================
// Helpers
// =============================================================================

function truncate(str: string, maxLen: number): string {
  if (str.length <= maxLen) return str;
  return str.slice(0, maxLen - 1) + "\u2026";
}
