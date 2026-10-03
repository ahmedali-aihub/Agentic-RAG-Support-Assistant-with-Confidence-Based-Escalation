import type { AskResponse, QueueStats, Ticket, TicketStatus, TicketStatusPublic } from "./types";

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000";

export async function askQuestion(question: string): Promise<AskResponse> {
  const res = await fetch(`${API_BASE}/ask`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question }),
  });

  if (!res.ok) {
    throw new Error(`Request failed: ${res.status}`);
  }

  return res.json();
}

export async function listTickets(): Promise<Ticket[]> {
  const res = await fetch(`${API_BASE}/tickets`);
  if (!res.ok) throw new Error(`Request failed: ${res.status}`);
  return res.json();
}

export async function queueStats(): Promise<QueueStats> {
  const res = await fetch(`${API_BASE}/tickets/stats`);
  if (!res.ok) throw new Error(`Request failed: ${res.status}`);
  return res.json();
}

/** Returns null for a 404 (unknown ticket) rather than throwing, since that is
 * an expected outcome of a customer mistyping their ticket number -- not a
 * failure the caller needs to handle differently from "not found yet". */
export async function lookupTicketStatus(id: string): Promise<TicketStatusPublic | null> {
  const res = await fetch(`${API_BASE}/tickets/${encodeURIComponent(id)}/status`);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Request failed: ${res.status}`);
  return res.json();
}

export async function updateTicket(
  id: string,
  status: TicketStatus,
  answer?: string
): Promise<Ticket> {
  const res = await fetch(`${API_BASE}/tickets/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status, answer }),
  });
  if (!res.ok) throw new Error(`Request failed: ${res.status}`);
  return res.json();
}
