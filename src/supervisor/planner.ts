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
        capabilityId: "inspect_directory",
        completed: false,
      },
      {
        id: "3",
        title: "Execute the solution safely",
        capabilityId: "read_file",
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