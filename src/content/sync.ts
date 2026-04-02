// =============================================================================
// Server Sync Client
// =============================================================================
// HTTP client for the AgentEye server protocol.
// Optional — falls back to local-only mode when no endpoint is configured.

import type { Annotation, Session, ActionResponse } from "./types";

export async function listSessions(endpoint: string): Promise<Session[]> {
  const res = await fetch(`${endpoint}/sessions`);
  if (!res.ok) throw new Error(`Failed to list sessions: ${res.status}`);
  return res.json();
}

export async function createSession(
  endpoint: string,
  url: string,
): Promise<Session> {
  const res = await fetch(`${endpoint}/sessions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url }),
  });
  if (!res.ok) throw new Error(`Failed to create session: ${res.status}`);
  return res.json();
}

export async function getSession(
  endpoint: string,
  sessionId: string,
): Promise<Session & { annotations: Annotation[] }> {
  const res = await fetch(`${endpoint}/sessions/${sessionId}`);
  if (!res.ok) throw new Error(`Failed to get session: ${res.status}`);
  return res.json();
}

export async function syncAnnotation(
  endpoint: string,
  sessionId: string,
  annotation: Annotation,
): Promise<Annotation> {
  const res = await fetch(`${endpoint}/sessions/${sessionId}/annotations`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(annotation),
  });
  if (!res.ok) throw new Error(`Failed to sync annotation: ${res.status}`);
  return res.json();
}

export async function updateAnnotation(
  endpoint: string,
  annotationId: string,
  data: Partial<Annotation>,
): Promise<Annotation> {
  const res = await fetch(`${endpoint}/annotations/${annotationId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(`Failed to update annotation: ${res.status}`);
  return res.json();
}

export async function deleteAnnotation(
  endpoint: string,
  annotationId: string,
): Promise<void> {
  const res = await fetch(`${endpoint}/annotations/${annotationId}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error(`Failed to delete annotation: ${res.status}`);
}

export async function requestAction(
  endpoint: string,
  sessionId: string,
  output: string,
): Promise<ActionResponse> {
  const res = await fetch(`${endpoint}/sessions/${sessionId}/action`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ output }),
  });
  if (!res.ok) throw new Error(`Failed to request action: ${res.status}`);
  return res.json();
}
