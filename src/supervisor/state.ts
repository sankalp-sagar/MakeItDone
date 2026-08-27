export type TaskStatus =
  | "planning"
  | "executing"
  | "waiting_for_user"
  | "waiting_for_approval"
  | "completed"
  | "failed";

export interface Observation {
  id: string;
  type: "information" | "result" | "error";
  message: string;
  data?: unknown;
}

export interface PlanStep {
  id: string;
  title: string;
  capabilityId?: string;
  input?: Record<string, unknown>;
  completed: boolean;
}

export interface TaskState {
  id: string;
  goal: string;
  status: TaskStatus;

  observations: Observation[];

  plan: PlanStep[];

  pendingQuestions: string[];

  completedSteps: string[];
}