// Shared between the frontend and the local API server (server/).

export interface CoachLogItem {
  text: string;
  time: string; // "HH:mm", local time
}

export interface CoachRequest {
  localTime: string; // "HH:mm"
  dayOfWeek: string;
  today: {
    weightEntries: CoachLogItem[];
    exerciseEntries: CoachLogItem[];
    foodEntries: CoachLogItem[];
  };
  // Latest weigh-in text for each earlier day, oldest first.
  recentWeighIns: { dateKey: string; text: string }[];
}

export type CoachStatus = "message" | "quiet" | "support" | "welcome";

export interface CoachMessage {
  id: string;
  title: string;
  text: string;
}

export interface CoachInsight {
  label: string;
  value: string;
}

export interface JevAnswerSummary {
  id: string;
  type: "noul" | "choice" | "score";
  value: string; // human-readable, e.g. "0.92" or "no_guilt_treat (78%)"
  confidence?: number;
  probabilities?: Record<string, number>;
}

export interface CoachResponse {
  status: CoachStatus;
  message: CoachMessage | null;
  reason: string;
  insights: CoachInsight[];
  facts: Record<string, string>;
  jev: {
    called: boolean;
    model?: string;
    latencyMs?: number;
    inputTokens?: number;
    answers: JevAnswerSummary[];
  };
}
