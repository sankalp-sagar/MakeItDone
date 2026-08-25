// src/supervisor/planner.ts

import { PlanStep } from "./state";

export class Planner {
  createPlan(goal: string): PlanStep[] {
    return [
      {
        id: "1",
        title: `Understand the task: ${goal}`,
        completed: false,
      },
      {
        id: "2",
        title: "Discover required information",
        completed: false,
      },
      {
        id: "3",
        title: "Execute the solution safely",
        completed: false,
      },
      {
        id: "4",
        title: "Verify the result",
        completed: false,
      },
    ];
  }
}