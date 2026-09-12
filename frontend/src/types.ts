export type EscalationReason = "low_confidence" | "service_unavailable";

export interface AskResponse {
  answer: string;
  escalated: boolean;
  citations: string[];
  confidence_score: number | null;
  escalation_id: string | null;
  escalation_reason: EscalationReason | null;
  served_by: string | null;
  attempts: number | null;
  rewritten_query: string | null;
}

export type Outcome = "answered" | "escalated" | "unavailable" | "error";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
  outcome?: Outcome;
  citations?: string[];
  confidenceScore?: number | null;
  escalationId?: string | null;
  servedBy?: string | null;
  attempts?: number | null;
  rewrittenQuery?: string | null;
  pending?: boolean;
  elapsedMs?: number;
}
