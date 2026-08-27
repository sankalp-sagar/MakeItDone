// src/supervisor/state.ts

export type TaskStatus =
  | "planning"
  | "executing"
  | "waiting_for_user"
  | "waiting_for_approval"
  | "completed"
  | "failed";

export interface Observation {
  id: string;
  message: string;
}

export interface PlanStep {
  id: string;
  title: string;
  capabilityId?: string;
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