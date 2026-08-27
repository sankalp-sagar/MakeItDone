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
        title:
          "Discover available files",
        capabilityId:
          "inspect_directory",
        input: {
          path: ".",
        },
        completed: false,
      },
      {
        id: "3",
        title:
          "Read the project README",
        capabilityId:
          "read_file",
        input: {
          path: "./README.md",
        },
        completed: false,
      },
      {
        id: "4",
        title:
          "Verify the result",
        completed: false,
      },
    ];
  }
}