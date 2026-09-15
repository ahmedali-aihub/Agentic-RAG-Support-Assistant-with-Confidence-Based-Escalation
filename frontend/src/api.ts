import type { AskResponse, QueueStats, Ticket, TicketStatus } from "./types";

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
