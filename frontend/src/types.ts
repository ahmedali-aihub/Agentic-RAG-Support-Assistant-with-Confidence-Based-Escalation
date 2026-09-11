export interface AskResponse {
  answer: string;
  escalated: boolean;
  citations: string[];
  confidence_score: number | null;
  escalation_id: string | null;
  served_by: string | null;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
  escalated?: boolean;
  citations?: string[];
  confidenceScore?: number | null;
  escalationId?: string | null;
  servedBy?: string | null;
  pending?: boolean;
}
