export type EscalationReason = "low_confidence" | "service_unavailable";

export interface AskResponse {
  answer: string;
  escalated: boolean;
  citations: string[];
  confidence_score: number | null;
  confidence_reasoning: string | null;
  escalation_id: string | null;
  escalation_reason: EscalationReason | null;
  served_by: string | null;
  attempts: number | null;
  rewritten_query: string | null;
  timings: Record<string, number>;
  chunks_considered: number | null;
  chunks_used: number | null;
  top_relevance: number | null;
}

export type Outcome = "answered" | "escalated" | "unavailable" | "error";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
  outcome?: Outcome;
  citations?: string[];
  confidenceScore?: number | null;
  confidenceReasoning?: string | null;
  escalationId?: string | null;
  servedBy?: string | null;
  attempts?: number | null;
  rewrittenQuery?: string | null;
  timings?: Record<string, number>;
  chunksConsidered?: number | null;
  chunksUsed?: number | null;
  topRelevance?: number | null;
  pending?: boolean;
  elapsedMs?: number;
}

export type TicketStatus = "open" | "in_progress" | "resolved";

export interface Ticket {
  id: string;
  created_at: string;
  question: string;
  summary: string;
  summary_model: string | null;
  confidence_score: number | null;
  confidence_reasoning: string | null;
  judge_model: string | null;
  related_sources: string[];
  status: TicketStatus;
  updated_at: string | null;
  resolution_note: string | null;
  agent_answer: string | null;
  learned: boolean;
}

export interface QueueStats {
  total: number;
  open: number;
  in_progress: number;
  resolved: number;
  resolution_rate: number;
  learned: number;
}
