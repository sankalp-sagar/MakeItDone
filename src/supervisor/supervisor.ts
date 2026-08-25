// src/supervisor/supervisor.ts

import { Planner } from "./planner";
import { TaskState } from "./state";

export class Supervisor {
  private planner = new Planner();

  startTask(goal: string): TaskState {
    const state: TaskState = {
      id: crypto.randomUUID(),
      goal,
      status: "planning",
      observations: [],
      plan: [],
      pendingQuestions: [],
      completedSteps: [],
    };

    state.plan = this.planner.createPlan(goal);

    return state;
  }
}