export interface AskResponse {
  answer: string;
  escalated: boolean;
  citations: string[];
  confidence_score: number | null;
  escalation_id: string | null;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
  escalated?: boolean;
  citations?: string[];
  confidenceScore?: number | null;
  escalationId?: string | null;
  pending?: boolean;
}
