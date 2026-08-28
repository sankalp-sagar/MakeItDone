export type TaskStatus =
  | "planning"
  | "executing"
  | "waiting_for_user"
  | "waiting_for_approval"
  | "completed"
  | "failed";

export interface Observation {
  id: string;

  type:
    | "information"
    | "result"
    | "error";

  message: string;

  data?: unknown;
}

export interface Artifact {
  id: string;

  name: string;

  type:
    | "image"
    | "document"
    | "code"
    | "data"
    | "unknown";

  path?: string;

  source:
    | "user"
    | "workspace"
    | "agent";

  metadata?: Record<string, unknown>;
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

  artifacts: Artifact[];

  plan: PlanStep[];

  pendingQuestions: string[];

  completedSteps: string[];
}